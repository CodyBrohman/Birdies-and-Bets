import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';
import { StandingsCard } from '@/components/games';
import { useTheme } from '@/theme';
import { useGameRuns, useRound } from '@/store';
import { holesThrough } from '@/lib/scoring';

/** Game standings. Each active game in its own card, in its own vocabulary, labeled gross or net. */
export default function StandingsScreen() {
  const router = useRouter();
  const { c, space } = useTheme();
  const round = useRound();
  const runs = useGameRuns(round);

  if (!round) return null;
  const thru = holesThrough(round.holeResults);
  const next = Math.min(thru + 1, round.settings.holeCount);
  const stakeUnit = round.settings.stakeLabel === 'points' ? 'pts' : round.settings.stakeLabel;

  return (
    <Screen noBottomInset>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: space[2] }}>
        <Text step="display">Games</Text>
        <Text step="label" tone="secondary" tabular>
          {thru ? `Thru ${thru} · next ${next}` : 'Hole 1 next'}
        </Text>
      </View>

      {runs.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[4] }}>
          <View style={{ width: 56, height: 56, borderRadius: 999, borderWidth: 2, borderStyle: 'dashed', borderColor: c.accent }} />
          <Text step="display" align="center">
            Just a scorecard so far.
          </Text>
          <Text tone="secondary" align="center">
            Add a game any time — it scores from hole 1 using what's already on the card.
          </Text>
          <Button label="Add a game" variant="tinted" onPress={() => router.push('/new-round/games?mode=edit')} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[4] }}>
          {runs.map((run) => {
            const active = round.games.find((g) => g.gameId === run.gameId)!;
            return <StandingsCard key={run.gameId} mode={run.mode} active={active} standings={run.standings} stakeUnit={stakeUnit} />;
          })}
          <Button label="Change games" variant="secondary" onPress={() => router.push('/new-round/games?mode=edit')} />
        </ScrollView>
      )}
    </Screen>
  );
}
