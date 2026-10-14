// Crash reports (Sentry) and opt-in usage counts (Aptabase). The only file that touches either SDK.
// Rules: nothing is sent without a key, crash reports honour the Settings toggle, analytics needs an explicit yes,
// and no event ever carries a name, score, course or free text. The privacy policy lists exactly what is sent.
import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';
import { dispose as disposeAptabase, init as initAptabase, trackEvent } from '@aptabase/react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { usePreferences } from '@/store';
import type { Round } from '@/types';

export const PRIVACY_POLICY_URL = 'https://www.birdiesandbets.com/privacy.html';

/** Every event the app can send, with its allowed props. Counts and ids only. */
export interface TelemetryEvents {
  round_started: { holes: number; players: number; games: string; shotgun: boolean };
  round_finished: { holes_played: number; games: string };
  round_discarded: { holes_played: number };
  course_imported: Record<string, never>;
  course_created: Record<string, never>;
  scorecard_shared: Record<string, never>;
  backup_created: Record<string, never>;
  backup_restored: Record<string, never>;
}
export type TelemetryEvent = keyof TelemetryEvents;

export interface TelemetryKeys {
  sentryDsn?: string;
  aptabaseKey?: string;
}

/** Breadcrumb categories that can carry on-screen text (player names) and are never kept. */
const DROPPED_BREADCRUMBS = /^(console|touch|ui\.|xhr|fetch)/;

let sentryDsn: string | undefined;
let sentryOn = false;
let aptabaseKey: string | undefined;
let aptabaseOn = false;
let unsubscribe: (() => void) | undefined;

const appVersion = () => Constants.expoConfig?.version ?? '0.0.0';

/** Crash reports go out only once preferences are loaded and the toggle is on. */
function crashReportsAllowed(): boolean {
  const p = usePreferences.getState();
  return p.hydrated && p.crashReports;
}

/** Strip anything that could identify the person: user, request, device name, server name, extras. */
export function scrubEvent<E extends Sentry.ErrorEvent>(event: E): E | null {
  if (!crashReportsAllowed()) return null;
  delete event.user;
  delete event.request;
  delete event.server_name;
  delete event.extra;
  if (event.contexts?.device) delete (event.contexts.device as Record<string, unknown>).name;
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.filter((b) => !DROPPED_BREADCRUMBS.test(b.category ?? ''));
  return event;
}

export function scrubBreadcrumb(crumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  if (!crashReportsAllowed()) return null;
  return DROPPED_BREADCRUMBS.test(crumb.category ?? '') ? null : crumb;
}

function syncAnalytics() {
  const want = !!aptabaseKey && usePreferences.getState().analytics === true;
  if (want && !aptabaseOn) {
    initAptabase(aptabaseKey!, { appVersion: appVersion() });
    aptabaseOn = true;
  } else if (!want && aptabaseOn) {
    disposeAptabase();
    aptabaseOn = false;
  }
}

/**
 * Crash reports follow the toggle at the SDK level: Sentry starts only once preferences have loaded with crash reports
 * on, and closes when they are turned off. (A filter alone is not enough: native crashes are sent by the native SDK on
 * the next launch and never pass through JavaScript.) The cost is that a crash in the first moments of launch, before
 * preferences load, is not reported.
 */
function syncCrashReports() {
  const want = !!sentryDsn && crashReportsAllowed();
  if (want && !sentryOn) {
    Sentry.init({
      dsn: sentryDsn,
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableAutoSessionTracking: false,
      environment: Updates.channel || (__DEV__ ? 'development' : 'production'),
      release: `birdies-and-bets@${appVersion()}`,
      dist: Updates.updateId ?? 'embedded',
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    });
    sentryOn = true;
  } else if (!want && sentryOn) {
    void Sentry.close();
    sentryOn = false;
  }
}

/**
 * Start whatever has a key and is allowed. Safe to call more than once. Both follow the preferences from then on:
 * crash reports start, stop and start again with the toggle; Aptabase with the analytics answer.
 */
export function initTelemetry(keys: TelemetryKeys = { sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN, aptabaseKey: process.env.EXPO_PUBLIC_APTABASE_KEY }): void {
  sentryDsn = keys.sentryDsn || undefined;
  aptabaseKey = keys.aptabaseKey || undefined;
  syncCrashReports();
  syncAnalytics();
  unsubscribe ??= usePreferences.subscribe((s, prev) => {
    if (s.hydrated !== prev.hydrated || s.crashReports !== prev.crashReports) syncCrashReports();
    if (s.analytics !== prev.analytics) syncAnalytics();
  });
}

/** Whether the analytics question makes sense to ask: only when usage counts can actually be sent. */
export function analyticsAvailable(): boolean {
  return !!(aptabaseKey ?? process.env.EXPO_PUBLIC_APTABASE_KEY);
}

/** Send one usage event. A no-op unless the person said yes and a key is set. */
export function track<E extends TelemetryEvent>(event: E, ...props: TelemetryEvents[E] extends Record<string, never> ? [] : [TelemetryEvents[E]]): void {
  if (!aptabaseOn) return;
  trackEvent(event, props[0]);
}

/** A round just started: its shape, never who or where. */
export function trackRoundStarted(round: Round): void {
  track('round_started', { holes: round.settings.holeCount, players: round.players.length, games: round.games.map((g) => g.gameId).join(','), shotgun: round.settings.startHole != null });
}

/** Holes with any score, counted from the round itself. */
const scoredHoles = (round: Round) => round.holeResults.filter((r) => Object.keys(r.scores).length > 0).length;

export function trackRoundFinished(round: Round): void {
  track('round_finished', { holes_played: scoredHoles(round), games: round.games.map((g) => g.gameId).join(',') });
}

export function trackRoundDiscarded(round: Round): void {
  track('round_discarded', { holes_played: scoredHoles(round) });
}

/** Report a caught error (the root error screen). Dropped when crash reports are off. */
export function captureError(error: unknown): void {
  if (!sentryOn) return;
  Sentry.captureException(error);
}

/** Wrap the root component so native crashes and unhandled rejections are caught (a passthrough without a DSN). */
export function withCrashReporting(Root: ComponentType): ComponentType {
  return process.env.EXPO_PUBLIC_SENTRY_DSN ? (Sentry.wrap(Root as ComponentType<Record<string, unknown>>) as ComponentType) : Root;
}

/** Test hook: forget what was started. */
export function resetTelemetryForTests(): void {
  unsubscribe?.();
  unsubscribe = undefined;
  sentryDsn = undefined;
  sentryOn = false;
  aptabaseOn = false;
  aptabaseKey = undefined;
}
