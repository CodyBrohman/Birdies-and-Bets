// Display helpers. Pure string formatting; imports only types/ and lib/scoring.

import { relationToPar, type Relation } from './scoring';
import type { Hole } from '../types/course';

/** "+2", "−1", "E". Uses a true minus sign. */
export function formatToPar(diff: number): string {
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`;
}

/** Signed number with a true minus sign, e.g. handicaps: "9", "−1". */
export function formatSigned(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : `${n}`;
}

/** Parse "8.2" or "+1.8" (plus handicap → negative index). Undefined when blank or invalid. */
export function parseIndex(raw: string): number | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const plus = s.startsWith('+');
  const n = Number(s.replace(/^\+/, ''));
  if (!Number.isFinite(n)) return undefined;
  return plus ? -n : n;
}

/** Handicap index as entered: "8.2", "+1.8" for plus handicaps. */
export function formatIndex(index: number | undefined): string {
  if (index == null) return '—';
  return index < 0 ? `+${Math.abs(index).toFixed(1)}` : index.toFixed(1);
}

export const RELATION_LABEL: Record<Relation, string> = {
  albatross: 'Albatross',
  eagle: 'Eagle',
  birdie: 'Birdie',
  par: 'Par',
  bogey: 'Bogey',
  double: 'Double',
  'triple-plus': 'Triple+',
};

/** Match-play status line: "Cody 2 up thru 6", "All square thru 6", or a closed result "Cody won 3&2". */
export function formatMatchStatus(opts: {
  leaderName?: string;
  lead: number;
  thru: number;
  holesRemaining: number;
  closed: boolean;
}): string {
  const { leaderName, lead, thru, holesRemaining, closed } = opts;
  if (closed) {
    if (lead === 0 || !leaderName) return 'Halved';
    if (holesRemaining === 0) return `${leaderName} won ${lead} up`;
    return `${leaderName} won ${lead}&${holesRemaining}`;
  }
  if (thru === 0) return 'All square';
  if (lead === 0 || !leaderName) return `All square thru ${thru}`;
  return `${leaderName} ${lead} up thru ${thru}`;
}

/** "1 skin" / "3 skins". */
export function plural(n: number, singular: string, pluralForm: string = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Join display parts with the middle-dot convention used throughout: "Blue tees · 4 players · 3 games". */
export function joinMeta(parts: (string | null | undefined | false)[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' · ');
}

/** Initials for a scorecard row: "Cody Brohman" → "CB", "Priya" → "P". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Chip caption for a score relative to par: EAGLE, BIRDIE, PAR, BOGEY, DOUBLE, TRIPLE, +4, +5. */
export function scoreChipLabel(diff: number): string {
  if (diff >= 4) return `+${diff}`;
  if (diff === 3) return 'Triple';
  return RELATION_LABEL[relationToPar(diff)];
}

/** "Aug 30" for a history row. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getDate()}`;
}

/** True for currency-style labels that read best in front of the number: "$", "€", "£". */
export function isSymbolLabel(label: string): boolean {
  return /^[^\p{L}\p{N}\s]{1,2}$/u.test(label.trim());
}

/** "5 pts", "$5", "5 beers". Negative and signed amounts keep their sign in front: "+$12", "−$3". */
export function formatStake(amount: number | string, stakeLabel: string): string {
  const raw = String(amount);
  const sign = raw.startsWith('+') || raw.startsWith('−') || raw.startsWith('-') ? raw[0]! : '';
  const digits = sign ? raw.slice(1) : raw;
  if (stakeLabel === 'points') return `${raw} pts`;
  if (isSymbolLabel(stakeLabel)) return `${sign}${stakeLabel.trim()}${digits}`;
  return `${raw} ${stakeLabel}`;
}

// ---------- VoiceOver descriptions (pure text; components only pass these through) ----------

/** "4 over", "2 under", "even". */
export function describeToPar(diff: number): string {
  if (diff === 0) return 'even';
  return diff > 0 ? `${diff} over` : `${Math.abs(diff)} under`;
}

/** One scorecard cell: "5, bogey, 1 stroke" / "picked up" / "not entered". */
export function describeScore(value: number | null | undefined, relation?: Relation, strokes: number = 0): string {
  if (value === undefined) return 'not entered';
  if (value === null) return 'picked up';
  const rel = relation ? (relation === 'triple-plus' ? 'triple or worse' : relation) : '';
  const s = strokes > 0 ? plural(strokes, 'stroke') : strokes < 0 ? 'gives one back' : '';
  return [String(value), rel, s].filter(Boolean).join(', ');
}

/** A whole card row: "Hole 5, par 4, stroke index 12. Cody 4, par. Marcus not entered." Adds "current hole" when it is. */
export function describeHoleRow(hole: Pick<Hole, 'number' | 'par' | 'strokeIndex'>, entries: { name: string; text: string }[], current: boolean = false): string {
  const head = `Hole ${hole.number}${current ? ', current hole' : ''}, par ${hole.par}, stroke index ${hole.strokeIndex}`;
  return `${head}. ${entries.map((e) => `${e.name} ${e.text}`).join('. ')}.`;
}

/** Out/In/Total rows: "Out, par 36. Cody 38. Marcus not scored." Totals add "4 over" when toPar is given. */
export function describeTotalsRow(label: string, par: number | null, entries: { name: string; strokes: number | null; toPar?: number }[]): string {
  const head = par == null ? label : `${label}, par ${par}`;
  const parts = entries.map((e) => (e.strokes == null ? `${e.name} not scored` : `${e.name} ${e.strokes}${e.toPar != null ? `, ${describeToPar(e.toPar)}` : ''}`));
  return `${head}. ${parts.join('. ')}.`;
}

/** A standings row: "Marcus · 9 skins" → "Marcus, 9 skins, leading". */
export function describeStandingsLine(text: string, playerName?: string, leading: boolean = false): string {
  const parts = text.split(' · ').map((p) => p.trim()).filter(Boolean);
  const rest = playerName && parts[0]?.startsWith(playerName) ? parts[0]!.slice(playerName.length).trim() : '';
  // "Cody 2 up" → "Cody, 2 up"; a team name like "Cody & Dan" stays whole.
  const base = rest && !rest.startsWith('&') ? [playerName!, rest, ...parts.slice(1)] : parts;
  return `${base.join(', ')}${leading ? ', leading' : ''}`;
}

/** Head-to-head strip in words: "Holes: 1 Cody, 2 Marcus, 3 halved". Null when nothing has been decided or the strip is not head-to-head. */
export function describeProgression(cells: { holeNumber: number; tone: string }[], nameA: string, nameB: string): string | null {
  const played = cells.filter((c) => c.tone === 'a' || c.tone === 'b' || c.tone === 'half');
  if (played.length === 0) return null;
  return `Holes: ${played.map((c) => `${c.holeNumber} ${c.tone === 'a' ? nameA : c.tone === 'b' ? nameB : 'halved'}`).join(', ')}`;
}
