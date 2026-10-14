import { useMemo } from 'react';
import type { Round } from '@/types';
import { formatToPar } from '@/lib/format';
import { holesInPlay } from '@/lib/handicap';
import { holesPlayed, playOrder, totals } from '@/lib/scoring';
import { useGameRuns } from './games';
import { usePreferences } from './preferencesStore';
import { useRoundStore } from './roundStore';

/** What the app shows about the round in progress outside the scorecard (Home, the tab bar accessory, the banner). */
export interface LiveRoundSummary {
  courseName: string;
  /** The hole the scorecard is on. */
  hole: number;
  /** Holes with any score, of the holes in play. */
  played: number;
  holeCount: number;
  /** "You +3 thru 6" when you are playing; otherwise the first player ("Marcus +1 thru 6"). Null before any score. */
  scoreLine: string | null;
  /** The first game's headline, named: "Skins: Marcus 3 skins". Null with no games. */
  gameLine: string | null;
}

/** Pure: the summary for a round in progress, with the games' standings already run. */
export function summarizeLive(round: Round, meProfileId: string | undefined, headlines: { name: string; headline: string }[]): LiveRoundSummary {
  const holes = holesInPlay(round.course, round.settings.holeCount, round.settings.nine);
  const order = playOrder(holes, round.settings.startHole);
  const me = round.players.find((p) => meProfileId != null && p.profileId === meProfileId);
  const who = me ?? round.players[0];
  let scoreLine: string | null = null;
  if (who) {
    const t = totals(round.holeResults, holes, who.id, 'gross');
    const thru = t.holesScored + t.holesPickedUp;
    if (thru > 0) scoreLine = `${me ? 'You' : who.name} ${t.holesScored > 0 ? formatToPar(t.toPar) : 'PU'} thru ${thru}`;
  }
  const first = headlines[0];
  return {
    courseName: round.course.name,
    hole: round.currentHole,
    played: holesPlayed(round.holeResults, order),
    holeCount: order.length,
    scoreLine,
    gameLine: first ? `${first.name}: ${first.headline}` : null,
  };
}

/** The round in progress, summarised; null when there is none. */
export function useLiveRound(): LiveRoundSummary | null {
  const round = useRoundStore((s) => (s.round?.status === 'in-progress' ? s.round : null));
  const meProfileId = usePreferences((s) => s.meProfileId);
  const runs = useGameRuns(round);
  return useMemo(() => (round ? summarizeLive(round, meProfileId, runs.map((r) => ({ name: r.mode.name, headline: r.standings.headline }))) : null), [round, meProfileId, runs]);
}
