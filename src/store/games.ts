import { useMemo } from 'react';
import type { ActiveGame, GameMode, Round } from '@/types';
import { GAME_MODES, getGame, runGame, type GameRun, defaultConfig } from '@/games';
import { useHandicaps } from './selectors';

/** The catalog, for the picker. The only place app/ reads game metadata from. */
export function useGameCatalog(): readonly GameMode[] {
  return GAME_MODES;
}

export function gameMeta(id: string): GameMode | undefined {
  return getGame(id);
}

/** A fresh ActiveGame with the mode's defaults. */
export function newActiveGame(mode: GameMode, playerIds?: string[]): ActiveGame {
  return { gameId: mode.id, config: defaultConfig(mode.configFields), basis: mode.defaultBasis, playerIds };
}

/** Why a game can't be added for this group size, or null when it fits. */
export function fitReason(mode: GameMode, playerCount: number): string | null {
  if (playerCount < mode.minPlayers) return `Needs at least ${mode.minPlayers} players — you have ${playerCount}`;
  if (playerCount > mode.maxPlayers) return `Up to ${mode.maxPlayers} players — you have ${playerCount}`;
  return null;
}

/** Standings and settlement for every active game, recomputed from the full hole array. */
export function useGameRuns(round: Round | null): GameRun[] {
  const handicaps = useHandicaps(round);
  return useMemo(() => {
    if (!round) return [];
    const runs: GameRun[] = [];
    for (const active of round.games) {
      const mode = getGame(active.gameId);
      if (!mode) continue;
      runs.push(runGame(round, active, mode, handicaps));
    }
    return runs;
  }, [round, handicaps]);
}
