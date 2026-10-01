import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, Button, Card, Footer, Screen, SectionLabel, Segmented, Sheet, StatTile, Text } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { goBackOr } from '@/components/navigation';
import { ScoreTable } from '@/components/scorecard';
import { GameResultsList, HoleNotesList, ScoreSummaryTable, SettlementList } from '@/components/round';
import { ShareCardButton } from '@/components/share';
import { useTheme } from '@/theme';
import { useGameRuns, useHandicaps, useHistoryEntry, useHistoryStore, useHoles } from '@/store';
import type { ScoringBasis } from '@/types';
import { formatShortDate, formatToPar, joinMeta } from '@/lib/format';
import { formatNet } from '@/lib/stats';
import { stakeUnit } from '@/lib/history';
import { netSettlements } from '@/lib/settlement';

/** A finished round, read-only: card, totals, game results and settlement. Delete lives here too. */
export default function HistoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { space } = useTheme();
  const entry = useHistoryEntry(id);
  const remove = useHistoryStore((s) => s.remove);
  const round = entry?.round ?? null;
  const holes = useHoles(round);
  const handicaps = useHandicaps(round);
  const runs = useGameRuns(round);
  const anyHandicap = Object.values(handicaps).some((h) => h.playingHandicap !== 0);
  const [basis, setBasis] = useState<ScoringBasis>(anyHandicap ? 'net' : 'gross');
  const [confirm, setConfirm] = useState(false);
  const netted = useMemo(() => netSettlements(runs.map((r) => r.settlement), round?.players.map((p) => p.id) ?? []), [runs, round]);

  if (!entry) {
    return (
      <Screen>
        <SetupHeader title="Round" />
        <Text tone="secondary">That round is no longer saved.</Text>
      </Screen>
    );
  }
  const { summary } = entry;
  const leader = summary.players.find((p) => p.id === summary.leaderId) ?? summary.players[0];
  const results = runs.map((r) => ({ mode: r.mode, standings: r.standings }));
  const betting = runs.filter((r) => r.mode.category === 'betting');

  const del = () => {
    remove(summary.id);
    setConfirm(false);
    goBackOr('/');
  };

  return (
    <Screen>
      <SetupHeader title={summary.courseName} subtitle={joinMeta([formatShortDate(summary.completedAt), summary.teeName ? `${summary.teeName} tees` : null, `${summary.holeCount} holes`, ...summary.gameNames])} />
      <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[4] }} showsVerticalScrollIndicator={false}>
        {leader ? (
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <StatTile label="Low gross" value={leader.name.split(/\s+/)[0]!} sub={`${leader.gross} · ${formatToPar(leader.grossToPar)}`} subTone={leader.grossToPar < 0 ? 'accent' : leader.grossToPar > 0 ? 'goldText' : 'secondary'} />
            <StatTile label="Net" value={formatNet(netted.totals[leader.id] ?? 0)} tone={(netted.totals[leader.id] ?? 0) > 0 ? 'accent' : (netted.totals[leader.id] ?? 0) < 0 ? 'goldText' : 'primary'} sub={round ? stakeUnit(round.settings.stakeLabel) : 'pts'} />
            <StatTile label="Games" value={String(summary.gameNames.length)} sub={summary.gameNames.length ? undefined : 'card only'} />
          </View>
        ) : null}
        {round ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
              <SectionLabel>Scorecard</SectionLabel>
              <Segmented
                compact
                options={[
                  { value: 'gross', label: 'Gross' },
                  { value: 'net', label: 'Net' },
                ]}
                value={basis}
                onChange={setBasis}
                accessibilityLabel="Scoring basis"
              />
            </View>
            <ScoreTable holes={holes} players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} currentHole={0} />
            <SectionLabel style={{ marginTop: space[3] }}>Totals</SectionLabel>
            <ScoreSummaryTable players={round.players} holes={holes} results={round.holeResults} handicaps={handicaps} />
            {runs.length > 0 ? (
              <>
                <SectionLabel style={{ marginTop: space[3] }}>Game results</SectionLabel>
                <GameResultsList results={results} />
                {round.holeResults.some((r) => r.note) ? (
                  <>
                    <SectionLabel style={{ marginTop: space[3] }}>Notes</SectionLabel>
                    <HoleNotesList results={round.holeResults} order={holes} />
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
          </>
        ) : (
          <>
            <Card padding="roomy">
              {summary.players.map((p, i) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] }}>
                  <Avatar name={p.name} index={i} size={40} />
                  <Text step="bodyStrong" style={{ flex: 1 }}>
                    {p.name}
                  </Text>
                  <Text step="score">{p.gross}</Text>
                  <Text step="total" tone="secondary" style={{ width: 52, textAlign: 'right' }}>
                    {p.net}
                  </Text>
                </View>
              ))}
            </Card>
            <Text step="caption" tone="tertiary" tabular={false}>
              Only totals were saved for this round.
            </Text>
          </>
        )}
      </ScrollView>
      <Footer>
        {round ? <ShareCardButton round={round} holes={holes} handicaps={handicaps} results={results} completedAt={summary.completedAt} /> : null}
        <Button label="Delete round" variant="secondary" onPress={() => setConfirm(true)} />
      </Footer>
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Delete this round?" subtitle="This cannot be undone.">
        <View style={{ gap: space[2] }}>
          <Button label="Delete" onPress={del} />
          <Button label="Keep it" variant="secondary" onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}
