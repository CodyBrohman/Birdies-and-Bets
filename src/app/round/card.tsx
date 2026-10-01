import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Segmented, Text } from '@/components/ui';
import { ScoreTable } from '@/components/scorecard';
import { useTheme } from '@/theme';
import { useHandicaps, useHoles, useRound, useRoundStore } from '@/store';
import type { ScoringBasis } from '@/types';

/** Scorecard: holes down, players across, markers, stroke dots, gross/net toggle with the basis explained. */
export default function CardScreen() {
  const router = useRouter();
  const { space } = useTheme();
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

  return (
    <Screen noBottomInset>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingTop: space[3], paddingBottom: space[2] }}>
        <Text step="display">Scorecard</Text>
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
      <ScrollView contentContainerStyle={{ paddingBottom: space[4] }} showsVerticalScrollIndicator={false}>
        <ScoreTable holes={holes} players={round.players} results={round.holeResults} basis={basis} handicaps={handicaps} currentHole={round.currentHole} onPressHole={jump} />
      </ScrollView>
    </Screen>
  );
}
