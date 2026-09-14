// Scoring helpers: totals, front/back nine, relative to par. Pure; imports only types/ and lib/handicap.

import type { Hole } from '../types/course';
import type { PlayerId, PlayerRoundState } from '../types/player';
import type { GrossScore, HoleResult, ScoringBasis } from '../types/round';
import { netScore } from './handicap';

export type Relation = 'albatross' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'triple-plus';

/** Score relative to par as a named relation. */
export function relationToPar(diff: number): Relation {
  if (diff <= -3) return 'albatross';
  if (diff === -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  if (diff === 2) return 'double';
  return 'triple-plus';
}

/** Find the recorded result for a hole, if any. */
export function resultForHole(results: HoleResult[], holeNumber: number): HoleResult | undefined {
  return results.find((r) => r.holeNumber === holeNumber);
}

/** A player's gross score on a hole: number, null (picked up), or undefined (not entered). */
export function grossOn(results: HoleResult[], playerId: PlayerId, holeNumber: number): GrossScore | undefined {
  const r = resultForHole(results, holeNumber);
  if (!r || !(playerId in r.scores)) return undefined;
  return r.scores[playerId];
}

/** A player's score on a hole for the given basis. Undefined when not entered, null when picked up. */
export function scoreOn(
  results: HoleResult[],
  playerId: PlayerId,
  holeNumber: number,
  basis: ScoringBasis,
  handicap?: PlayerRoundState,
): GrossScore | undefined {
  const gross = grossOn(results, playerId, holeNumber);
  if (gross === undefined) return undefined;
  if (basis === 'gross') return gross;
  return netScore(gross, handicap?.strokesByHole[holeNumber] ?? 0);
}

export interface Totals {
  /** Sum of scores on holes with a numeric score. */
  strokes: number;
  /** Par of the holes counted in `strokes`. */
  par: number;
  /** strokes − par. */
  toPar: number;
  /** Holes with a numeric score. */
  holesScored: number;
  /** Holes where the player picked up (null). */
  holesPickedUp: number;
  /** True when every hole in the range has an entry (numeric or null). */
  complete: boolean;
}

/** Totals over a range of holes for one player and basis. Picked-up holes are excluded from strokes and par. */
export function totals(
  results: HoleResult[],
  holes: Hole[],
  playerId: PlayerId,
  basis: ScoringBasis,
  handicap?: PlayerRoundState,
): Totals {
  let strokes = 0;
  let par = 0;
  let holesScored = 0;
  let holesPickedUp = 0;
  let entered = 0;
  for (const h of holes) {
    const s = scoreOn(results, playerId, h.number, basis, handicap);
    if (s === undefined) continue;
    entered += 1;
    if (s === null) {
      holesPickedUp += 1;
      continue;
    }
    strokes += s;
    par += h.par;
    holesScored += 1;
  }
  return { strokes, par, toPar: strokes - par, holesScored, holesPickedUp, complete: entered === holes.length && holes.length > 0 };
}

export function frontNine(holes: Hole[]): Hole[] {
  return holes.filter((h) => h.number <= 9);
}

export function backNine(holes: Hole[]): Hole[] {
  return holes.filter((h) => h.number > 9 && h.number <= 18);
}

/** Highest hole number with any score entered. 0 when nothing has been played. */
export function holesThrough(results: HoleResult[]): number {
  return results.reduce((max, r) => (Object.keys(r.scores).length > 0 && r.holeNumber > max ? r.holeNumber : max), 0);
}

/** Hole results sorted by hole number, only those with at least one score. */
export function playedResults(results: HoleResult[]): HoleResult[] {
  return results.filter((r) => Object.keys(r.scores).length > 0).sort((a, b) => a.holeNumber - b.holeNumber);
}

/**
 * Players' scores on one hole for a basis, excluding pick-ups and unentered players.
 * The building block every game uses to decide a hole.
 */
export function holeScores(
  result: HoleResult,
  playerIds: PlayerId[],
  basis: ScoringBasis,
  handicaps: Record<PlayerId, PlayerRoundState>,
): { playerId: PlayerId; score: number }[] {
  const out: { playerId: PlayerId; score: number }[] = [];
  for (const id of playerIds) {
    if (!(id in result.scores)) continue;
    const gross = result.scores[id];
    if (gross == null) continue;
    const score = basis === 'net' ? gross - (handicaps[id]?.strokesByHole[result.holeNumber] ?? 0) : gross;
    out.push({ playerId: id, score });
  }
  return out;
}

/** Lowest scorers on a hole. Empty when nobody has a score; more than one on a tie. */
export function lowest(scores: { playerId: PlayerId; score: number }[]): { playerId: PlayerId; score: number }[] {
  if (scores.length === 0) return [];
  const min = Math.min(...scores.map((s) => s.score));
  return scores.filter((s) => s.score === min);
}

/** Highest scorers on a hole. Empty when nobody has a score; more than one on a tie. */
export function highest(scores: { playerId: PlayerId; score: number }[]): { playerId: PlayerId; score: number }[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores.map((s) => s.score));
  return scores.filter((s) => s.score === max);
}
