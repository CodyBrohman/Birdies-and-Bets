import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, sanitizePreferences, usePreferences } from './preferencesStore';
import { STORAGE_KEYS } from './storage';
import { useHapticsPreference } from '../theme/haptics';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  usePreferences.setState({ ...DEFAULT_PREFERENCES, hydrated: false });
  useHapticsPreference.setState({ enabled: true });
});

describe('sanitizePreferences', () => {
  it('fills defaults for junk', () => {
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ haptics: 'yes', defaultStakeLabel: 42, defaultAllowance: 33 })).toEqual(DEFAULT_PREFERENCES);
  });
  it('trims and caps the stake label', () => {
    expect(sanitizePreferences({ defaultStakeLabel: '  beers and more  ' }).defaultStakeLabel).toBe('beers an');
    expect(sanitizePreferences({ defaultStakeLabel: '   ' }).defaultStakeLabel).toBe('points');
  });
  it('keeps the profile extras: area, photo and known clubs in bag order', () => {
    const p = sanitizePreferences({ homeArea: '  Toronto, ON  ', photoUri: 'file:///me.jpg', bag: ['putter', 'driver', 'banana', 7] });
    expect(p.homeArea).toBe('Toronto, ON');
    expect(p.photoUri).toBe('file:///me.jpg');
    expect(p.bag).toEqual(['driver', 'putter']);
    expect(sanitizePreferences({ homeArea: '   ', photoUri: 3, bag: 'driver' })).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('privacy preferences', () => {
  it('crash reports default on, analytics stays unasked until a real answer', () => {
    expect(sanitizePreferences(null).crashReports).toBe(true);
    expect(sanitizePreferences(null).analytics).toBeUndefined();
    expect(sanitizePreferences({ crashReports: 'no', analytics: 'yes' })).toEqual(DEFAULT_PREFERENCES);
    const p = sanitizePreferences({ crashReports: false, analytics: false });
    expect([p.crashReports, p.analytics]).toEqual([false, false]);
  });

  it('persists the answers', async () => {
    await usePreferences.getState().hydrate();
    usePreferences.getState().update({ crashReports: false, analytics: true });
    await flush();
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.preferences)) ?? 'null');
    expect([saved.crashReports, saved.analytics]).toEqual([false, true]);
    usePreferences.getState().reset();
  });
});

describe('preferencesStore', () => {
  it('clears an optional field when patched empty', async () => {
    await usePreferences.getState().hydrate();
    usePreferences.getState().update({ homeArea: 'Maple, ON', bag: ['driver'] });
    expect(usePreferences.getState().homeArea).toBe('Maple, ON');
    usePreferences.getState().update({ homeArea: undefined });
    await flush();
    expect(usePreferences.getState().homeArea).toBeUndefined();
    expect(usePreferences.getState().bag).toEqual(['driver']);
    usePreferences.getState().reset();
  });

  it('hydrates saved values and pushes haptics into the theme layer', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify({ haptics: false, defaultStakeLabel: '$', defaultAllowance: 90 }));
    await usePreferences.getState().hydrate();
    const s = usePreferences.getState();
    expect([s.haptics, s.defaultStakeLabel, s.defaultAllowance, s.hydrated]).toEqual([false, '$', 90, true]);
    expect(useHapticsPreference.getState().enabled).toBe(false);
  });

  it('persists updates', async () => {
    await usePreferences.getState().hydrate();
    usePreferences.getState().update({ defaultAllowance: 85, haptics: false });
    await flush();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.preferences)) ?? 'null')).toEqual({ haptics: false, defaultStakeLabel: 'points', defaultAllowance: 85, onboarded: false, crashReports: true });
    expect(useHapticsPreference.getState().enabled).toBe(false);
  });

  it('stores and clears the me profile', async () => {
    usePreferences.getState().update({ meProfileId: 'pr_1' });
    expect(usePreferences.getState().meProfileId).toBe('pr_1');
    usePreferences.getState().update({ meProfileId: undefined });
    expect(usePreferences.getState().meProfileId).toBeUndefined();
    expect(sanitizePreferences({ meProfileId: 7 }).meProfileId).toBeUndefined();
  });

  it('reset restores defaults and clears storage', async () => {
    usePreferences.getState().update({ haptics: false });
    await flush();
    usePreferences.getState().reset();
    await flush();
    expect(usePreferences.getState().haptics).toBe(true);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.preferences)).toBeNull();
  });
});
