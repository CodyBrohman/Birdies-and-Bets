import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryEntry, Round } from '@/types';
import { getGame, runGame } from '@/games';
import { wolfFor } from '@/games/wolf';
import { teeTimeIsStale } from '@/lib/teeTime';
import { demoData, seedDemoData } from './demo';
import { useCourseStore } from './courseStore';
import { useHistoryStore } from './historyStore';
import { usePreferences } from './preferencesStore';
import { useProfileStore } from './profileStore';
import { useRoundStore } from './roundStore';
import { STORAGE_KEYS, migrate, storage } from './storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const NOW = new Date(2026, 9, 14, 9, 41);

beforeEach(async () => {
  await AsyncStorage.clear();
});

async function hydrateAll() {
  await usePreferences.getState().hydrate();
  await Promise.all([useRoundStore.getState().hydrate(), useHistoryStore.getState().hydrate(), useProfileStore.getState().hydrate(), useCourseStore.getState().hydrate()]);
}

describe('demo data', () => {
  it('fills a fresh install, and every store reads it back', async () => {
    await migrate(storage);
    expect(await seedDemoData(storage, NOW)).toBe(true);
    await hydrateAll();

    const prefs = usePreferences.getState();
    expect(prefs.onboarded).toBe(true);
    expect(prefs.meProfileId).toBe('pr_demo_alex');
    expect(prefs.reviewPrompted).toBe(true);
    expect(useProfileStore.getState().profiles).toHaveLength(5);
    expect(useProfileStore.getState().groups).toHaveLength(1);
    expect(useCourseStore.getState().byId(prefs.homeCourseId!)?.name).toBe('Heronmere Golf Club');

    const { round, draft, hydrateError } = useRoundStore.getState();
    expect(hydrateError).toBeNull();
    expect(round?.status).toBe('in-progress');
    expect(round?.currentHole).toBe(17);
    expect(round?.holeResults).toHaveLength(17);
    expect(round?.holeResults.every((h) => Object.keys(h.scores).length === 4)).toBe(true);
    expect(draft.course?.name).toBe('Maple Hollow Golf Club');
    expect(draft.players).toHaveLength(4);
    expect(draft.games.map((g) => g.gameId)).toEqual(['skins', 'nassau']);
    expect(draft.settings.teeTime && !teeTimeIsStale(draft.settings.teeTime, NOW)).toBe(true);

    const entries = useHistoryStore.getState().entries;
    expect(entries.map((e) => e.summary.id)).toEqual(['r_demo_1', 'r_demo_2', 'r_demo_3']);
    for (const e of entries) {
      expect(e.summary.holesScored).toBe(18);
      expect(e.summary.players).toHaveLength(e.round!.players.length);
      expect(e.summary.resultLabel).not.toBe('');
    }
  });

  it('never writes over data that is already there', async () => {
    await storage.set(STORAGE_KEYS.preferences, { onboarded: true });
    expect(await seedDemoData(storage, NOW)).toBe(false);
    expect(await storage.get(STORAGE_KEYS.roundHistory)).toBeNull();
    expect(await storage.get(STORAGE_KEYS.activeRound)).toBeNull();
  });

  it('looks like real golf: birdie to triple on every hole, and no two rounds with the same total', () => {
    const data = demoData(NOW);
    const rounds = [...(data[STORAGE_KEYS.roundHistory] as HistoryEntry[]).map((e) => e.round!), data[STORAGE_KEYS.activeRound] as Round];
    for (const r of rounds)
      for (const h of r.holeResults) {
        const par = r.course.holes.find((x) => x.number === h.holeNumber)!.par;
        for (const s of Object.values(h.scores)) {
          expect(s! - par).toBeGreaterThanOrEqual(-1);
          expect(s! - par).toBeLessThanOrEqual(3);
        }
      }
    const alexTotals = (data[STORAGE_KEYS.roundHistory] as HistoryEntry[]).map((e) => e.summary.players[0]!.gross);
    expect(new Set(alexTotals).size).toBe(alexTotals.length);
  });

  it('plays the live round through the real games: the wolf never partners itself', () => {
    const live = demoData(NOW)[STORAGE_KEYS.activeRound] as Round;
    const ids = live.players.map((p) => p.id);
    for (const [i, hole] of live.holeResults.entries()) {
      const answer = hole.gameInputs?.wolf;
      expect(answer?.mode).toMatch(/^(Alone|With a partner)$/);
      if (answer?.mode === 'With a partner') expect(answer.partner).not.toBe(wolfFor(ids, i + 1));
    }
    for (const g of live.games) {
      const run = runGame(live, g, getGame(g.gameId)!);
      expect(run.standings.headline).toBeTruthy();
      expect(run.standings.headline).not.toMatch(/undefined|NaN/);
    }
  });
});
