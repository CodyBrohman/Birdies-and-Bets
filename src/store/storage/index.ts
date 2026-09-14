import { Platform } from 'react-native';
import type { StorageAdapter } from './adapter';
import { asyncStorageAdapter } from './asyncStorage';
import { createMmkvAdapter } from './mmkv';

export * from './adapter';

/**
 * MMKV on a development or production build; AsyncStorage in Expo Go and on web.
 * Both persist under the same keys, so the swap is invisible to the stores.
 */
export const storage: StorageAdapter = (Platform.OS !== 'web' ? createMmkvAdapter() : null) ?? asyncStorageAdapter;

export const storageBackend: 'mmkv' | 'async-storage' = storage === asyncStorageAdapter ? 'async-storage' : 'mmkv';
