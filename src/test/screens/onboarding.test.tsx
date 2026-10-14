import { fireEvent, screen } from 'expo-router/testing-library';
import Onboarding from '@/app/onboarding';
import { usePreferences } from '@/store';
import { renderScreens, resetStores, seedPrefs } from '../screen';

const Empty = () => null;
const routes = { onboarding: Onboarding, index: Empty, play: Empty };

beforeEach(async () => {
  await resetStores();
  seedPrefs({ onboarded: false, analytics: undefined });
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_APTABASE_KEY;
});

const next = (times: number) => {
  for (let i = 0; i < times; i++) fireEvent.press(screen.getByRole('button', { name: 'Next' }));
};

describe('Intro', () => {
  it('three short pages, then Start a round opens New round', () => {
    const r = renderScreens(routes, '/onboarding');
    expect(screen.getByRole('header', { name: 'Keep score' })).toBeTruthy();
    next(2);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share anonymous usage' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Start a round' }));
    expect(usePreferences.getState()).toMatchObject({ onboarded: true, analytics: false });
    expect(r.getPathname()).toBe('/play');
  });

  it('with analytics set up, asks after the three pages; yes is saved and the tour ends', () => {
    process.env.EXPO_PUBLIC_APTABASE_KEY = 'A-US-0000000000';
    const r = renderScreens(routes, '/onboarding');
    next(3);
    fireEvent.press(screen.getByRole('button', { name: 'Share anonymous usage' }));
    expect(usePreferences.getState()).toMatchObject({ onboarded: true, analytics: true });
    expect(r.getPathname()).toBe('/');
  });

  it('"No thanks" is saved', () => {
    process.env.EXPO_PUBLIC_APTABASE_KEY = 'A-US-0000000000';
    renderScreens(routes, '/onboarding');
    next(3);
    fireEvent.press(screen.getByRole('button', { name: 'No thanks' }));
    expect(usePreferences.getState().analytics).toBe(false);
  });

  it('skipping counts as no and marks the intro seen', () => {
    renderScreens(routes, '/onboarding');
    fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(usePreferences.getState()).toMatchObject({ onboarded: true, analytics: false });
  });
});
