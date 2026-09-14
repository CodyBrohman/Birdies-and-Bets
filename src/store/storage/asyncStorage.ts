import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from './adapter';

/** v1 implementation. MMKV drops in beside it once the project moves to a development build. */
export const asyncStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
