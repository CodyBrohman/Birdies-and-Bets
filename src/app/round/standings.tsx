import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, SheetScreen, Text } from '@/components/ui';
import { StandingsCard } from '@/components/games';
import { useGameRuns, usePlayOrder, useRound } from '@/store';
import { holesPlayed } from '@/lib/scoring';

/** Standings, as a sheet over the scorecard: each game with a sentence on who leads, then "Edit games". */
export default function StandingsScreen() {
  const router = useRouter();
  const round = useRound();
  const runs = useGameRuns(round);
  const order = usePlayOrder(round);
  if (!round) return null;

  const thru = holesPlayed(round.holeResults, order);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/round/play'));

  return (
    <SheetScreen title="Standings" onClose={close}>
      {runs.length === 0 ? (
        <View style={{ gap: 4, paddingVertical: 24 }}>
          <Text step="title3" align="center">
            No games in this round
          </Text>
          <Text step="subhead" tone="secondary" align="center">
            Add a game to keep points as you play.
          </Text>
        </View>
      ) : (
        <>
          <Text step="footnote" tone="secondary">
            {thru ? `Thru ${thru} of ${order.length}` : 'No holes scored yet'}
          </Text>
          {runs.map((run) => {
            const active = round.games.find((g) => g.gameId === run.gameId)!;
            return <StandingsCard key={run.gameId} mode={run.mode} active={active} standings={run.standings} stakeLabel={round.settings.stakeLabel} players={round.players} />;
          })}
        </>
      )}
      <Button label={runs.length ? 'Edit games' : 'Add a game'} variant="secondary" onPress={() => router.push('/new-round/games?mode=edit')} />
    </SheetScreen>
  );
}
