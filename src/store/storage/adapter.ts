/**
 * Storage behind an interface from day one so swapping AsyncStorage for MMKV is a one-file change.
 * Everything is JSON-serializable; keys are namespaced by the caller.
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Bump when the shape of any persisted value changes; add a migration in migrate.ts. */
export const SCHEMA_VERSION = 4;

export const STORAGE_KEYS = {
  schemaVersion: 'bb:schema',
  activeRound: 'bb:round:active',
  /** The round being set up (course, tees, players, games, tee time). Survives a restart; not synced. */
  draft: 'bb:round:draft',
  roundHistory: 'bb:rounds:history',
  /** Legacy (schema ≤ 2): seeded into profiles by the v3 migration, then removed. */
  recentPlayers: 'bb:players:recent',
  playerProfiles: 'bb:players:profiles',
  playerGroups: 'bb:players:groups',
  recentCourses: 'bb:courses:recent',
  userCourses: 'bb:courses:user',
  courseCache: 'bb:courses:cache',
  /** Legacy: the old light/dark choice. Nothing reads it; kept so backups and Clear all data still handle it. */
  themePreference: 'bb:theme:preference',
  preferences: 'bb:preferences',
} as const;
