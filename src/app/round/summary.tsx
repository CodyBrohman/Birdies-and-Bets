import { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, HeaderButton, ScrollScreen, Text } from '@/components/ui';
import { GameResultsList, HoleNotesList, PointsList, ResultCallout, ResultsTable } from '@/components/round';
import { useShareCard } from '@/components/share';
import { haptic, useTheme } from '@/theme';
import { useGameRuns, useHandicaps, useHistoryStore, useHoles, usePlayOrder, useRound, useRoundStore } from '@/store';
import { formatStake, joinMeta, plural } from '@/lib/format';
import { holesPlayed } from '@/lib/scoring';
import { netSettlements } from '@/lib/settlement';
import { resultHeadline, resultRows, summarizeRound } from '@/lib/history';
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
  const { share, busy, host } = useShareCard({ round: round!, holes, handicaps, results });
  if (!round) return null;

  const tee = round.course.teeBoxes.find((t) => t.id === round.teeBoxId);
  const played = holesPlayed(round.holeResults, order);
  const rows = resultRows(round, holes, handicaps, netted);
  const useNet = rows.some((r) => r.playingHandicap !== 0);
  const pointsGames = runs.filter((r) => r.mode.category === 'betting');
  const headline = resultHeadline(rows, useNet);
  const pointsLeader = [...rows].sort((a, b) => b.points - a.points)[0];
  const extra = pointsLeader && pointsLeader.points > 0 ? `Most points: ${pointsLeader.name} ${formatStake(`+${pointsLeader.points}`, round.settings.stakeLabel)}` : null;

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
      <View style={{ gap: space[3] }}>
        <Text step="subhead" tone="secondary">
          {joinMeta([round.course.name, tee ? `${tee.name} tees` : null, played === order.length ? plural(order.length, 'hole') : `${played} of ${order.length} holes`])}
        </Text>
        <ResultCallout title={headline.title} detail={headline.detail} extra={extra} />
      </View>

      <ResultsTable rows={rows} showNet={useNet} showPoints={pointsGames.length > 0} />

      {runs.length > 0 ? (
        <Section title="Games">
          <GameResultsList results={results} />
        </Section>
      ) : null}

      {pointsGames.length > 0 ? (
        <Section title="Points">
          <PointsList netted={netted} players={round.players} stakeLabel={round.settings.stakeLabel} />
        </Section>
      ) : null}

      <Section title="Notes">
        <HoleNotesList results={round.holeResults} order={order} />
      </Section>
      {host}
    </ScrollScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <Text accessibilityRole="header" step="title3">
        {title}
      </Text>
      {children}
    </View>
  );
}

