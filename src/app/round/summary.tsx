import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Footer, Screen, SectionLabel, StatTile, Text } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { GameResultsList, HoleNotesList, ScoreSummaryTable, SettlementList } from '@/components/round';
import { ShareCardButton } from '@/components/share';
import { useTheme } from '@/theme';
import { useGameRuns, useHandicaps, useHistoryStore, useHoles, usePlayOrder, useRound, useRoundStore } from '@/store';
import { formatToPar, joinMeta, plural } from '@/lib/format';
import { holesPlayed, totals } from '@/lib/scoring';
import { netSettlements } from '@/lib/settlement';
import { summarizeRound } from '@/lib/history';
import { maybeAskForReview, trackRoundFinished } from '@/services';

/**
 * Round summary. Final gross and net, strokes received, per-game results, and the settlement netted
 * across every game into one figure per pair. Tap a row to audit it.
 * Display only: no pay button, no payment links, nothing that implies money movement.
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

  if (!round) return null;
  const tee = round.course.teeBoxes.find((t) => t.id === round.teeBoxId);
  const results = runs.map((r) => ({ mode: r.mode, standings: r.standings }));
  const betting = runs.filter((r) => r.mode.category === 'betting');
  const played = holesPlayed(round.holeResults, order);
  const low = round.players
    .map((p) => ({ p, t: totals(round.holeResults, holes, p.id, 'gross') }))
    .filter((x) => x.t.holesScored > 0)
    .sort((a, b) => a.t.toPar - b.t.toPar)[0];

  const done = () => {
    const completedAt = new Date().toISOString();
    const completed = { ...round, status: 'complete' as const, updatedAt: completedAt };
    const summary = summarizeRound({ round: completed, holes, handicaps, standings: runs.map((r) => r.standings), gameNames: runs.map((r) => r.mode.name), netted, completedAt });
    addHistory({ summary, round: completed });
    trackRoundFinished(completed);
    discardRound();
    router.replace('/');
    // After the third finished round, ask once for a rating, over Home rather than this closing screen.
    const finished = useHistoryStore.getState().entries.length;
    setTimeout(() => void maybeAskForReview(finished), 900);
  };

  return (
    <Screen>
      <SetupHeader title="Round summary" subtitle={joinMeta([round.course.name, tee ? `${tee.name} tees` : null, `${played} of ${round.settings.holeCount} holes`])} onBack={() => router.navigate('/round/play')} />
      <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[4] }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <StatTile label="Holes" value={String(played)} sub={`of ${round.settings.holeCount}`} />
          <StatTile label="Low gross" value={low ? low.p.name.split(/\s+/)[0]! : '—'} sub={low ? `${low.t.strokes} · ${formatToPar(low.t.toPar)}` : undefined} subTone={low && low.t.toPar < 0 ? 'accent' : low && low.t.toPar > 0 ? 'goldText' : 'secondary'} />
          <StatTile label="Games" value={String(runs.length)} sub={betting.length ? plural(betting.length, 'bet') : 'for fun'} />
        </View>
        <ScoreSummaryTable players={round.players} holes={holes} results={round.holeResults} handicaps={handicaps} />

        {runs.length > 0 ? (
          <>
            <SectionLabel style={{ marginTop: space[3] }}>Game results</SectionLabel>
            <GameResultsList results={results} />
            {round.holeResults.some((r) => r.note) ? (
              <>
                <SectionLabel style={{ marginTop: space[3] }}>Notes</SectionLabel>
                <HoleNotesList results={round.holeResults} order={order} />
              </>
            ) : null}
          </>
        ) : null}

        {betting.length > 0 ? (
          <>
            <SectionLabel style={{ marginTop: space[3] }}>Settle up</SectionLabel>
            <SettlementList netted={netted} players={round.players} stakeLabel={round.settings.stakeLabel} />
          </>
        ) : null}
      </ScrollView>
      <Footer>
        <Button label="Done" onPress={done} />
        <ShareCardButton round={round} holes={holes} handicaps={handicaps} results={results} />
        <Button label="Back to the card" variant="secondary" onPress={() => router.navigate('/round/play')} />
      </Footer>
    </Screen>
  );
}
