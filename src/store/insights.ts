import { useMemo } from 'react';
import type { HistoryEntry } from '@/types';
import { getGame, runGame } from '@/games';
import { computeAllHandicaps, holesInPlay } from '@/lib/handicap';
import { netSettlements } from '@/lib/settlement';
import { relationCounts, type RoundInsight } from '@/lib/stats';
import { useHistoryStore } from './historyStore';

/** Rerun every finished round's games once so the dashboard has net points and hole counts per player. */
export function insightFor(entry: HistoryEntry): RoundInsight {
  const { summary, round } = entry;
  if (!round) return { summary, stakeLabel: 'points', profileIds: {}, netByPlayer: {}, counts: {} };
  const holes = holesInPlay(round.course, round.settings.holeCount, round.settings.nine);
  const handicaps = computeAllHandicaps(round.players, round.course, round.settings);
  const settlements = round.games.map((active) => {
    const mode = getGame(active.gameId);
    return mode ? runGame(round, active, mode, handicaps).settlement : null;
  });
  const netted = netSettlements(settlements, round.players.map((p) => p.id));
  const profileIds: RoundInsight['profileIds'] = {};
  const counts: RoundInsight['counts'] = {};
  for (const p of round.players) {
    profileIds[p.id] = p.profileId;
    counts[p.id] = relationCounts(round, holes, p.id);
  }
  return { summary, stakeLabel: round.settings.stakeLabel, profileIds, netByPlayer: netted.totals, counts };
}

/** Newest first, memoised on the history entries. */
export function useHistoryInsights(): RoundInsight[] {
  const entries = useHistoryStore((s) => s.entries);
  return useMemo(() => entries.map(insightFor), [entries]);
}
