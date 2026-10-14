import { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { confirm, HeaderButton, ListItem, ListSection, ScrollScreen, Text } from '@/components/ui';
import { goBackOr } from '@/components/navigation';
import { RoundReport } from '@/components/round';
import { useShareCard } from '@/components/share';
import { useTheme } from '@/theme';
import { useGameRuns, useHandicaps, useHistoryEntry, useHistoryStore, useHoles, usePlayOrder } from '@/store';
import { formatShortDate, joinMeta, plural } from '@/lib/format';
import { netSettlements } from '@/lib/settlement';

/** A finished round: who won, the scores, the card, games, points and notes. Share it from the header; delete it here. */
export default function RoundPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { space } = useTheme();
  const entry = useHistoryEntry(id);
  const remove = useHistoryStore((s) => s.remove);
  const round = entry?.round ?? null;
  const holes = useHoles(round);
  const order = usePlayOrder(round);
  const handicaps = useHandicaps(round);
  const runs = useGameRuns(round);
  const netted = useMemo(() => netSettlements(runs.map((r) => r.settlement), round?.players.map((p) => p.id) ?? []), [runs, round]);
  const results = useMemo(() => runs.map((r) => ({ mode: r.mode, standings: r.standings })), [runs]);
  const { share, busy, host } = useShareCard({ round: round!, holes, handicaps, results, completedAt: entry?.summary.completedAt });

  if (!entry) {
    return (
      <ScrollScreen title="Round">
        <Text step="rowBody" tone="secondary">
          That round is no longer saved.
        </Text>
      </ScrollScreen>
    );
  }
  const { summary } = entry;
  const date = formatShortDate(summary.completedAt);
  const del = async () => {
    if (!(await confirm({ title: 'Delete this round?', message: 'It is removed from your rounds and stats. This can’t be undone.', confirmLabel: 'Delete round', destructive: true }))) return;
    remove(summary.id);
    goBackOr('/');
  };

  return (
    <ScrollScreen
      title={summary.courseName}
      gap={space[6]}
      headerTitle={() => (
        <View accessible accessibilityRole="header" accessibilityLabel={`${summary.courseName}, ${date}`} style={{ alignItems: 'center', maxWidth: 240 }}>
          <Text step="rowTitle" numberOfLines={1}>
            {summary.courseName}
          </Text>
          <Text step="caption1" tone="secondary">
            {date}
          </Text>
        </View>
      )}
      headerRight={round ? () => <HeaderButton label="Share scorecard" icon="share" disabled={busy} onPress={() => void share()} /> : undefined}
    >
      <Text step="subhead" tone="secondary" style={{ marginBottom: -space[3] }}>
        {joinMeta([summary.teeName ? `${summary.teeName} tees` : null, plural(summary.holeCount, 'hole'), ...summary.gameNames])}
      </Text>

      {round ? (
        <RoundReport round={round} holes={holes} order={order} handicaps={handicaps} results={results} netted={netted} showScorecard />
      ) : (
        <ListSection header="Totals" footer="Only totals were saved for this round.">
          {summary.players.map((p) => (
            <ListItem key={p.id} title={p.name} value={joinMeta([`Gross ${p.gross}`, p.playingHandicap ? `Net ${p.net}` : null])} />
          ))}
        </ListSection>
      )}

      <ListSection>
        <ListItem title="Delete round" destructive onPress={() => void del()} />
      </ListSection>
      {round ? host : null}
    </ScrollScreen>
  );
}
