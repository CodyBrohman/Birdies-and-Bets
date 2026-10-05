import { fireEvent, screen } from 'expo-router/testing-library';
import SharedCard from '@/app/card';
import { redirectSystemPath } from '@/app/+native-intent';
import { cardDataFrom, encodeCard } from '@/lib/cardLink';
import { useHandicaps, useHistoryStore, useHoles, useRoundStore } from '@/store';
import { renderHook } from '@testing-library/react-native';
import { renderScreens, resetStores, seedRound } from '../screen';

const Empty = () => null;
const routes = { card: SharedCard, index: Empty };

beforeEach(resetStores);

function payload(): string {
  const round = seedRound({ scores: { 1: { cody: 4, marcus: null }, 2: { cody: 3, marcus: 5 } } });
  const holes = renderHook(() => useHoles(round)).result.current;
  const handicaps = renderHook(() => useHandicaps(round)).result.current;
  const data = cardDataFrom({ round, holes, handicaps, games: [{ name: 'Skins', basis: 'net', headline: 'Cody leads with 1 skin', lines: ['Cody 1 skin', 'Marcus 0 skins'] }], basis: 'net' });
  useRoundStore.setState({ round: null });
  return encodeCard(data);
}

describe('Shared card', () => {
  it('a card link opens a read-only card with the players and games', () => {
    const d = payload();
    renderScreens(routes, `/card?d=${encodeURIComponent(d)}`);
    expect(screen.getByText('Cedar Ridge Golf Club')).toBeTruthy();
    expect(screen.getByText('Shared scorecard')).toBeTruthy();
    expect(screen.getAllByText('Cody').length).toBeGreaterThan(0);
    expect(screen.getByText('Cody leads with 1 skin')).toBeTruthy();
    // Viewing a card never saves it.
    expect(useHistoryStore.getState().entries).toHaveLength(0);
    expect(useRoundStore.getState().round).toBeNull();
  });

  it('a broken link says so and goes Home', () => {
    const r = renderScreens(routes, '/card?d=v1.garbage');
    expect(screen.getByText('This card link looks broken.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }));
    expect(r.getPathname()).toBe('/');
  });

  it('the website link is rewritten so the data reaches the screen', () => {
    expect(redirectSystemPath({ path: 'https://www.birdiesandbets.com/card#v1.abc', initial: true })).toBe('/card?d=v1.abc');
    expect(redirectSystemPath({ path: '/round/play', initial: false })).toBe('/round/play');
  });
});
