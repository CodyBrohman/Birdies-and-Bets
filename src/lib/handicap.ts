// Handicap engine. Pure functions; imports only types/.
// Must be correct and must be visible: every number here is shown to the player somewhere.

import type { Course, Hole, TeeBox } from '../types/course';
import type { Player, PlayerId, PlayerRoundState } from '../types/player';
import type { RoundSettings } from '../types/round';

export const DEFAULT_ALLOWANCE = 100;

/** Round half away from zero, so −2.5 → −3 and 2.5 → 3 (WHS rounding for plus handicaps). */
export function roundHalfAwayFromZero(n: number): number {
  return Math.sign(n) * Math.round(Math.abs(n));
}

/**
 * Course Handicap = round( Index × (Slope ÷ 113) + (Rating − Par) ).
 * No index → scratch (0). Missing slope or rating → scratch as well; the round degrades to gross rather than blocking.
 */
export function courseHandicap(handicapIndex: number | undefined, tee: Pick<TeeBox, 'slope' | 'rating'>, coursePar: number): number {
  if (handicapIndex == null || Number.isNaN(handicapIndex)) return 0;
  if (tee.slope == null || tee.rating == null) return 0;
  return roundHalfAwayFromZero(handicapIndex * (tee.slope / 113) + (tee.rating - coursePar));
}

/** Percentage allowance applied to the course handicap. Default 100. */
export function applyAllowance(courseHcp: number, allowancePercent: number = DEFAULT_ALLOWANCE): number {
  return roundHalfAwayFromZero((courseHcp * allowancePercent) / 100);
}

/** Total par for a set of holes. */
export function parFor(holes: Pick<Hole, 'par'>[]): number {
  return holes.reduce((sum, h) => sum + h.par, 0);
}

/**
 * Strokes received on a hole, given the playing handicap and the hole's stroke index (1..n).
 *
 *   base   = floor(H / n)
 *   extra  = (SI <= H mod n) ? 1 : 0
 *   strokes = base + extra
 *
 * Plus handicaps (H < 0) give strokes back from the easiest holes down: SI n first, then n−1.
 * `holeCount` is the number of holes the SIs are ranked over (18 normally, 9 for a nine-hole round).
 */
export function strokesForHole(playingHandicap: number, strokeIndex: number, holeCount: number = 18): number {
  const n = holeCount;
  if (playingHandicap >= 0) {
    const base = Math.floor(playingHandicap / n);
    const extra = strokeIndex <= playingHandicap % n ? 1 : 0;
    return base + extra;
  }
  const give = -playingHandicap;
  const base = Math.floor(give / n);
  // Easiest hole (SI n) is rank 1 for give-backs.
  const rankFromEasiest = n - strokeIndex + 1;
  const extra = rankFromEasiest <= give % n ? 1 : 0;
  // `|| 0` normalises −0 so equality checks and display stay sane.
  return -(base + extra) || 0;
}

/**
 * The holes being played, with stroke indexes re-ranked 1..n among those holes.
 * For an 18-hole round this is the course as-is. For nine holes, SI 3 and SI 7 on the front become 1 and 2 (etc.).
 */
export function rankedHoles(holes: Hole[]): { hole: Hole; rank: number }[] {
  const sorted = [...holes].sort((a, b) => a.strokeIndex - b.strokeIndex);
  const rankOf = new Map<number, number>(sorted.map((h, i) => [h.number, i + 1]));
  return holes.map((hole) => ({ hole, rank: rankOf.get(hole.number) ?? hole.strokeIndex }));
}

/** Holes in play for a round: all 18, or the first nine. */
export function holesInPlay(course: Course, holeCount: number): Hole[] {
  return course.holes.filter((h) => h.number <= holeCount);
}

/**
 * Playing handicap for the holes in play. A nine-hole round uses half the course handicap
 * (rounded half away from zero), then the allowance.
 */
