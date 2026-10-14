import { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, confirm, ListSection, ScrollScreen, Text } from '@/components/ui';
import { RoundRow } from '@/components/round';
import { useTheme } from '@/theme';
import { useHistoryInsights, useHistoryStore, useMe } from '@/store';
import type { RoundInsight } from '@/lib/stats';

/** Every finished round, newest first, in month sections. Long press a round to delete it. */
export default function RoundsScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const insights = useHistoryInsights();
  const remove = useHistoryStore((s) => s.remove);
  const { me } = useMe();
  const meRef = useMemo(() => (me ? { id: me.id, name: me.name } : undefined), [me]);

  const sections = useMemo(() => {
    const byMonth = new Map<string, RoundInsight[]>();
    for (const i of insights) {
      const d = new Date(i.summary.completedAt);
      const title = Number.isNaN(d.getTime()) ? 'Earlier' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      byMonth.set(title, [...(byMonth.get(title) ?? []), i]);
    }
    return [...byMonth.entries()].map(([title, data]) => ({ title, data }));
  }, [insights]);

  const del = async (i: RoundInsight) => {
    if (await confirm({ title: 'Delete this round?', message: `${i.summary.courseName} is removed from your rounds and stats. This can't be undone.`, confirmLabel: 'Delete round', destructive: true })) remove(i.summary.id);
  };

  return (
    <ScrollScreen title="Rounds" gap={space[6]}>
      {insights.length === 0 ? (
        <View style={{ gap: space[3], paddingVertical: space[6] }}>
          <View style={{ gap: space[1] }}>
            <Text step="title3" align="center">
              No rounds yet
            </Text>
            <Text step="subhead" tone="secondary" align="center">
              Finished rounds show up here.
            </Text>
          </View>
          <Button label="New round" onPress={() => router.navigate('/play')} />
        </View>
      ) : (
        sections.map((section) => (
          <ListSection key={section.title} header={section.title}>
            {section.data.map((i) => (
              <RoundRow
                key={i.summary.id}
                insight={i}
                me={meRef}
                onPress={() => router.push({ pathname: '/history/[id]', params: { id: i.summary.id } })}
                menu={[{ label: 'Delete round', destructive: true, onPress: () => void del(i) }]}
              />
            ))}
          </ListSection>
        ))
      )}
    </ScrollScreen>
  );
}
