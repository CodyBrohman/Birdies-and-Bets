import { useMemo } from 'react';
import type { ActiveGame, GameMode, Player, Round } from '@/types';
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

/** How many players this game needs picked, given its current config. Undefined = everyone plays. */
export function participantCountOf(mode: GameMode, active: Pick<ActiveGame, 'config'>): number | undefined {
  return mode.participantCountFor ? mode.participantCountFor(active.config) : mode.participantCount;
}

/** "Cody vs Marcus" or "Cody & Dan vs Marcus & Priya" for the game card; null when nothing is chosen yet. */
export function sidesLabel(mode: GameMode, active: ActiveGame, players: Player[]): string | null {
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '';
  const participants = active.playerIds ? players.filter((p) => active.playerIds!.includes(p.id)) : players;
  const teamsField = mode.configFields.find((f) => f.type === 'teams');
  if (teamsField && active.config.format === 'teams') {
    const raw = active.config[teamsField.key];
    const a = Array.isArray(raw) ? (raw as string[]).filter((id) => participants.some((p) => p.id === id)) : [];
    if (a.length !== 2) return 'Pick the teams';
    const b = participants.filter((p) => !a.includes(p.id)).map((p) => p.id);
    return `${a.map(name).join(' & ')} vs ${b.map(name).join(' & ')}`;
  }
  if (!active.playerIds?.length) return null;
  return active.playerIds.map(name).filter(Boolean).join(' vs ');
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
