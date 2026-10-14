import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, HeaderButton, ScrollScreen, SegmentedControl, Text } from '@/components/ui';
import { NineCard } from '@/components/scorecard';
import { GameResultRows, ResultCallout, ResultsTable } from '@/components/round';
import { useTheme } from '@/theme';
import { decodeCard, toCardView } from '@/lib/cardLink';
import { formatShortDate, joinMeta, plural } from '@/lib/format';
import { resultHeadline, resultRows } from '@/lib/history';
import { backNine, frontNine } from '@/lib/scoring';
import { netSettlements } from '@/lib/settlement';
import type { ScoringBasis } from '@/types';

const WEBSITE = 'https://www.birdiesandbets.com';

/**
 * A scorecard someone shared: opened from https://www.birdiesandbets.com/card#v1.… (rewritten to ?d= by +native-intent).
 * The same sections as a round's page, read-only. Nothing is saved, so it never touches history, stats or profiles.
 */
export default function SharedCardScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const { d } = useLocalSearchParams<{ d?: string }>();
  const data = useMemo(() => decodeCard(typeof d === 'string' ? d : undefined), [d]);
  const view = useMemo(() => (data ? toCardView(data) : null), [data]);
  const [basis, setBasis] = useState<ScoringBasis>(data?.b ?? 'gross');
  const home = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!data || !view) {
    return (
      <ScrollScreen title="Shared card" headerLeft={() => <HeaderButton label="Close" onPress={home} />}>
        <View style={{ gap: space[3], paddingVertical: space[6] }}>
          <View style={{ gap: space[1] }}>
            <Text step="title3" align="center">
              This card link looks broken.
            </Text>
            <Text step="subhead" tone="secondary" align="center">
              Ask whoever sent it to share the card again.
            </Text>
          </View>
          <Button label="Go to Home" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      </ScrollScreen>
    );
  }

  const rows = resultRows(view.round, view.holes, view.handicaps, netSettlements([], view.round.players.map((p) => p.id)));
  const anyHandicap = rows.some((r) => r.playingHandicap !== 0);
  const headline = resultHeadline(rows, anyHandicap);
  const front = frontNine(view.holes);
  const back = backNine(view.holes);
  const shown = anyHandicap ? basis : 'gross';

  return (
    <ScrollScreen
      title={data.c}
      gap={space[6]}
      headerLeft={() => <HeaderButton label="Close" onPress={home} />}
      headerTitle={() => (
        <View accessible accessibilityRole="header" accessibilityLabel={`${data.c}, ${formatShortDate(data.d)}`} style={{ alignItems: 'center', maxWidth: 240 }}>
          <Text step="rowTitle" numberOfLines={1}>
            {data.c}
          </Text>
          <Text step="caption1" tone="secondary">
            {formatShortDate(data.d)}
          </Text>
        </View>
      )}
    >
      <Text step="subhead" tone="secondary" style={{ marginBottom: -space[3] }}>
        {joinMeta(['Shared scorecard', data.t ? `${data.t} tees` : null, plural(data.h.length, 'hole')])}
      </Text>
      <ResultCallout title={headline.title} detail={headline.detail} />
      <ResultsTable rows={rows} showNet={anyHandicap} showPoints={false} />

      <View style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Text accessibilityRole="header" step="title3" style={{ flex: 1 }}>
            Scorecard
          </Text>
          {anyHandicap ? (
            <SegmentedControl
              accessibilityLabel="Scores shown"
              options={[
                { value: 'gross', label: 'Gross' },
                { value: 'net', label: 'Net' },
              ]}
              value={basis}
              onChange={setBasis}
              style={{ width: 150 }}
            />
          ) : null}
        </View>
        {front.length > 0 ? <NineCard label="Out" holes={front} players={view.round.players} results={view.round.holeResults} basis={shown} handicaps={view.handicaps} /> : null}
        {back.length > 0 ? <NineCard label="In" holes={back} players={view.round.players} results={view.round.holeResults} basis={shown} handicaps={view.handicaps} totalOver={front.length > 0 ? view.holes : undefined} /> : null}
      </View>

      {data.g.length > 0 ? (
        <View style={{ gap: space[2] }}>
          <Text accessibilityRole="header" step="title3">
            Games
          </Text>
          <GameResultRows games={data.g.map(([name, gameBasis, line, lines], i) => ({ key: `${name}-${i}`, name, basis: gameBasis, headline: line, lines }))} />
        </View>
      ) : null}

      <View style={{ gap: space[2], alignItems: 'center' }}>
        <Text step="footnote" tone="tertiary" align="center">
          Shared from Birdies & Bets. Points only; nothing is paid in the app. Opening this card doesn&apos;t save it to your rounds.
        </Text>
        <Button label="Get the app" variant="plain" onPress={() => void Linking.openURL(WEBSITE)} />
      </View>
    </ScrollScreen>
  );
}
