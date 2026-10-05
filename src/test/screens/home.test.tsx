import { fireEvent, screen } from 'expo-router/testing-library';
import Home from '@/app/(tabs)/index';
import { usePreferences } from '@/store';
import { renderScreens, resetStores, seedPrefs, seedRound } from '../screen';

const Empty = () => null;
const routes = { index: Home, 'round/play': Empty, courses: Empty, bet: Empty, friends: Empty, profile: Empty, onboarding: Empty };

beforeEach(resetStores);

describe('Home', () => {
  it('with no round, points you at a course', () => {
    renderScreens(routes, '/');
    expect(screen.getByRole('button', { name: 'Find a course' })).toBeTruthy();
    expect(screen.queryByText('Back to your round')).toBeNull();
    expect(screen.queryByText('Current round')).toBeNull();
  });

  it('with a round in progress, shows the way back to it', () => {
    seedRound({ scores: { 1: { cody: 4, marcus: 5 }, 2: { cody: 3, marcus: 4 } }, currentHole: 3 });
    const r = renderScreens(routes, '/');
    expect(screen.getByText('Round in progress')).toBeTruthy();
    expect(screen.getByText('Keep the good shots coming.')).toBeTruthy();
    expect(screen.getByText('Current round')).toBeTruthy();
    expect(screen.getByText('Hole 3 of 18 · 2 scored')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to your round' }));
    expect(r.getPathname()).toBe('/round/play');
  });

  it('the current round card also opens the scorecard', () => {
    seedRound({ currentHole: 1 });
    const r = renderScreens(routes, '/');
    fireEvent.press(screen.getByLabelText(/^Current round at /));
    expect(r.getPathname()).toBe('/round/play');
  });

  it('asks about anonymous usage once, and "No thanks" is remembered', () => {
    seedPrefs({ analytics: undefined });
    renderScreens(routes, '/');
    expect(screen.getByText('Help make it better?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'No thanks' }));
    expect(usePreferences.getState().analytics).toBe(false);
    expect(screen.queryByText('Help make it better?')).toBeNull();
  });

  it('does not ask again once answered', () => {
    renderScreens(routes, '/');
    expect(screen.queryByText('Help make it better?')).toBeNull();
  });
});
