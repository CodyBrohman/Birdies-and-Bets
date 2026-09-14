import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageAdapter } from './asyncStorage';
import { createMmkvAdapter } from './mmkv';
import { storage, storageBackend } from './index';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('storage adapters', () => {
  beforeEach(() => AsyncStorage.clear());

  it('AsyncStorage adapter round-trips JSON and tolerates junk', async () => {
    await asyncStorageAdapter.set('k', { a: 1 });
    expect(await asyncStorageAdapter.get<{ a: number }>('k')).toEqual({ a: 1 });
    await AsyncStorage.setItem('bad', '{not json');
    expect(await asyncStorageAdapter.get('bad')).toBeNull();
    await asyncStorageAdapter.remove('k');
    expect(await asyncStorageAdapter.get('k')).toBeNull();
  });

  it('MMKV adapter is unavailable without the native module and the app falls back', () => {
    // Under Jest there is no Nitro runtime, exactly like Expo Go.
    expect(createMmkvAdapter()).toBeNull();
    expect(storageBackend).toBe('async-storage');
    expect(storage).toBe(asyncStorageAdapter);
  });
});
