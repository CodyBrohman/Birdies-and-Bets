import { useMemo } from 'react';
import type { Hole, PlayerId, PlayerRoundState, Round } from '@/types';
import { computeAllHandicaps, holesInPlay } from '@/lib/handicap';
import { playOrder } from '@/lib/scoring';
import { useRoundStore } from './roundStore';

/** The active round, or null. */
export function useRound(): Round | null {
  return useRoundStore((s) => s.round);
}

/** Holes in play for a round, in natural (card) order. */
export function useHoles(round: Round | null): Hole[] {
  return useMemo(() => (round ? holesInPlay(round.course, round.settings.holeCount, round.settings.nine) : []), [round]);
}

/** Holes in play in the order they are played (rotated for a shotgun start). */
export function usePlayOrder(round: Round | null): Hole[] {
  const holes = useHoles(round);
  const startHole = round?.settings.startHole;
  return useMemo(() => playOrder(holes, startHole), [holes, startHole]);
}

/** Handicap state per player, recomputed when players, course or settings change. */
export function useHandicaps(round: Round | null): Record<PlayerId, PlayerRoundState> {
  const players = round?.players;
  const course = round?.course;
  const holeCount = round?.settings.holeCount;
  const allowance = round?.settings.allowance;
  const nine = round?.settings.nine;
  return useMemo(() => {
    if (!players || !course || holeCount == null || allowance == null) return {};
    return computeAllHandicaps(players, course, { holeCount, allowance, nine });
  }, [players, course, holeCount, allowance, nine]);
}
