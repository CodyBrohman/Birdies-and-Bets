import type { StorageAdapter } from './adapter';

/**
 * MMKV implementation. Synchronous under the hood, so a write per stepper tap is free.
 * Needs a development build (native module). Returns null in Expo Go, where the caller falls back
 * to AsyncStorage. The dynamic require keeps Expo Go from crashing at import time.
 */
export function createMmkvAdapter(): StorageAdapter | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-mmkv') as { createMMKV: (cfg?: { id?: string }) => MmkvLike };
    const store = mod.createMMKV({ id: 'birdies-and-bets' });
    // Round-trip probe: a missing native module throws here rather than later, mid-round.
    store.set('bb:probe', '1');
    store.remove('bb:probe');
    return {
      async get<T>(key: string): Promise<T | null> {
        const raw = store.getString(key);
        if (raw == null) return null;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return null;
        }
      },
      async set<T>(key: string, value: T): Promise<void> {
        store.set(key, JSON.stringify(value));
      },
      async remove(key: string): Promise<void> {
        store.remove(key);
      },
    };
  } catch {
    return null;
  }
}

interface MmkvLike {
  set(key: string, value: string): void;
  getString(key: string): string | undefined;
  remove(key: string): boolean;
}
