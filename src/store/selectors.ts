import { useMemo } from 'react';
import type { Hole, PlayerId, PlayerRoundState, Round } from '@/types';
import { computeAllHandicaps, holesInPlay } from '@/lib/handicap';
import { useRoundStore } from './roundStore';

/** The active round, or null. */
export function useRound(): Round | null {
  return useRoundStore((s) => s.round);
}

/** Holes in play for the active round (9 or 18). */
export function useHoles(round: Round | null): Hole[] {
  return useMemo(() => (round ? holesInPlay(round.course, round.settings.holeCount) : []), [round]);
}

/** Handicap state per player, recomputed when players, course or settings change. */
export function useHandicaps(round: Round | null): Record<PlayerId, PlayerRoundState> {
  const players = round?.players;
  const course = round?.course;
  const holeCount = round?.settings.holeCount;
  const allowance = round?.settings.allowance;
  return useMemo(() => {
    if (!players || !course || holeCount == null || allowance == null) return {};
    return computeAllHandicaps(players, course, { holeCount, allowance });
  }, [players, course, holeCount, allowance]);
}
