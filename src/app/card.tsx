import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Card, Screen, Segmented, Text } from '@/components/ui';
import { SetupHeader } from '@/components/SetupHeader';
import { EmptyState } from '@/components/EmptyState';
import { ScoreTable } from '@/components/scorecard';
import { useTheme } from '@/theme';
import { decodeCard, toCardView } from '@/lib/cardLink';
import { formatShortDate, joinMeta } from '@/lib/format';
import type { ScoringBasis } from '@/types';

/**
 * A scorecard someone shared: opened from https://www.birdiesandbets.com/card#v1.… (rewritten to ?d= by +native-intent).
 * Read-only. Nothing is saved, so it never touches history, stats or profiles.
 */
export default function SharedCardScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const { d } = useLocalSearchParams<{ d?: string }>();
  const data = useMemo(() => decodeCard(typeof d === 'string' ? d : undefined), [d]);
  const view = useMemo(() => (data ? toCardView(data) : null), [data]);
  const [basis, setBasis] = useState<ScoringBasis>(data?.b ?? 'gross');

  if (!data || !view) {
    return (
      <Screen>
        <SetupHeader title="Shared card" />
        <EmptyState fill icon="link-outline" title="This card link looks broken." body="Ask whoever sent it to share the card again." action={{ label: 'Go to Home', onPress: () => router.replace('/') }} />
      </Screen>
    );
  }

  const anyHandicap = data.p.some(([, playing]) => playing !== 0);
  return (
    <Screen>
      <SetupHeader title={data.c} subtitle={joinMeta([data.t ? `${data.t} tees` : null, `${data.h.length} holes`, formatShortDate(data.d)])} />
      <ScrollView contentContainerStyle={{ gap: space[4], paddingBottom: space[6] }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
          <Text step="eyebrow" tone="accent">
            Shared scorecard
          </Text>
          {anyHandicap ? (
            <Segmented
              options={[
                { value: 'gross', label: 'Gross' },
                { value: 'net', label: 'Net' },
              ]}
              value={basis}
              onChange={setBasis}
              accessibilityLabel="Scoring basis"
            />
          ) : null}
        </View>
        <ScoreTable holes={view.holes} players={view.round.players} results={view.round.holeResults} basis={anyHandicap ? basis : 'gross'} handicaps={view.handicaps} currentHole={0} />
        {data.g.map(([name, gameBasis, headline, lines]) => (
          <Card key={name} style={{ gap: space[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Text step="title" style={{ flex: 1 }}>
                {name}
              </Text>
              <Badge label={gameBasis === 'net' ? 'Net' : 'Gross'} tone={gameBasis} />
            </View>
            <Text step="bodyStrong">{headline}</Text>
            {lines.map((line, i) => (
              <Text key={i} step="body" tone="secondary">
                {line}
              </Text>
            ))}
          </Card>
        ))}
        <Text step="caption" tone="tertiary" tabular={false} align="center">
          Shared from Birdies & Bets. Points only; nothing is paid through the app. This card is not saved to your rounds.
        </Text>
      </ScrollView>
    </Screen>
  );
}
