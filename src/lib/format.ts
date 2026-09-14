// Display helpers. Pure string formatting; imports only types/ and lib/scoring.

import type { Relation } from './scoring';

/** "+2", "−1", "E". Uses a true minus sign. */
export function formatToPar(diff: number): string {
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`;
}

/** Signed number with a true minus sign, e.g. handicaps: "9", "−1". */
export function formatSigned(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : `${n}`;
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
