import { useLocalSearchParams, useRouter } from 'expo-router';
import { ListItem, ListSection, SheetScreen } from '@/components/ui';
import { gameMeta, gameSummary, targetFrom, useGamesTarget } from '@/store';

/**
 * The games in a round, as a sheet (the round in progress by default; the round being set up lists its games on the
 * Play tab). Each opens its settings; "Add a game" opens the catalog. Games rescore from the first hole on any change.
 */
export default function GamesSheet() {
  const router = useRouter();
  const params = useLocalSearchParams<{ target?: string }>();
  const target = params.target ? targetFrom(params.target) : 'round';
  const { players, games, settings } = useGamesTarget(target);
  const close = () => (router.canGoBack() ? router.back() : router.replace(target === 'round' ? '/round/play' : '/play'));

  return (
    <SheetScreen title="Games" onClose={close}>
      <ListSection footer="Changing a game rescores it from the first hole.">
        {games.map((g) => {
          const mode = gameMeta(g.gameId);
          if (!mode) return null;
          return (
            <ListItem
              key={g.gameId}
              title={mode.name}
              strong
              subtitle={gameSummary(mode, g, players, settings.stakeLabel)}
              onPress={() => router.push({ pathname: '/new-round/game/[gameId]', params: { gameId: g.gameId, target } })}
            />
          );
        })}
        <ListItem title="Add a game" action onPress={() => router.push({ pathname: '/new-round/add-game', params: { target } })} testID="add-game" />
      </ListSection>
    </SheetScreen>
  );
}
