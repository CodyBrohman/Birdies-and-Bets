import { fireEvent, screen } from 'expo-router/testing-library';
import Bet from '@/app/(tabs)/bet';
import { useRoundStore } from '@/store';
import { cedarRidge, cody, renderScreens, resetStores, seedRound } from '../screen';

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

  it('asks before replacing a round in play', () => {
    const live = seedRound();
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    useRoundStore.getState().setDraftPlayers([cody]);
    renderScreens(routes, '/bet');
    fireEvent.press(startButtons()[0]!);
    expect(screen.getByText('Start a new round?')).toBeTruthy();
    expect(useRoundStore.getState().round?.id).toBe(live.id);
    fireEvent.press(screen.getByRole('button', { name: 'Keep playing' }));
    expect(useRoundStore.getState().round?.id).toBe(live.id);
  });
});
