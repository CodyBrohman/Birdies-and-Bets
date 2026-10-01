// Shared helpers for game modules. Pure; imports only types/ and lib/.
export type { GameMode, GameContext, GameState, Standings, StandingsLine, Settlement, SettlementEntry, ConfigField, HoleInputSpec, ProgressionCell } from '../types/game';
export type { HoleResult } from '../types/round';

import type { ConfigField, GameContext, ProgressionCell } from '../types/game';
import type { HoleResult } from '../types/round';
import type { Player, PlayerId } from '../types/player';
import { holeScores } from '../lib/scoring';
import { formatStake } from '../lib/format';

/** Read a config value with its declared default as fallback. */
export function cfg<T extends string | number | boolean | string[]>(ctx: GameContext, key: string, fallback: T): T {
  const v = ctx.active.config[key];
  return (v === undefined ? fallback : v) as T;
}

/** Default config object for a set of fields. */
export function defaultConfig(fields: ConfigField[]): Record<string, string | number | boolean | string[]> {
  const out: Record<string, string | number | boolean | string[]> = {};
  for (const f of fields) out[f.key] = f.default;
  return out;
}

/** Stake in the round's unit. Games without a stake field return 0. */
export function stakeOf(ctx: GameContext): number {
  return Number(cfg(ctx, 'stake', 0)) || 0;
}

/** Participants' scores on a hole for this game's basis, excluding pick-ups. */
export function scoresFor(ctx: GameContext, hole: HoleResult): { playerId: PlayerId; score: number }[] {
  return holeScores(
    hole,
    ctx.participants.map((p) => p.id),
    ctx.active.basis,
    ctx.handicaps,
  );
}

/** Participants who picked up (null) on a hole. */
export function pickedUp(ctx: GameContext, hole: HoleResult): PlayerId[] {
  return ctx.participants.filter((p) => hole.scores[p.id] === null).map((p) => p.id);
}

export function nameOf(ctx: GameContext, id: PlayerId): string {
  return ctx.participants.find((p) => p.id === id)?.name ?? ctx.players.find((p) => p.id === id)?.name ?? id;
}

export function initialOf(player: Player): string {
  return player.name.trim().charAt(0).toUpperCase();
}

/** Count of holes in play for this game. */
export function holesInGame(ctx: GameContext): number {
  return ctx.holeCount;
}

/** Stake label for display: "5 pts". */
export function stakeLabel(ctx: GameContext, suffix: string = ''): string {
  const s = stakeOf(ctx);
  if (!s) return 'no stake';
  return `${formatStake(s, ctx.settings.stakeLabel)}${suffix}`;
}

// ---------- Play order helpers (games never assume holes run 1..N) ----------

/** 1-based position of a hole in the play order; 0 when it is not in play. */
export function positionOf(ctx: GameContext, holeNumber: number): number {
  return ctx.holes.findIndex((h) => h.number === holeNumber) + 1;
}

/** Holes still to play after this one. */
export function remainingAfter(ctx: GameContext, holeNumber: number): number {
  const pos = positionOf(ctx, holeNumber);
  return pos === 0 ? ctx.holes.length : ctx.holes.length - pos;
}

/** The hole played next, or null after the last hole. Zero (nothing played yet) yields the first hole. */
export function nextAfter(ctx: GameContext, holeNumber: number): number | null {
  if (holeNumber === 0) return ctx.holes[0]?.number ?? null;
  const pos = positionOf(ctx, holeNumber);
  if (pos === 0 || pos >= ctx.holes.length) return null;
  return ctx.holes[pos]!.number;
}

export function isLastHole(ctx: GameContext, holeNumber: number): boolean {
  return positionOf(ctx, holeNumber) === ctx.holes.length;
}

// ---------- Sides (singles or two-person teams) ----------

/** Team A is the config's list; team B is everyone else among the participants. */
export function teamsOf(ctx: { participants: { id: string }[]; active: { config: Record<string, unknown> } }, key: string = 'teams'): { a: string[]; b: string[] } {
  const raw = ctx.active.config[key];
  const aIds = Array.isArray(raw) ? (raw as string[]) : [];
  const ids = ctx.participants.map((p) => p.id);
  return { a: ids.filter((id) => aIds.includes(id)), b: ids.filter((id) => !aIds.includes(id)) };
}

export interface Sides {
  a: PlayerId[];
  b: PlayerId[];
  teams: boolean;
}

/** The two sides of a head-to-head: the first two participants, or team A / team B when `format` is teams. */
export function sidesOf(ctx: GameContext): Sides {
  if (cfg<string>(ctx, 'format', 'singles') === 'teams') return { ...teamsOf(ctx), teams: true };
  const [p, q] = ctx.participants;
  return { a: p ? [p.id] : [], b: q ? [q.id] : [], teams: false };
}

/** Both sides present; in teams each has exactly two. */
export function sidesReady(s: Sides): boolean {
  return s.a.length > 0 && s.b.length > 0 && (!s.teams || (s.a.length === 2 && s.b.length === 2));
}

export function sideName(ctx: GameContext, ids: PlayerId[]): string {
  return ids.map((id) => nameOf(ctx, id)).join(' & ');
}

export type SideOutcome = 'a' | 'b' | 'half' | 'skip';

/** Best ball per side. A side with no score loses the hole; neither side scoring skips it. */
export function sideOutcome(ctx: GameContext, hole: HoleResult, a: PlayerId[], b: PlayerId[]): SideOutcome {
  const scores = scoresFor(ctx, hole);
  const best = (side: PlayerId[]) => {
    const s = scores.filter((x) => side.includes(x.playerId)).map((x) => x.score);
    return s.length ? Math.min(...s) : undefined;
  };
  const sa = best(a);
  const sb = best(b);
  if (sa == null && sb == null) return 'skip';
  if (sa == null) return 'b';
  if (sb == null) return 'a';
  return sa < sb ? 'a' : sb < sa ? 'b' : 'half';
}

/** Each loser pays the winner opposite them: one entry for singles, two for teams. */
export function paySide(from: PlayerId[], to: PlayerId[], amount: number, reason: string): { from: PlayerId; to: PlayerId; amount: number; reason: string }[] {
  return from.map((f, i) => ({ from: f, to: to[i % to.length]!, amount, reason }));
}

/** A per-hole strip in play order, one cell per hole in play. */
export function progressionFor(ctx: GameContext, cell: (holeNumber: number) => ProgressionCell): ProgressionCell[] {
  return ctx.holes.map((h) => cell(h.number));
}
