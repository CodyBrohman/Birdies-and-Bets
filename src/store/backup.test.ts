import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllData, exportBackup, importBackup } from './backup';
import { SCHEMA_VERSION, STORAGE_KEYS } from './storage';
import { useHistoryStore } from './historyStore';
import { useCourseStore } from './courseStore';
import { useRoundStore } from './roundStore';
import { useProfileStore } from './profileStore';
import { parseBackup } from '../lib/backup';
import { useThemePreference } from '../theme/preference';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(async () => {
  await AsyncStorage.clear();
  useHistoryStore.setState({ entries: [], hydrated: false });
  useCourseStore.setState({ userCourses: [], recentIds: [], searchCache: {}, hydrated: false });
  useRoundStore.setState({ round: null });
  useProfileStore.setState({ profiles: [], groups: [] });
  useThemePreference.setState({ preference: 'system' });
});

describe('backup export / import', () => {
  it('exports every data key and restores it into the stores', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.playerProfiles, JSON.stringify([{ id: 'p', name: 'Pat', indexHistory: [], createdAt: 't' }]));
    await AsyncStorage.setItem(STORAGE_KEYS.themePreference, JSON.stringify('dark'));
    await AsyncStorage.setItem(STORAGE_KEYS.schemaVersion, JSON.stringify(SCHEMA_VERSION));
    const json = await exportBackup();
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.schema).toBe(SCHEMA_VERSION);
    expect(Object.keys(parsed.file.data).sort()).toEqual([STORAGE_KEYS.playerProfiles, STORAGE_KEYS.themePreference].sort());

    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEYS.userCourses, JSON.stringify([{ id: 'stale' }]));
    await importBackup(parsed.file);
    expect(useProfileStore.getState().profiles.map((p) => p.name)).toEqual(['Pat']);
    expect(useThemePreference.getState().preference).toBe('dark');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.userCourses)).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.schemaVersion)) ?? '0')).toBe(SCHEMA_VERSION);
  });

  it('migrates an older backup on import', async () => {
    await importBackup({ app: 'birdies-and-bets', schema: 1, exportedAt: 'x', data: { [STORAGE_KEYS.roundHistory]: [{ id: 'old', courseName: 'C', players: [], completedAt: 't' }] } });
    expect(useHistoryStore.getState().entries.map((e) => e.summary.id)).toEqual(['old']);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.schemaVersion)) ?? '0')).toBe(SCHEMA_VERSION);
  });

  it('refuses a backup from a newer app', async () => {
    await expect(importBackup({ app: 'birdies-and-bets', schema: SCHEMA_VERSION + 1, exportedAt: 'x', data: {} })).rejects.toThrow(/newer version/);
  });
});

describe('clearAllData', () => {
  it('removes rounds, history, courses and players but keeps theme and preferences', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.playerProfiles, JSON.stringify([{ id: 'p', name: 'Pat', indexHistory: [], createdAt: 't' }]));
    await AsyncStorage.setItem(STORAGE_KEYS.roundHistory, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.themePreference, JSON.stringify('dark'));
    await AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify({ haptics: false, defaultStakeLabel: '$', defaultAllowance: 90 }));
    useProfileStore.setState({ profiles: [{ id: 'p', name: 'Pat', indexHistory: [], createdAt: 't' }] });
    await clearAllData();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.playerProfiles)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.roundHistory)).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.themePreference)) ?? 'null')).toBe('dark');
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.preferences)) ?? 'null')).toEqual({ haptics: false, defaultStakeLabel: '$', defaultAllowance: 90 });
    // Stored as-is: clearAllData never rewrites preferences.
    expect(useProfileStore.getState().profiles).toEqual([]);
    expect(useHistoryStore.getState().entries).toEqual([]);
  });
});
