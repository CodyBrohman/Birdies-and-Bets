import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import Settings from '@/app/(tabs)/(profile)/settings';
import Profile from '@/app/(tabs)/(profile)/profile';
import HomeCourse from '@/app/home-course';
import Handicap from '@/app/handicap';
import { PRIVACY_POLICY_URL, SUPPORT_URL } from '@/services';
import { SAMPLE_COURSE } from '@/data/courses';
import { saveMyName, usePreferences, useProfileStore } from '@/store';
import { lastActionSheet, pressAction, renderScreens, resetStores } from '../screen';

const Empty = () => null;
const routes = { settings: Settings, profile: Profile, 'home-course': HomeCourse, handicap: Handicap, diagnostics: Empty, index: Empty, onboarding: Empty, 'sign-in': Empty };

beforeEach(resetStores);

describe('Settings', () => {
  it('turns crash reports off and back on', () => {
    renderScreens(routes, '/settings');
    expect(usePreferences.getState().crashReports).toBe(true);
    fireEvent(screen.getByLabelText('Crash reports'), 'valueChange', false);
    expect(usePreferences.getState().crashReports).toBe(false);
    fireEvent(screen.getByLabelText('Crash reports'), 'valueChange', true);
    expect(usePreferences.getState().crashReports).toBe(true);
  });

  it('shows usage analytics only when it is set up, and turns it on', () => {
    const first = renderScreens(routes, '/settings');
    expect(screen.queryByLabelText('Usage analytics')).toBeNull();
    first.unmount();
    process.env.EXPO_PUBLIC_APTABASE_KEY = 'A-US-0000000000';
    try {
      renderScreens(routes, '/settings');
      fireEvent(screen.getByLabelText('Usage analytics'), 'valueChange', true);
      expect(usePreferences.getState().analytics).toBe(true);
    } finally {
      delete process.env.EXPO_PUBLIC_APTABASE_KEY;
    }
  });

  it('sets what new rounds start with: the allowance and what points are called', async () => {
    renderScreens(routes, '/settings');
    fireEvent.press(screen.getByRole('button', { name: 'Handicap allowance, 100%' }));
    expect(lastActionSheet()?.options).toEqual(['100%', '95%', '90%', '85%', '75%', 'Cancel']);
    await pressAction('90%');
    expect(usePreferences.getState().defaultAllowance).toBe(90);
    fireEvent.press(screen.getByRole('tab', { name: 'Other' }));
    fireEvent.changeText(screen.getByLabelText('What the points are called'), 'beers');
    expect(usePreferences.getState().defaultStakeLabel).toBe('beers');
  });

  it('opens the privacy policy and support pages, and Diagnostics', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const r = renderScreens(routes, '/settings');
    fireEvent.press(screen.getByRole('button', { name: 'Read the privacy policy' }));
    expect(open).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    fireEvent.press(screen.getByRole('button', { name: 'Contact support' }));
    expect(open).toHaveBeenCalledWith(SUPPORT_URL);
    fireEvent.press(screen.getByRole('button', { name: /^Diagnostics/ }));
    expect(r.getPathname()).toBe('/diagnostics');
  });
});

describe('Profile', () => {
  it('names you, and shows your handicap index and home course', async () => {
    renderScreens(routes, '/profile');
    expect(screen.getByText('Your name')).toBeTruthy();
    fireEvent(screen.getByLabelText('Your name'), 'endEditing', { nativeEvent: { text: 'Alex Morgan' } });
    await waitFor(() => expect(useProfileStore.getState().profiles.map((p) => p.name)).toEqual(['Alex Morgan']));
    expect(screen.getByRole('button', { name: 'Home course, None' })).toBeTruthy();
  });

  it('home course is picked from saved courses', () => {
    const r = renderScreens(routes, '/home-course');
    fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${SAMPLE_COURSE.name}`) }));
    expect(usePreferences.getState().homeCourseId).toBe(SAMPLE_COURSE.id);
    expect(r.getPathname()).toBe('/profile');
  });

  it('the handicap sheet changes your index and keeps its history', async () => {
    saveMyName('Alex Morgan');
    renderScreens(routes, '/handicap');
    fireEvent(screen.getByLabelText('Handicap index'), 'endEditing', { nativeEvent: { text: '12.4' } });
    const me = () => useProfileStore.getState().profiles.find((p) => p.id === usePreferences.getState().meProfileId);
    await waitFor(() => expect(me()?.handicapIndex).toBe(12.4));
    expect(me()?.indexHistory.at(-1)?.index).toBe(12.4);
  });
});
