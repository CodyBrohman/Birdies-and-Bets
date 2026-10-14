import { useMemo } from 'react';
import type { HistoryEntry } from '@/types';
import { getGame, runGame } from '@/games';
import { computeAllHandicaps } from '@/lib/handicap';
import { netSettlements } from '@/lib/settlement';
import { useHistoryStore } from './historyStore';
import { usePreferences } from './preferencesStore';

/** You against one friend, over every finished round you both played. */
export interface HeadToHead {
  rounds: number;
  /** Net points between the two of you across all games: + you are up on them, − they are up on you. */
  points: number;
  /** Rounds where you both played a points game. */
  pointsRounds: number;
}

/**
 * Pure: friend profile id → head to head with `meId`, worked out pair by pair from each round's games (the same netting
 * as Results). Rounds saved without the full card count as played together but carry no points.
 */
export function headToHead(entries: HistoryEntry[], meId: string | undefined): Map<string, HeadToHead> {
  const out = new Map<string, HeadToHead>();
  if (!meId) return out;
  for (const { round } of entries) {
    if (!round) continue;
    const me = round.players.find((p) => p.profileId === meId);
    if (!me) continue;
    const handicaps = computeAllHandicaps(round.players, round.course, round.settings);
    const settlements = round.games.map((g) => {
      const mode = getGame(g.gameId);
      return mode ? runGame(round, g, mode, handicaps).settlement : null;
    });
    const netted = netSettlements(settlements, round.players.map((p) => p.id));
    const hasPoints = settlements.some((s) => s && s.entries.length > 0);
    for (const other of round.players) {
      if (!other.profileId || other.id === me.id) continue;
      const pair = netted.pairs.find((x) => (x.from === me.id && x.to === other.id) || (x.from === other.id && x.to === me.id));
      const points = pair ? (pair.to === me.id ? pair.amount : -pair.amount) : 0;
      const prev = out.get(other.profileId) ?? { rounds: 0, points: 0, pointsRounds: 0 };
      out.set(other.profileId, { rounds: prev.rounds + 1, points: prev.points + points, pointsRounds: prev.pointsRounds + (hasPoints ? 1 : 0) });
    }
  }
  return out;
}

export function useHeadToHead(): Map<string, HeadToHead> {
  const entries = useHistoryStore((s) => s.entries);
  const meId = usePreferences((s) => s.meProfileId);
  return useMemo(() => headToHead(entries, meId), [entries, meId]);
}
