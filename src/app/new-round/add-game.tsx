import { useLocalSearchParams, useRouter } from 'expo-router';
import { ListItem, ListSection, SheetScreen } from '@/components/ui';
import { fitReason, MIN_PLAYERS, newActiveGame, participantCountOf, setupNeeded, targetFrom, useGameCatalog, useGamesTarget } from '@/store';
import type { GameMode } from '@/types';

/**
 * The game catalog, for the round being set up or the one in progress: points games and games just for fun, each with
 * its one-line rule and how many can play. Adding a game that needs players or teams picked opens its settings.
 */
export default function AddGameSheet() {
  const router = useRouter();
  const params = useLocalSearchParams<{ target?: string }>();
  const target = targetFrom(params.target);
  const catalog = useGameCatalog();
  const { players, games, setGames } = useGamesTarget(target);
  const close = () => (router.canGoBack() ? router.back() : router.replace(target === 'round' ? '/round/play' : '/play'));

  const add = (mode: GameMode) => {
    const fresh = newActiveGame(mode);
    const count = participantCountOf(mode, fresh);
    const game = { ...fresh, ...(count ? { playerIds: players.slice(0, count).map((p) => p.id) } : {}) };
    setGames([...games, game]);
    if (setupNeeded(mode, game, players) || (count && players.length > count)) router.replace({ pathname: '/new-round/game/[gameId]', params: { gameId: mode.id, target } });
    else close();
  };

  const row = (mode: GameMode) => {
    const added = games.some((g) => g.gameId === mode.id);
    const reason = fitReason(mode, Math.max(players.length, MIN_PLAYERS));
    const range = mode.minPlayers === mode.maxPlayers ? `${mode.minPlayers} players` : `${mode.minPlayers}–${mode.maxPlayers} players`;
    return (
      <ListItem
        key={mode.id}
        title={mode.name}
        strong
        subtitle={`${mode.blurb}\n${reason ?? range}`}
        subtitleLines={4}
        value={added ? 'Added' : undefined}
        disabled={!!reason && !added}
        accessory={added ? 'chevron' : 'none'}
        onPress={() => (added ? router.replace({ pathname: '/new-round/game/[gameId]', params: { gameId: mode.id, target } }) : add(mode))}
        accessibilityHint={added ? 'Opens its settings' : 'Adds it to the round'}
      />
    );
  };

  return (
    <SheetScreen title="Add a game" onClose={close} closeLabel="Done">
      <ListSection header="Points games" footer="Points are a tally between players. Nothing is paid in the app.">
        {catalog.filter((g) => g.category === 'betting').map(row)}
      </ListSection>
      <ListSection header="Just for fun">{catalog.filter((g) => g.category === 'social').map(row)}</ListSection>
    </SheetScreen>
  );
}