export function playingHandicap(courseHcp: number, holeCount: number, allowancePercent: number = DEFAULT_ALLOWANCE): number {
  const scaled = holeCount === 9 ? roundHalfAwayFromZero(courseHcp / 2) : courseHcp;
  return applyAllowance(scaled, allowancePercent);
}

/** Strokes received on every hole in play, keyed by hole number. */
export function allocateStrokes(playingHcp: number, holes: Hole[]): Record<number, number> {
  const n = holes.length;
  const out: Record<number, number> = {};
  for (const { hole, rank } of rankedHoles(holes)) {
    out[hole.number] = strokesForHole(playingHcp, rank, n);
  }
  return out;
}

/** Everything the app needs to display and apply a player's handicap for a round. */
export function computePlayerRoundState(player: Player, course: Course, settings: Pick<RoundSettings, 'holeCount' | 'allowance'>): PlayerRoundState {
  const tee = course.teeBoxes.find((t) => t.id === player.teeBoxId) ?? course.teeBoxes[0];
  const holes = holesInPlay(course, settings.holeCount);
  // Rating and slope describe 18 holes, so course handicap is always computed against the full course par.
  const courseHcp = tee ? courseHandicap(player.handicapIndex, tee, parFor(course.holes)) : 0;
  const playingHcp = playingHandicap(courseHcp, settings.holeCount, settings.allowance);
  return {
    playerId: player.id,
    courseHandicap: courseHcp,
    playingHandicap: playingHcp,
    strokesByHole: allocateStrokes(playingHcp, holes),
  };
}

/** Compute round state for every player. */
export function computeAllHandicaps(players: Player[], course: Course, settings: Pick<RoundSettings, 'holeCount' | 'allowance'>): Record<PlayerId, PlayerRoundState> {
  const out: Record<PlayerId, PlayerRoundState> = {};
  for (const p of players) out[p.id] = computePlayerRoundState(p, course, settings);
  return out;
}

/**
 * Match-play differential: play off the low handicapper. Subtract the lowest playing handicap
 * among the participants from everyone, so the best player plays scratch. Re-allocates strokes.
 */
export function applyMatchDifferential(
  states: Record<PlayerId, PlayerRoundState>,
  participantIds: PlayerId[],
  holes: Hole[],
): Record<PlayerId, PlayerRoundState> {
  const participants = participantIds.map((id) => states[id]).filter((s): s is PlayerRoundState => s != null);
  if (participants.length === 0) return states;
  const low = Math.min(...participants.map((s) => s.playingHandicap));
  const out: Record<PlayerId, PlayerRoundState> = { ...states };
  for (const s of participants) {
    const adjusted = s.playingHandicap - low;
    out[s.playerId] = { ...s, playingHandicap: adjusted, strokesByHole: allocateStrokes(adjusted, holes) };
  }
  return out;
}

/** Net = Gross − strokes received on that hole. Null (picked up) stays null. */
export function netScore(gross: number | null, strokes: number): number | null {
  return gross == null ? null : gross - strokes;
}

/** Human-readable description of where a player's strokes fall, e.g. "9 strokes · SI 1–9". */
export function describeStrokes(state: PlayerRoundState, holes: Hole[]): string {
  const h = state.playingHandicap;
  const n = holes.length;
  if (h === 0) return 'Playing gross — no strokes';
  if (h < 0) {
    const give = -h;
    const from = n - (give % n) + 1;
    const range = give % n === 0 ? `all ${n}` : give % n === 1 ? `SI ${n}` : `SI ${from}–${n}`;
    return `Gives ${give === 1 ? 'one' : give} back · ${range}`;
  }
  const base = Math.floor(h / n);
  const extra = h % n;
  const word = h === 1 ? 'stroke' : 'strokes';
  if (base === 0) return `${h} ${word} · SI 1–${extra}`;
  if (extra === 0) return `${h} ${word} · ${base === 1 ? 'all' : `${base} on all`} ${n}`;
  return `${h} ${word} · all ${n}, ${base === 1 ? 'second' : `${base + 1}th`} on SI 1–${extra}`;
}
