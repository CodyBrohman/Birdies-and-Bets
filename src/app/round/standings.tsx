import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { StandingsCard } from '@/components/games';
import { useTheme } from '@/theme';
import { useGameRuns, usePlayOrder, useRound } from '@/store';
import { holesPlayed } from '@/lib/scoring';

/** Game standings. Each active game in its own card, in its own vocabulary, labeled gross or net. */
export default function StandingsScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const round = useRound();
  const runs = useGameRuns(round);
  const order = usePlayOrder(round);

  if (!round) return null;
  const thru = holesPlayed(round.holeResults, order);

  return (
    <Screen noBottomInset>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: space[3], paddingBottom: space[3] }}>
        <Text step="display">Standings</Text>
        <Text step="label" tone="tertiary" tabular>
          {thru ? `Thru ${thru}` : `Hole ${order[0]?.number ?? 1} next`}
        </Text>
      </View>

      {runs.length === 0 ? (
        <EmptyState fill icon="trophy-outline" title="Just a scorecard so far." action={{ label: 'Add a game', onPress: () => router.push('/new-round/games?mode=edit') }} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: space[3], paddingBottom: space[4] }} showsVerticalScrollIndicator={false}>
          {runs.map((run) => {
            const active = round.games.find((g) => g.gameId === run.gameId)!;
            return <StandingsCard key={run.gameId} mode={run.mode} active={active} standings={run.standings} stakeLabel={round.settings.stakeLabel} players={round.players} />;
          })}
          <Button label="Change games" variant="secondary" onPress={() => router.push('/new-round/games?mode=edit')} />
        </ScrollView>
      )}
    </Screen>
  );
}
