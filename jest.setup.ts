// Global Jest setup. Pure-logic tests (lib/, games/) need nothing here.
// Component modules pull in Ionicons (and through it expo-font / expo-asset), which Jest cannot resolve; stub it.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
export {};
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(() => Promise.resolve('file:///tmp/card.png')) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(() => Promise.resolve(true)), shareAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: null })) }));
jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists = false;
    constructor(uri: string) {
      this.uri = uri;
    }
    write() {}
    delete() {}
    text() {
      return Promise.resolve('');
    }
  }
  return { File: MockFile, Paths: { cache: 'file:///cache' } };
});

// Screen tests (src/test/screens) render real screens: storage, safe areas, keep-awake and updates need stand-ins.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn(), activateKeepAwakeAsync: jest.fn(), deactivateKeepAwake: jest.fn() }));
jest.mock('expo-updates', () => ({ channel: 'test', updateId: null, isEmbeddedLaunch: true }));
