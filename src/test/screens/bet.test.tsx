import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import Bet from '@/app/(tabs)/bet';
import { useRoundStore } from '@/store';
import { cedarRidge, cody, lastAlert, pressAlert, renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = { bet: Bet, 'round/play': Empty, courses: Empty, index: Empty, 'new-round/games': Empty };

beforeEach(resetStores);

const startButtons = () => screen.getAllByRole('button', { name: /^Start (this|a new) round$/ });

describe('Round builder', () => {
  it('without a course, asks for one first', () => {
    renderScreens(routes, '/bet');
    expect(screen.getByRole('button', { name: 'Pick a course' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start this round' })).toBeNull();
  });

  it('a round on your own starts', () => {
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    useRoundStore.getState().setDraftPlayers([cody]);
    const r = renderScreens(routes, '/bet');
    expect(screen.queryByText('Add yourself to the round.')).toBeNull();
    fireEvent.press(startButtons()[0]!);
    expect(useRoundStore.getState().round?.players).toHaveLength(1);
    expect(r.getPathname()).toBe('/round/play');
  });

  it('with nobody in the round, says so and does not start', () => {
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    renderScreens(routes, '/bet');
    expect(screen.getByText('Add yourself to the round.')).toBeTruthy();
    fireEvent.press(startButtons()[0]!);
    expect(useRoundStore.getState().round).toBeNull();
  });

  it('asks before replacing a round in play, and keeps it unless told otherwise', async () => {
    const live = seedRound();
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    useRoundStore.getState().setDraftPlayers([cody]);
    const r = renderScreens(routes, '/bet');
    fireEvent.press(startButtons()[0]!);
    expect(lastAlert()).toMatchObject({ title: 'End the round in progress?', buttons: ['Cancel', 'Discard and start'] });
    pressAlert('Cancel');
    await waitFor(() => expect(useRoundStore.getState().round?.id).toBe(live.id));

    fireEvent.press(startButtons()[0]!);
    pressAlert('Discard and start');
    await waitFor(() => expect(useRoundStore.getState().round?.id).not.toBe(live.id));
    await waitFor(() => expect(r.getPathname()).toBe('/round/play'));
  });

  it('remembers picked games with the rest of the draft', () => {
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    useRoundStore.getState().setDraftPlayers([cody]);
    renderScreens(routes, '/bet');
    fireEvent.press(screen.getByRole('button', { name: 'Add Stableford' }));
    expect(useRoundStore.getState().draft.games.map((g) => g.gameId)).toEqual(['stableford']);
  });

  it('shows no tee time until one is picked (no hidden default)', () => {
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    renderScreens(routes, '/bet');
    expect(screen.getByText('No tee time')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Tomorrow' }));
    expect(useRoundStore.getState().draft.settings.teeTime).toBeUndefined();
  });
});
