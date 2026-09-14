// Shared helpers for game modules. Pure; imports only types/ and lib/.
export type { GameMode, GameContext, GameState, Standings, StandingsLine, Settlement, SettlementEntry, ConfigField, HoleInputSpec, ProgressionCell } from '../types/game';
export type { HoleResult } from '../types/round';

import type { ConfigField, GameContext } from '../types/game';
import type { HoleResult } from '../types/round';
import type { Player, PlayerId } from '../types/player';
import { holeScores } from '../lib/scoring';

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
  return `${s} ${ctx.settings.stakeLabel === 'points' ? 'pts' : ctx.settings.stakeLabel}${suffix}`;
}
