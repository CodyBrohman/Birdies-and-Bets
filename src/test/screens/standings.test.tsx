import { fireEvent, screen } from 'expo-router/testing-library';
import Standings from '@/app/round/standings';
import { getGame } from '@/games/registry';
import { newActiveGame } from '@/store';
import { renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = { 'round/standings': Standings, 'round/play': Empty, 'new-round/games': Empty };

beforeEach(resetStores);

describe('Standings', () => {
  it('leads each game with a sentence about the leader, then a row per player', () => {
    // Gross skins: Cody birdies hole 1, then a tie on hole 2 carries.
    const skins = { ...newActiveGame(getGame('skins')!), basis: 'gross' as const };
    seedRound({ games: [skins], scores: { 1: { cody: 3, marcus: 4 }, 2: { cody: 5, marcus: 5 } } });
    renderScreens(routes, '/round/standings');
    expect(screen.getByText('Cody leads with 1 skin')).toBeTruthy();
    expect(screen.getByText(/^Hole 3 is worth 2 skins/)).toBeTruthy();
    expect(screen.getByText('Thru 2 of 18')).toBeTruthy();
    expect(screen.getByRole('header', { name: /^Skins, 5 pts per skin, gross$/ })).toBeTruthy();
    expect(screen.getByText('1 skin')).toBeTruthy();
    expect(screen.getByText('0 skins')).toBeTruthy();
  });

  it('Edit games opens the games editor', () => {
    seedRound({ games: [newActiveGame(getGame('skins')!)] });
    const r = renderScreens(routes, '/round/standings');
    fireEvent.press(screen.getByRole('button', { name: 'Edit games' }));
    expect(r.getPathname()).toBe('/new-round/games');
  });

  it('with no games, says so and offers to add one; Done closes the sheet', () => {
    seedRound();
    const r = renderScreens(routes, '/round/standings');
    expect(screen.getByText('No games in this round')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(r.getPathname()).toBe('/round/play');
  });
});
