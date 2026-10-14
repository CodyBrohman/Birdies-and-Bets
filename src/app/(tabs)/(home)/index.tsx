import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ask, Button, ListItem, ListSection, ScrollScreen, Text } from '@/components/ui';
import { Wordmark } from '@/components/BrandMark';
import { LiveRoundCard, RoundRow } from '@/components/round';
import { useTheme } from '@/theme';
import { gameMeta, useHistoryInsights, useLiveRound, useMe, usePreferences, useRoundStore } from '@/store';
import { joinMeta, plural } from '@/lib/format';
import { aggregateStats, formatNet, type Stats } from '@/lib/stats';
import { formatTeeTime } from '@/lib/teeTime';
import { analyticsAvailable } from '@/services';

/**
 * Home: the wordmark; then the round in progress, the next round being set up, or New round; this year's numbers;
 * and the recent rounds.
 */
export default function Home() {
  const router = useRouter();
  const { space } = useTheme();
  const live = useLiveRound();
  const draft = useRoundStore((s) => s.draft);
  const hydrateError = useRoundStore((s) => s.hydrateError);
  const insights = useHistoryInsights();
  const onboarded = usePreferences((s) => s.onboarded);
  const prefsHydrated = usePreferences((s) => s.hydrated);
  const analyticsAsked = usePreferences((s) => s.analytics !== undefined);
  const updatePreferences = usePreferences((s) => s.update);
  const { me } = useMe();
  const meRef = useMemo(() => (me ? { id: me.id, name: me.name } : undefined), [me]);

  // First launch: the tour, once. Skipping counts as seen.
  useEffect(() => {
    if (prefsHydrated && !onboarded) router.push('/onboarding');
  }, [prefsHydrated, onboarded, router]);

  // Once, for people who finished the intro before it asked, and only when analytics is set up at all.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || !prefsHydrated || !onboarded || analyticsAsked || !analyticsAvailable()) return;
    asked.current = true;
    void ask('Share anonymous usage?', 'Counts like how many rounds get started. Never names, scores or courses. Change it in Settings.', [
      { label: 'No thanks', value: false, style: 'cancel' },
      { label: 'Share', value: true },
    ]).then((answer) => updatePreferences({ analytics: answer === true }));
  }, [prefsHydrated, onboarded, analyticsAsked, updatePreferences]);

  const year = new Date().getFullYear();
  const thisYear = useMemo(() => insights.filter((i) => new Date(i.summary.completedAt).getFullYear() === year), [insights, year]);
  const stats = useMemo(() => aggregateStats(thisYear, meRef), [thisYear, meRef]);
  const players = draft.players.filter((p) => p.name.trim());
  const draftGames = draft.games.map((g) => gameMeta(g.gameId)?.name).filter(Boolean) as string[];

  return (
    <ScrollScreen title="Home" headerTitle={() => <Wordmark />} gap={space[6]}>
      {hydrateError ? (
        <Text step="footnote" tone="negative">
          {hydrateError}
        </Text>
      ) : null}

      {live ? (
        <LiveRoundCard live={live} onResume={() => router.push('/round/play')} />
      ) : draft.course ? (
        <ListSection header="Next round">
          <ListItem
            title={draft.course.name}
            strong
            subtitle={joinMeta([formatTeeTime(draft.settings.teeTime, new Date()), plural(players.length, 'player'), ...draftGames])}
            onPress={() => router.navigate('/play')}
            accessibilityHint="Opens the round you are setting up"
            testID="next-round"
          />
        </ListSection>
      ) : (
        <Button label="New round" onPress={() => router.navigate('/play')} testID="new-round" />
      )}

      {thisYear.length > 0 ? <StatsRow year={year} stats={stats} /> : null}

      {insights.length > 0 ? (
        <ListSection header="Recent rounds" headerVariant="large" headerAction={{ label: 'See all', onPress: () => router.push('/history') }}>
          {insights.slice(0, 5).map((i) => (
            <RoundRow key={i.summary.id} insight={i} me={meRef} onPress={() => router.push({ pathname: '/history/[id]', params: { id: i.summary.id } })} />
          ))}
        </ListSection>
      ) : (
        <View style={{ gap: space[1], paddingVertical: space[4] }}>
          <Text step="title3" align="center">
            No rounds yet
          </Text>
          <Text step="subhead" tone="secondary" align="center">
            Finished rounds show up here.
          </Text>
        </View>
      )}
    </ScrollScreen>
  );
}

/** This year's numbers: yours when you play (rounds, average, best, points), else what this phone has seen. */
function StatsRow({ year, stats }: { year: number; stats: Stats }) {
  const { c, space } = useTheme();
  const cells =
    stats.kind === 'personal'
      ? [
          { label: 'Rounds', value: String(stats.rounds) },
          { label: 'Average', value: stats.avgGross != null ? String(Math.round(stats.avgGross)) : '–' },
          { label: 'Best', value: stats.bestGross != null ? String(stats.bestGross) : '–' },
          { label: 'Points', value: formatNet(stats.netPoints) },
        ]
      : [
          { label: 'Rounds', value: String(stats.rounds) },
          { label: 'Courses', value: String(stats.courses) },
          { label: 'Games', value: String(stats.games) },
          { label: 'Players', value: String(stats.players) },
        ];
  return (
    <View style={{ gap: space[2] }}>
      <Text accessibilityRole="header" step="title3">
        {year}
      </Text>
      <View style={{ flexDirection: 'row', backgroundColor: c.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: c.divider, paddingVertical: space[3] }}>
        {cells.map((cell, i) => (
          <View key={cell.label} accessible accessibilityLabel={`${cell.label}, ${cell.value}`} style={{ flex: 1, alignItems: 'center', gap: 2, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: c.divider }}>
            <Text step="scoreMd" numberOfLines={1}>
              {cell.value}
            </Text>
            <Text step="footnote" tone="secondary" numberOfLines={1}>
              {cell.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
