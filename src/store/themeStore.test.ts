import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydrateThemePreference } from './themeStore';
import { STORAGE_KEYS } from './storage';
import { useThemePreference } from '../theme/preference';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  useThemePreference.setState({ preference: 'system' });
});

describe('themeStore', () => {
  it('hydrates a saved preference', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.themePreference, JSON.stringify('dark'));
    await hydrateThemePreference();
    expect(useThemePreference.getState().preference).toBe('dark');
  });

  it('ignores junk and stays on system', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.themePreference, JSON.stringify('purple'));
    await hydrateThemePreference();
    expect(useThemePreference.getState().preference).toBe('system');
  });

  it('persists changes after hydration', async () => {
    await hydrateThemePreference();
    useThemePreference.getState().setPreference('light');
    await flush();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.themePreference)) ?? 'null')).toBe('light');
  });
});
