// Shared-scorecard links. A finished card is packed into the URL fragment (after "#"), which browsers never send to a
// server: https://www.birdiesandbets.com/card#v1.<base64url JSON>. The app (app/card.tsx) and the website
// (../website/assets/js/card.js) both decode it. The format is versioned: change it only by adding v2 and updating both.
import type { Course, Hole } from '../types/course';
import type { Player, PlayerId, PlayerRoundState } from '../types/player';
import type { GrossScore, HoleResult, Round, ScoringBasis } from '../types/round';
import { allocateStrokes } from './handicap';

export const CARD_BASE_URL = 'https://www.birdiesandbets.com/card';
const PREFIX = 'v1.';
/** Generous for 18 holes × 4 players plus games; anything longer is not one of ours. */
export const MAX_CARD_PAYLOAD = 4000;
const MAX_TEXT = 120;
const MAX_PLAYERS = 6;
const MAX_LINES = 8;
const MAX_GAMES = 8;

/** Not played on that hole. `null` in a score list means picked up. */
const NOT_PLAYED = -1;

export interface CardData {
  v: 1;
  /** Course name. */
  c: string;
  /** Tee name ('' when unknown). */
  t: string;
  /** Date the round finished, ISO. */
  d: string;
  /** Basis the card is shown in. */
  b: ScoringBasis;
  /** Holes in play by number: [number, par, strokeIndex]. */
  h: [number, number, number][];
  /** Players: [name, playingHandicap, scores in the order of `h`]. */
  p: [string, number, (number | null)[]][];
  /** Games: [name, basis, headline, lines]. */
  g: [string, ScoringBasis, string, string[]][];
}

export interface CardSource {
  round: Round;
  holes: Hole[];
  handicaps: Record<PlayerId, PlayerRoundState>;
  games: { name: string; basis: ScoringBasis; headline: string; lines: string[] }[];
  basis: ScoringBasis;
  completedAt?: string;
}

const clip = (s: string, n = MAX_TEXT) => s.slice(0, n);

/** The data a card link carries, from a round as the share card shows it. */
export function cardDataFrom({ round, holes, handicaps, games, basis, completedAt }: CardSource): CardData {
  const ordered = [...holes].sort((a, b) => a.number - b.number);
  const scoreFor = (playerId: PlayerId, hole: number): number | null => {
    const r = round.holeResults.find((x) => x.holeNumber === hole);
    if (!r || !(playerId in r.scores)) return NOT_PLAYED;
    return r.scores[playerId] ?? null;
  };
  return {
    v: 1,
    c: clip(round.course.name),
    t: clip(round.course.teeBoxes.find((t) => t.id === round.teeBoxId)?.name ?? ''),
    d: completedAt ?? round.updatedAt,
    b: basis,
    h: ordered.map((h) => [h.number, h.par, h.strokeIndex]),
    p: round.players.slice(0, MAX_PLAYERS).map((p) => [clip(p.name, 40), handicaps[p.id]?.playingHandicap ?? 0, ordered.map((h) => scoreFor(p.id, h.number))]),
    g: games.slice(0, MAX_GAMES).map((g) => [clip(g.name), g.basis, clip(g.headline), g.lines.slice(0, MAX_LINES).map((l) => clip(l))]),
  };
}

export function encodeCard(data: CardData): string {
  return PREFIX + toBase64Url(utf8Encode(JSON.stringify(data)));
}

export function cardUrl(data: CardData): string {
  return `${CARD_BASE_URL}#${encodeCard(data)}`;
}

/**
 * The payload from an incoming card link, or null when the link is not a card. Accepts the website link
 * (https://www.birdiesandbets.com/card#v1.…, with or without www or a trailing slash), the app scheme
 * (birdiesandbets://card#v1.…) and a bare path (/card#v1.…).
 */
