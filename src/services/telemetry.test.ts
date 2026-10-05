import type { ErrorEvent } from '@sentry/react-native';
import { DEFAULT_PREFERENCES, usePreferences } from '@/store';
import { captureError, initTelemetry, resetTelemetryForTests, scrubBreadcrumb, scrubEvent, track } from './telemetry';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), captureException: jest.fn(), wrap: jest.fn((c: unknown) => c) }));
jest.mock('@aptabase/react-native', () => ({ init: jest.fn(), trackEvent: jest.fn(), dispose: jest.fn() }));
jest.mock('expo-updates', () => ({ channel: 'test', updateId: null }));

const Sentry = jest.requireMock('@sentry/react-native') as { init: jest.Mock; captureException: jest.Mock };
const Aptabase = jest.requireMock('@aptabase/react-native') as { init: jest.Mock; trackEvent: jest.Mock; dispose: jest.Mock };

const KEYS = { sentryDsn: 'https://key@o0.ingest.sentry.io/1', aptabaseKey: 'A-US-0000000000' };

beforeEach(() => {
  jest.clearAllMocks();
  resetTelemetryForTests();
  usePreferences.setState({ ...DEFAULT_PREFERENCES, analytics: undefined, hydrated: true });
});

const event = (): ErrorEvent =>
  ({
    type: undefined,
    user: { id: 'x' },
    server_name: "Cody's iPhone",
    extra: { note: 'birdie' },
    contexts: { device: { name: "Cody's iPhone", model: 'iPhone16,1' } },
    breadcrumbs: [
      { category: 'console', message: 'Cody 4' },
      { category: 'touch', message: 'Cody: 4, par' },
      { category: 'navigation', data: { to: '/round/play' } },
    ],
  }) as ErrorEvent;

describe('telemetry', () => {
  it('does nothing without keys', () => {
    initTelemetry({});
    usePreferences.setState({ analytics: true });
    track('backup_created');
    captureError(new Error('x'));
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Aptabase.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('sends no usage events until the person says yes, and stops when they say no', () => {
    initTelemetry(KEYS);
    track('backup_created');
    expect(Aptabase.init).not.toHaveBeenCalled();
    expect(Aptabase.trackEvent).not.toHaveBeenCalled();

    usePreferences.setState({ analytics: true });
    track('round_started', { holes: 18, players: 2, games: 'skins', shotgun: false });
    expect(Aptabase.init).toHaveBeenCalledWith(KEYS.aptabaseKey, expect.any(Object));
    expect(Aptabase.trackEvent).toHaveBeenCalledWith('round_started', { holes: 18, players: 2, games: 'skins', shotgun: false });

    usePreferences.setState({ analytics: false });
    expect(Aptabase.dispose).toHaveBeenCalled();
    track('backup_created');
    expect(Aptabase.trackEvent).toHaveBeenCalledTimes(1);
  });

  it('starts Sentry with no PII, screenshots or sessions', () => {
    initTelemetry(KEYS);
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: KEYS.sentryDsn, sendDefaultPii: false, attachScreenshot: false, attachViewHierarchy: false, enableAutoSessionTracking: false }));
  });

  it('strips identifying fields and text-bearing breadcrumbs', () => {
    const out = scrubEvent(event())!;
    expect(out.user).toBeUndefined();
    expect(out.server_name).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.contexts?.device).toEqual({ model: 'iPhone16,1' });
    expect(out.breadcrumbs?.map((b) => b.category)).toEqual(['navigation']);
    expect(scrubBreadcrumb({ category: 'touch' })).toBeNull();
    expect(scrubBreadcrumb({ category: 'navigation' })).not.toBeNull();
  });

  it('drops crash reports when the toggle is off or preferences have not loaded', () => {
    usePreferences.setState({ crashReports: false });
    expect(scrubEvent(event())).toBeNull();
    usePreferences.setState({ crashReports: true, hydrated: false });
    expect(scrubEvent(event())).toBeNull();
    expect(scrubBreadcrumb({ category: 'navigation' })).toBeNull();
  });
});
