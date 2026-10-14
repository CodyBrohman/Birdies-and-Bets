// Helpers for screen tests: seed the stores the way the app would, then render real screens through Expo Router.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ComponentType } from 'react';
import { ActionSheetIOS, Alert, type AlertButton } from 'react-native';
import { act } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS, useAuthStore, useHistoryStore, usePreferences, useProfileStore, useRoundStore, useSyncStatus, type Preferences } from '@/store';
import { cedarRidge, cody, marcus } from '@/lib/__fixtures__/cedarRidge';
import type { ActiveGame, GrossScore, Player, Round } from '@/types';

export { cedarRidge, cody, marcus };

/** A clean slate: no round, no draft, default preferences (loaded and onboarded, analytics answered), no account. */
export async function resetStores(): Promise<void> {
  await AsyncStorage.clear();
  useProfileStore.setState({ profiles: [], groups: [] });
  useHistoryStore.setState({ entries: [] });
  useRoundStore.setState({ round: null, undo: [], draft: { course: null, teeBoxId: null, players: [], settings: { ...DEFAULT_SETTINGS }, games: [] } });
  usePreferences.setState({ ...DEFAULT_PREFERENCES, onboarded: true, analytics: false, meProfileId: undefined, hydrated: true });
  // Local-only by default (as with no backend keys); account tests sign in explicitly.
  useAuthStore.setState({ status: 'disabled', sessionExpired: false, pendingSwitch: undefined, userId: undefined, email: undefined, method: undefined });
  useSyncStatus.setState({ phase: 'idle', pending: 0, rejected: 0, authPaused: false, lastSyncedAt: undefined, error: undefined });
  alertSpy.mockClear();
  sheetSpy.mockClear();
}

// Native alerts (confirm/ask) render nothing in Jest: record them, and let a test press a button by its label.
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

/** The most recent native alert: its title, message and button labels. */
export function lastAlert(): { title: string; message?: string; buttons: string[] } | undefined {
  const call = alertSpy.mock.calls.at(-1);
  if (!call) return undefined;
  const [title, message, buttons] = call;
  return { title, message, buttons: ((buttons ?? []) as AlertButton[]).map((b) => b.text ?? '') };
}

// Native action sheets (long-press menus) likewise.
type SheetOptions = { options: string[]; title?: string };
const sheetSpy = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);

/** The options of the most recent action sheet (Cancel last). */
export function lastActionSheet(): { title?: string; options: string[] } | undefined {
  const call = sheetSpy.mock.calls.at(-1);
  return call ? { title: (call[0] as SheetOptions).title, options: (call[0] as SheetOptions).options } : undefined;
}

/** Choose an option on the most recent action sheet, and let what it does settle (await it). */
export async function pressAction(label: string): Promise<void> {
  const call = sheetSpy.mock.calls.at(-1);
  if (!call) throw new Error('No action sheet was shown');
  const index = (call[0] as SheetOptions).options.indexOf(label);
  if (index < 0) throw new Error(`No "${label}" in the action sheet (${(call[0] as SheetOptions).options.join(', ')})`);
  await act(async () => {
    (call[1] as (i: number) => void)(index);
  });
}

/** Press a button on the most recent native alert, as the person would. */
export function pressAlert(label: string): void {
  const buttons = (alertSpy.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  const button = buttons.find((b) => b.text === label);
  if (!button) throw new Error(`No "${label}" on the last alert (${lastAlert()?.buttons.join(', ') ?? 'none shown'})`);
  button.onPress?.();
}

export function seedPrefs(patch: Partial<Preferences>): void {
  usePreferences.setState({ ...patch, hydrated: true });
}

export interface SeedRound {
  players?: Player[];
  games?: ActiveGame[];
  /** holeNumber → playerId → score, recorded in order. */
  scores?: Record<number, Record<string, GrossScore>>;
  currentHole?: number;
}

/** Start a real round on Cedar Ridge (blue tees) through the store, then record scores and move to a hole. */
export function seedRound({ players = [cody, marcus], games = [], scores = {}, currentHole }: SeedRound = {}): Round {
  const s = useRoundStore.getState();
  s.setDraftCourse(cedarRidge, 'blue');
  s.setDraftPlayers(players);
  const round = useRoundStore.getState().startRound(games);
  if (!round) throw new Error('seedRound: the round did not start');
  for (const [hole, byPlayer] of Object.entries(scores)) useRoundStore.getState().recordHole(Number(hole), byPlayer);
  if (currentHole != null) useRoundStore.getState().setCurrentHole(currentHole);
  return useRoundStore.getState().round!;
}

/** Render a set of screens as routes (path without leading slash → component) starting at `url`. */
export function renderScreens(routes: Record<string, ComponentType>, url: string) {
  return renderRouter(routes, { initialUrl: url });
}
