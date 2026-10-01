import { buildBackup, type BackupFile } from '@/lib/backup';
import { storage, SCHEMA_VERSION, STORAGE_KEYS } from './storage';
import { migrate } from './storage/migrate';
import { useRoundStore } from './roundStore';
import { useCourseStore } from './courseStore';
import { useHistoryStore } from './historyStore';
import { hydrateThemePreference } from './themeStore';
import { usePreferences } from './preferencesStore';
import { useProfileStore } from './profileStore';

const DATA_KEYS = Object.values(STORAGE_KEYS).filter((k) => k !== STORAGE_KEYS.schemaVersion);

/** Every persisted value as one JSON document. */
export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    const v = await storage.get<unknown>(key);
    if (v != null) data[key] = v;
  }
  return JSON.stringify(buildBackup(SCHEMA_VERSION, data));
}

/**
 * Replace everything on this phone with the backup, migrate it forward if it is older, and re-hydrate the stores.
 * Refuses a backup written by a newer app version.
 */
export async function importBackup(file: BackupFile): Promise<void> {
  if (file.schema > SCHEMA_VERSION) throw new Error('This backup was made with a newer version of the app. Update the app, then restore.');
  for (const key of DATA_KEYS) await storage.remove(key);
  for (const [key, value] of Object.entries(file.data)) {
    if (!(DATA_KEYS as string[]).includes(key)) continue;
    if (value != null) await storage.set(key, value);
  }
  await storage.set(STORAGE_KEYS.schemaVersion, file.schema);
  await migrate(storage);
  await Promise.all([useRoundStore.getState().hydrate(), useCourseStore.getState().hydrate(), useHistoryStore.getState().hydrate(), hydrateThemePreference(), usePreferences.getState().hydrate(), useProfileStore.getState().hydrate()]);
}

/** Settings-screen "Clear all data": every round, course and player. Theme and preferences stay. */
export async function clearAllData(): Promise<void> {
  const keep: string[] = [STORAGE_KEYS.themePreference, STORAGE_KEYS.preferences];
  for (const key of DATA_KEYS) if (!keep.includes(key)) await storage.remove(key);
  await Promise.all([useRoundStore.getState().hydrate(), useCourseStore.getState().hydrate(), useHistoryStore.getState().hydrate(), useProfileStore.getState().hydrate()]);
}
