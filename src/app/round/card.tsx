import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Segmented, Text } from '@/components/ui';
import { ScoreGrid, TotalsBlock } from '@/components/scorecard';
import { useTheme } from '@/theme';
import { useHandicaps, useHoles, useRound, useRoundStore } from '@/store';
import type { ScoringBasis } from '@/types';
import { backNine, frontNine } from '@/lib/scoring';

/** Scorecard: two stacked nine-hole blocks, markers, stroke dots, gross/net toggle with the basis labeled. */
export default function CardScreen() {
  const router = useRouter();
  const { space, c, radius } = useTheme();
  const round = useRound();
  const holes = useHoles(round);
  const handicaps = useHandicaps(round);
  const setCurrentHole = useRoundStore((s) => s.setCurrentHole);
  const anyHandicap = Object.values(handicaps).some((h) => h.playingHandicap !== 0);
  const [basis, setBasis] = useState<ScoringBasis>(anyHandicap ? 'net' : 'gross');

  if (!round) return null;

  const jump = (holeNumber: number) => {
    setCurrentHole(holeNumber);
    router.navigate('/round/play');
  };

  const front = frontNine(holes);
  const back = backNine(holes);

  return (
    <Screen noBottomInset>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[2] }}>
        <Text step="display">Card</Text>
        <View style={{ width: 160 }}>
          <Segmented
            options={[
              { value: 'gross', label: 'Gross' },
              { value: 'net', label: 'Net' },
            ]}
            value={basis}
            onChange={setBasis}
            accessibilityLabel="Scoring basis"
          />
        </View>
      </View>
      <View style={{ backgroundColor: c.accentTint, borderRadius: radius.sm, padding: space[2], marginBottom: space[3] }}>
        <Text step="caption" tone="accent" tabular={false}>
          {basis === 'net'
            ? 'NET — handicap strokes deducted. Birdie and bogey marks are net.'
            : 'GROSS — strokes as played. Marks are against par with no handicap.'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[4] }}>
        <ScoreGrid holes={front} subtotalLabel="Out" players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} currentHole={round.currentHole} onPressHole={jump} />
        {back.length > 0 ? (
          <ScoreGrid holes={back} subtotalLabel="In" players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} currentHole={round.currentHole} onPressHole={jump} />
        ) : null}
        <TotalsBlock holes={holes} players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space[4] }}>
          <Legend kind="birdie" label="Birdie" />
          <Legend kind="eagle" label="Eagle" />
          <Legend kind="bogey" label="Bogey" />
          <Legend kind="double" label="Double+" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Legend({ kind, label }: { kind: 'birdie' | 'eagle' | 'bogey' | 'double'; label: string }) {
  const { c, radius } = useTheme();
  const under = kind === 'birdie' || kind === 'eagle';
  const dbl = kind === 'eagle' || kind === 'double';
  const color = under ? c.positive : c.negative;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 14, height: 14, borderRadius: under ? 999 : radius.xs, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        {dbl ? <View style={{ position: 'absolute', width: 19, height: 19, borderRadius: under ? 999 : radius.xs + 1, borderWidth: 1.5, borderColor: color }} /> : null}
      </View>
      <Text step="caption" tone="secondary" tabular={false}>
        {label}
      </Text>
    </View>
  );
}
