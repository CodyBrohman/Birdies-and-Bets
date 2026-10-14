import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Button, HeaderButton, ScrollScreen, Text } from '@/components/ui';
import { RoundReport } from '@/components/round';
import { useShareCard } from '@/components/share';
import { haptic, useTheme } from '@/theme';
import { useGameRuns, useHandicaps, useHistoryStore, useHoles, usePlayOrder, useRound, useRoundStore } from '@/store';
import { joinMeta, plural } from '@/lib/format';
import { holesPlayed } from '@/lib/scoring';
import { netSettlements } from '@/lib/settlement';
import { summarizeRound } from '@/lib/history';
import { maybeAskForReview, trackRoundFinished } from '@/services';

/**
 * Results, at the end of a round: who won, the scores (Player · Gross · Net · Pts), each game's result, the points
 * tally and the notes. Save round files it in Rounds; Share sends the card; Back returns to the scorecard. Points are a
 * tally only: no pay button, no payment links, nothing that implies money changing hands.
 */
export default function SummaryScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const round = useRound();
  const holes = useHoles(round);
  const order = usePlayOrder(round);
  const handicaps = useHandicaps(round);
  const runs = useGameRuns(round);
  const discardRound = useRoundStore((s) => s.discardRound);
  const addHistory = useHistoryStore((s) => s.add);

  const netted = useMemo(() => netSettlements(runs.map((r) => r.settlement), round?.players.map((p) => p.id) ?? []), [runs, round]);
  const results = useMemo(() => runs.map((r) => ({ mode: r.mode, standings: r.standings })), [runs]);
  const { share, busy, host } = useShareCard({ round: round!, holes, handicaps, results, netted });
  if (!round) return null;

  const tee = round.course.teeBoxes.find((t) => t.id === round.teeBoxId);
  const played = holesPlayed(round.holeResults, order);

  const save = () => {
    const completedAt = new Date().toISOString();
    const completed = { ...round, status: 'complete' as const, updatedAt: completedAt };
    const summary = summarizeRound({ round: completed, holes, handicaps, standings: runs.map((r) => r.standings), gameNames: runs.map((r) => r.mode.name), netted, completedAt });
    addHistory({ summary, round: completed });
    trackRoundFinished(completed);
    haptic.success();
    discardRound();
    router.dismissTo('/');
    // After the third finished round, ask once for a rating, over Home rather than this closing screen.
    const finished = useHistoryStore.getState().entries.length;
    setTimeout(() => void maybeAskForReview(finished), 900);
  };

  return (
    <ScrollScreen
      title="Results"
      gap={space[6]}
      headerRight={() => <HeaderButton label="Share scorecard" icon="share" disabled={busy} onPress={() => void share()} />}
      footer={<Button label="Save round" onPress={save} testID="save-round" />}
    >
      <Text step="subhead" tone="secondary" style={{ marginBottom: -space[3] }}>
        {joinMeta([round.course.name, tee ? `${tee.name} tees` : null, played === order.length ? plural(order.length, 'hole') : `${played} of ${order.length} holes`])}
      </Text>
      <RoundReport round={round} holes={holes} order={order} handicaps={handicaps} results={results} netted={netted} />
      {host}
    </ScrollScreen>
  );
}
