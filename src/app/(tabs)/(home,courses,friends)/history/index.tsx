import { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { EmptyState } from '@/components/EmptyState';
import { PastRoundCard } from '@/components/round';
import { useTheme } from '@/theme';
import { useHistoryInsights, useMe } from '@/store';
import type { RoundInsight } from '@/lib/stats';

/** Every finished round, newest first, in month sections. Home shows only the latest few. */
export default function RoundsScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const insights = useHistoryInsights();
  const { me } = useMe();
  const meRef = me ? { id: me.id, name: me.name } : undefined;

  const sections = useMemo(() => {
    const byMonth = new Map<string, RoundInsight[]>();
    for (const i of insights) {
      const d = new Date(i.summary.completedAt);
      const title = Number.isNaN(d.getTime()) ? 'Earlier' : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      byMonth.set(title, [...(byMonth.get(title) ?? []), i]);
    }
    return [...byMonth.entries()].map(([title, data]) => ({ title, data }));
  }, [insights]);

  return (
    <Screen>
      <SetupHeader title="Rounds" fallback="/" />
      {insights.length === 0 ? (
        <EmptyState fill icon="flag-outline" title="No rounds yet" body="Finished rounds show up here." action={{ label: 'New round', onPress: () => router.navigate('/play') }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.summary.id}
          contentContainerStyle={{ paddingBottom: space[6], gap: space[3] }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingTop: space[3] }}>
              <Text accessibilityRole="header" step="title" tone="secondary">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => <PastRoundCard insight={item} me={meRef} onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.summary.id } })} />}
        />
      )}
    </Screen>
  );
}
