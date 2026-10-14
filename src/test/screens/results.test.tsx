import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import * as Haptics from 'expo-haptics';
import Results from '@/app/round/summary';
import { getGame } from '@/games/registry';
import { newActiveGame, useHistoryStore, useRoundStore } from '@/store';
import { renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = { 'round/summary': Results, 'round/play': Empty, index: Empty };

const allHoles = (cody: number, marcus: number) => {
  const s: Record<number, Record<string, number>> = {};
  for (let h = 1; h <= 18; h++) s[h] = { cody, marcus };
  return s;
};

beforeEach(resetStores);

describe('Results', () => {
  it('leads with who won, then Player · Gross · Net · Pts', () => {
    seedRound({ games: [newActiveGame(getGame('skins')!)], scores: allHoles(4, 6) });
    renderScreens(routes, '/round/summary');
    expect(screen.getByRole('header', { name: /^Cody won\. Net \d+ \(.+\) · Gross 72/ })).toBeTruthy();
    expect(screen.getByLabelText(/^Cody, course handicap \d+, gross 72, even, net \d+/)).toBeTruthy();
    expect(screen.getByLabelText(/^Marcus, course handicap \d+, gross 108, 36 over/)).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Games' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Points' })).toBeTruthy();
    expect(screen.getByText('No notes for this round')).toBeTruthy();
  });

  it('the points tally never says anyone pays or owes', () => {
    seedRound({ games: [newActiveGame(getGame('skins')!)], scores: allHoles(4, 6) });
    renderScreens(routes, '/round/summary');
    fireEvent.press(screen.getByRole('button', { name: 'How it nets out' }));
    expect(screen.getByText(/^Cody \+\d+ pts vs Marcus$/)).toBeTruthy();
    expect(screen.getByText('Points are a tally between players. Nothing is paid in the app.')).toBeTruthy();
    expect(screen.queryAllByText(/\b(pays?|owes?|settle)\b/i)).toHaveLength(0);
  });

  it('a round with no games shows no Games or Points sections', () => {
    seedRound({ scores: { 1: { cody: 4, marcus: 5 } } });
    renderScreens(routes, '/round/summary');
    expect(screen.queryByRole('header', { name: 'Games' })).toBeNull();
    expect(screen.queryByRole('header', { name: 'Points' })).toBeNull();
    expect(screen.getByText(/1 of 18 holes/)).toBeTruthy();
  });

  it('Save round files it in history, clears the round and goes Home', async () => {
    const round = seedRound({ scores: allHoles(4, 5) });
    const r = renderScreens(routes, '/round/summary');
    fireEvent.press(screen.getByRole('button', { name: 'Save round' }));
    expect(useHistoryStore.getState().entries[0]?.summary.id).toBe(round.id);
    expect(useRoundStore.getState().round).toBeNull();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    await waitFor(() => expect(r.getPathname()).toBe('/'));
  });
});