export function cardPayloadFromUrl(url: string): string | null {
  const hash = url.indexOf('#');
  if (hash < 0) return null;
  const target = url
    .slice(0, hash)
    .replace(/^https?:\/\/(www\.)?birdiesandbets\.com/i, '')
    .replace(/^birdiesandbets:\/\//i, '/')
    .replace(/\/+$/, '');
  return target === '/card' ? url.slice(hash + 1) || null : null;
}

/** Parse a payload ("v1.…"); anything malformed, oversized or from another version gives null. */
export function decodeCard(payload: string | undefined | null): CardData | null {
  if (!payload || payload.length > MAX_CARD_PAYLOAD || !payload.startsWith(PREFIX)) return null;
  try {
    const bytes = fromBase64Url(payload.slice(PREFIX.length));
    if (!bytes) return null;
    return validate(JSON.parse(utf8Decode(bytes)));
  } catch {
    return null;
  }
}

const isStr = (v: unknown, max = MAX_TEXT): v is string => typeof v === 'string' && v.length <= max;
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const isBasis = (v: unknown): v is ScoringBasis => v === 'gross' || v === 'net';

function validate(o: unknown): CardData | null {
  if (!o || typeof o !== 'object') return null;
  const d = o as Record<string, unknown>;
  if (d.v !== 1 || !isStr(d.c) || d.c.length === 0 || !isStr(d.t) || !isStr(d.d, 40) || !isBasis(d.b)) return null;
  if (!Array.isArray(d.h) || d.h.length < 1 || d.h.length > 18) return null;
  const holes = d.h as unknown[];
  if (!holes.every((h) => Array.isArray(h) && h.length === 3 && isInt(h[0], 1, 18) && isInt(h[1], 3, 6) && isInt(h[2], 1, 18))) return null;
  if (!Array.isArray(d.p) || d.p.length < 1 || d.p.length > MAX_PLAYERS) return null;
  const okPlayer = (p: unknown) =>
    Array.isArray(p) && p.length === 3 && isStr(p[0], 40) && p[0].length > 0 && isInt(p[1], -54, 54) && Array.isArray(p[2]) && p[2].length === holes.length && (p[2] as unknown[]).every((s) => s === null || isInt(s, NOT_PLAYED, 20));
  if (!(d.p as unknown[]).every(okPlayer)) return null;
  if (!Array.isArray(d.g) || d.g.length > MAX_GAMES) return null;
  const okGame = (g: unknown) => Array.isArray(g) && g.length === 4 && isStr(g[0]) && isBasis(g[1]) && isStr(g[2]) && Array.isArray(g[3]) && g[3].length <= MAX_LINES && (g[3] as unknown[]).every((l) => isStr(l));
  if (!(d.g as unknown[]).every(okGame)) return null;
  return d as unknown as CardData;
}

/** A read-only round the existing scorecard components can draw: synthetic course, players, results and strokes. */
export function toCardView(data: CardData): { round: Round; holes: Hole[]; handicaps: Record<PlayerId, PlayerRoundState> } {
  const holes: Hole[] = data.h.map(([number, par, strokeIndex]) => ({ number, par, strokeIndex }));
  const course: Course = { id: 'shared-card', name: data.c, holes, teeBoxes: [{ id: 'tee', name: data.t || 'Tees' }] };
  const players: Player[] = data.p.map(([name], i) => ({ id: `p${i}`, name, teeBoxId: 'tee' }));
  const holeResults: HoleResult[] = holes.map((h, hi) => {
    const scores: Record<PlayerId, GrossScore> = {};
    data.p.forEach(([, , s], pi) => {
      const v = s[hi];
      if (v !== NOT_PLAYED && v !== undefined) scores[`p${pi}`] = v;
    });
    return { holeNumber: h.number, scores };
  });
  const handicaps: Record<PlayerId, PlayerRoundState> = {};
  data.p.forEach(([, playing], i) => {
    handicaps[`p${i}`] = { playerId: `p${i}`, courseHandicap: playing, playingHandicap: playing, strokesByHole: allocateStrokes(playing, holes) };
  });
  const round: Round = {
    id: 'shared-card',
    createdAt: data.d,
    updatedAt: data.d,
    status: 'complete',
    course,
    teeBoxId: 'tee',
    players,
    games: [],
    settings: { holeCount: holes.length > 9 ? 18 : 9, nine: holes[0] && holes[0].number > 9 ? 'back' : 'front', allowance: 100, stakeLabel: 'points' },
    holeResults: holeResults.filter((r) => Object.keys(r.scores).length > 0),
    currentHole: holes[0]?.number ?? 1,
  };
  return { round, holes, handicaps };
}

// ---------- UTF-8 + base64url, dependency-free (the website decoder mirrors this) ----------

function utf8Encode(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    let c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else {
      c = Math.min(c, 0x10ffff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return out;
}

function utf8Decode(b: number[]): string {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const x = b[i]!;
    const at = (k: number) => (b[i + k] ?? 0) & 63;
    let c: number;
    let size: number;
    if (x < 0x80) {
      c = x;
      size = 1;
    } else if (x >> 5 === 6) {
      c = ((x & 31) << 6) | at(1);
      size = 2;
    } else if (x >> 4 === 14) {
      c = ((x & 15) << 12) | (at(1) << 6) | at(2);
      size = 3;
    } else {
      c = ((x & 7) << 18) | (at(1) << 12) | (at(2) << 6) | at(3);
      size = 4;
    }
    i += size;
    s += String.fromCodePoint(Math.min(c, 0x10ffff));
  }
  return s;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63]!;
    if (i + 2 < bytes.length) out += B64[n & 63]!;
  }
  return out;
}

function fromBase64Url(s: string): number[] | null {
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 255);
    }
  }
  return out;
}
