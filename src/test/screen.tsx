// Helpers for screen tests: seed the stores the way the app would, then render real screens through Expo Router.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ComponentType } from 'react';
import { renderRouter } from 'expo-router/testing-library';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS, useHistoryStore, usePreferences, useProfileStore, useRoundStore, type Preferences } from '@/store';
import { cedarRidge, cody, marcus } from '@/lib/__fixtures__/cedarRidge';
import type { ActiveGame, GrossScore, Player, Round } from '@/types';

export { cedarRidge, cody, marcus };

/** A clean slate: no round, no draft, default preferences (loaded and onboarded, analytics answered). */
export async function resetStores(): Promise<void> {
  await AsyncStorage.clear();
  useProfileStore.setState({ profiles: [], groups: [] });
  useHistoryStore.setState({ entries: [] });
  useRoundStore.setState({ round: null, undo: [], draft: { course: null, teeBoxId: null, players: [], settings: { ...DEFAULT_SETTINGS } } });
  usePreferences.setState({ ...DEFAULT_PREFERENCES, onboarded: true, analytics: false, meProfileId: undefined, hydrated: true });
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
