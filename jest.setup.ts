// Global Jest setup. Pure-logic tests (lib/, games/) need nothing here.
// Component modules pull in Ionicons (and through it expo-font / expo-asset), which Jest cannot resolve; stub it.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
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
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));
// The real Sentry SDK starts a setInterval when imported, which keeps Jest workers alive; nothing is sent in tests anyway.
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), close: jest.fn(() => Promise.resolve()), captureException: jest.fn(), wrap: jest.fn((c: unknown) => c) }));
jest.mock('@aptabase/react-native', () => ({ init: jest.fn(), trackEvent: jest.fn(), dispose: jest.fn() }));

// Native-only controls: render accessible stand-ins so screen tests can query them by role, as VoiceOver would.
jest.mock('expo-symbols', () => ({ SymbolView: ({ fallback }: { fallback?: unknown }) => fallback ?? null }));
jest.mock('@react-native-segmented-control/segmented-control', () => ({ __esModule: true, default: require('./src/test/nativeControlMocks').MockSegmentedControl }));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: require('./src/test/nativeControlMocks').MockDateTimePicker,
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));
