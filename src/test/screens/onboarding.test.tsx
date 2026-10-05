import { fireEvent, screen } from 'expo-router/testing-library';
import Onboarding from '@/app/onboarding';
import { usePreferences } from '@/store';
import { renderScreens, resetStores, seedPrefs } from '../screen';

const Empty = () => null;
const routes = { onboarding: Onboarding, index: Empty, courses: Empty };

beforeEach(async () => {
  await resetStores();
  seedPrefs({ onboarded: false, analytics: undefined });
});

const next = (times: number) => {
  for (let i = 0; i < times; i++) fireEvent.press(screen.getByRole('button', { name: 'Next' }));
};

describe('Intro', () => {
  it('asks about anonymous usage after the three feature pages; yes is saved', () => {
    renderScreens(routes, '/onboarding');
    next(3);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Share anonymous usage' }));
    expect(usePreferences.getState().analytics).toBe(true);
    expect(screen.getByRole('button', { name: 'Start a round' })).toBeTruthy();
  });

  it('"No thanks" is saved and the tour carries on', () => {
    renderScreens(routes, '/onboarding');
    next(3);
    fireEvent.press(screen.getByRole('button', { name: 'No thanks' }));
    expect(usePreferences.getState().analytics).toBe(false);
    expect(screen.getByRole('button', { name: 'Maybe later' })).toBeTruthy();
  });

  it('skipping counts as no and marks the intro seen', () => {
    renderScreens(routes, '/onboarding');
    fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(usePreferences.getState()).toMatchObject({ onboarded: true, analytics: false });
  });
});
