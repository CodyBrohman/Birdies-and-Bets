/**
 * Storage behind an interface from day one so swapping AsyncStorage for MMKV is a one-file change.
 * Everything is JSON-serializable; keys are namespaced by the caller.
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export const STORAGE_KEYS = {
  activeRound: 'bb:round:active',
  recentPlayers: 'bb:players:recent',
  recentCourses: 'bb:courses:recent',
  userCourses: 'bb:courses:user',
} as const;
