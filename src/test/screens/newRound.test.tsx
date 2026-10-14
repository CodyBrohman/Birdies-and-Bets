import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import Play from '@/app/(tabs)/(play)/play';
import { getGame } from '@/games/registry';
import { newActiveGame, useRoundStore } from '@/store';
import { cedarRidge, cody, lastAlert, marcus, pressAlert, renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = {
  play: Play,
  'round/play': Empty,
  'new-round/course': Empty,
  'new-round/players': Empty,
  'new-round/add-game': Empty,
  'new-round/game/[gameId]': Empty,
  'new-round/options': Empty,
  index: Empty,
};

beforeEach(resetStores);

const start = () => screen.getByRole('button', { name: 'Start round' });
const draftWith = (players = [cody]) => {
  useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
  useRoundStore.getState().setDraftPlayers(players);
};

describe('New round', () => {
  it('without a course, says so and opens the course sheet', () => {
    const r = renderScreens(routes, '/play');
    expect(screen.getByText('Choose a course to start.')).toBeTruthy();
    expect(start().props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByRole('button', { name: 'Choose a course' }));
    expect(r.getPathname()).toBe('/new-round/course');
  });

  it('a round on your own starts', () => {
    draftWith();
    const r = renderScreens(routes, '/play');
    expect(screen.getByRole('button', { name: `Course, ${cedarRidge.name}` })).toBeTruthy();
    fireEvent.press(start());
    expect(useRoundStore.getState().round?.players).toHaveLength(1);
    expect(r.getPathname()).toBe('/round/play');
  });

  it('with nobody in the round, says so and does not start', () => {
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    renderScreens(routes, '/play');
    expect(screen.getByText('Add at least one player.')).toBeTruthy();
    fireEvent.press(start());
    expect(useRoundStore.getState().round).toBeNull();
  });

  it('lists the players with their index and course handicap', () => {
    draftWith([cody, marcus]);
    renderScreens(routes, '/play');
    expect(screen.getByRole('header', { name: 'Players · 2 of 4' })).toBeTruthy();
    expect(screen.getByLabelText(/^Cody, HCP 8\.2 · CH \d+$/)).toBeTruthy();
  });

  it('asks before replacing a round in play, and keeps it unless told otherwise', async () => {
    const live = seedRound();
    draftWith();
    const r = renderScreens(routes, '/play');
    expect(screen.getByText(/^A round is in progress at /)).toBeTruthy();
    fireEvent.press(start());
    expect(lastAlert()).toMatchObject({ title: 'End the round in progress?', buttons: ['Cancel', 'Discard and start'] });
    pressAlert('Cancel');
    await waitFor(() => expect(useRoundStore.getState().round?.id).toBe(live.id));

    fireEvent.press(start());
    pressAlert('Discard and start');
    await waitFor(() => expect(useRoundStore.getState().round?.id).not.toBe(live.id));
    await waitFor(() => expect(r.getPathname()).toBe('/round/play'));
  });

  it('shows each picked game in a line and blocks the start until its players are picked', () => {
    draftWith([cody, marcus, { ...cody, id: 'priya', name: 'Priya', profileId: undefined }]);
    useRoundStore.getState().setDraftGames([newActiveGame(getGame('skins')!), newActiveGame(getGame('match-play')!)]);
    const r = renderScreens(routes, '/play');
    expect(screen.getByLabelText('Skins, 5 pts per skin · Net')).toBeTruthy();
    expect(screen.getByText('Match Play: pick 2 players.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /^Match Play, Pick 2 players/ }));
    expect(r.getPathname()).toBe('/new-round/game/match-play');
  });

  it('a tee time is off until switched on, then set with the picker', () => {
    draftWith();
    renderScreens(routes, '/play');
    expect(useRoundStore.getState().draft.settings.teeTime).toBeUndefined();
    fireEvent(screen.getByLabelText('Set a tee time'), 'valueChange', true);
    expect(useRoundStore.getState().draft.settings.teeTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d0$/);
    fireEvent(screen.getByLabelText('Tee time'), 'change', { type: 'set' }, new Date(2030, 4, 2, 9, 40));
    expect(useRoundStore.getState().draft.settings.teeTime).toBe('2030-05-02T09:40');
  });

  it('Add or change players opens the players sheet', () => {
    draftWith();
    const r = renderScreens(routes, '/play');
    fireEvent.press(screen.getByRole('button', { name: 'Add or change players' }));
    expect(r.getPathname()).toBe('/new-round/players');
  });
});
