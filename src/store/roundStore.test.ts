import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, MAX_UNDO, useRoundStore } from './roundStore';
import { useProfileStore } from './profileStore';
import { STORAGE_KEYS } from './storage';
import { cedarRidge, cody, marcus } from '../lib/__fixtures__/cedarRidge';
import type { Round } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const flush = () => new Promise((r) => setTimeout(r, 0));

async function persisted(): Promise<Round | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.activeRound);
  return raw ? (JSON.parse(raw) as Round) : null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  useProfileStore.setState({ profiles: [], groups: [] });
  useRoundStore.setState({ round: null, draft: { course: null, teeBoxId: null, players: [], settings: { ...DEFAULT_SETTINGS } } });
});

describe('roundStore', () => {
  it('starts a round from the draft and persists it', async () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus]);
    const round = useRoundStore.getState().startRound([]);
    expect(round).not.toBeNull();
    expect(round?.players).toHaveLength(2);
    expect(round?.currentHole).toBe(1);
    await flush();
    expect((await persisted())?.id).toBe(round?.id);
    expect(useProfileStore.getState().profiles.map((p) => p.name)).toEqual(['Cody', 'Marcus']);
    expect(round?.players.every((p) => p.profileId)).toBe(true);
  });

  it('refuses to start without a course or named players', () => {
    const s = useRoundStore.getState();
    expect(s.startRound([])).toBeNull();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([{ ...cody, name: '   ' }]);
    expect(useRoundStore.getState().startRound([])).toBeNull();
  });

  it('persists on every score entry and supports pick-ups and edits', async () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus]);
    s.startRound([]);
    useRoundStore.getState().setScore('cody', 1, 5);
    await flush();
    expect((await persisted())?.holeResults).toEqual([{ holeNumber: 1, scores: { cody: 5 } }]);

    useRoundStore.getState().setScore('marcus', 1, null);
    useRoundStore.getState().setScore('cody', 1, 4); // retroactive edit
    useRoundStore.getState().recordHole(3, { cody: 3, marcus: 4 });
    await flush();
    const r = await persisted();
    expect(r?.holeResults).toEqual([
      { holeNumber: 1, scores: { cody: 4, marcus: null } },
      { holeNumber: 3, scores: { cody: 3, marcus: 4 } },
    ]);
  });

  it('ignores holes that are not in play', () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftSettings({ holeCount: 9 });
    s.setDraftPlayers([cody, marcus]);
    s.startRound([]);
    useRoundStore.getState().setCurrentHole(12);
    expect(useRoundStore.getState().round?.currentHole).toBe(1);
    useRoundStore.getState().setCurrentHole(0);
    expect(useRoundStore.getState().round?.currentHole).toBe(1);
    useRoundStore.getState().setCurrentHole(7);
    expect(useRoundStore.getState().round?.currentHole).toBe(7);
  });

  it('starts with one to four named players (a solo round is fine)', () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody]);
    expect(useRoundStore.getState().startRound([])?.players).toHaveLength(1);
    useRoundStore.getState().discardRound();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus, { ...cody, id: 'a', name: 'A' }, { ...cody, id: 'b', name: 'B' }, { ...cody, id: 'c', name: 'C' }]);
    expect(useRoundStore.getState().startRound([])).toBeNull();
  });

  it('starts on the back nine at hole 10 and on the shotgun hole otherwise', () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus]);
    s.setDraftSettings({ holeCount: 9, nine: 'back' });
    expect(useRoundStore.getState().startRound([])?.currentHole).toBe(10);
    useRoundStore.getState().setCurrentHole(3);
    expect(useRoundStore.getState().round?.currentHole).toBe(10);
    useRoundStore.getState().discardRound();

    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus]);
    s.setDraftSettings({ holeCount: 18, startHole: 14 });
    const r = useRoundStore.getState().startRound([]);
    expect(r?.currentHole).toBe(14);
    expect(r?.settings.startHole).toBe(14);
    useRoundStore.getState().discardRound();

    // A start hole outside the nine in play is dropped.
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus]);
    s.setDraftSettings({ holeCount: 9, nine: 'front', startHole: 14 });
    const r2 = useRoundStore.getState().startRound([]);
    expect(r2?.currentHole).toBe(1);
    expect(r2?.settings.startHole).toBeUndefined();
  });

  it('locks hole count, nine and start hole once a score exists', () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus]);
    s.startRound([]);
    useRoundStore.getState().updateSettings({ stakeLabel: '$', allowance: 90, startHole: 5 });
    expect(useRoundStore.getState().round?.settings).toMatchObject({ stakeLabel: '$', allowance: 90, startHole: 5 });
    useRoundStore.getState().setScore('cody', 5, 4);
    useRoundStore.getState().updateSettings({ stakeLabel: 'beers', holeCount: 9, startHole: 9 });
    expect(useRoundStore.getState().round?.settings).toMatchObject({ stakeLabel: 'beers', holeCount: 18, startHole: 5 });
  });

  it('hydrates a persisted round after a relaunch', async () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus]);
    const round = s.startRound([]);
    useRoundStore.getState().setScore('cody', 1, 5);
    await flush();
    // Simulate a fresh process: wipe memory, keep storage.
    useRoundStore.setState({ round: null, hydrated: false });
    await useRoundStore.getState().hydrate();
    expect(useRoundStore.getState().hydrated).toBe(true);
    expect(useRoundStore.getState().round?.id).toBe(round?.id);
    expect(useRoundStore.getState().round?.holeResults[0]?.scores.cody).toBe(5);
  });

  it('finishing then discarding clears storage', async () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody, marcus]);
    s.startRound([]);
    useRoundStore.getState().finishRound();
    expect(useRoundStore.getState().round?.status).toBe('complete');
    useRoundStore.getState().discardRound();
    await flush();
    expect(await persisted()).toBeNull();
  });
});

describe('roundStore hydration resilience', () => {
  it('clears an unreadable saved round and reports it instead of crashing', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.activeRound, JSON.stringify({ id: 'r', players: 'nope' }));
    useRoundStore.setState({ round: null, hydrated: false, hydrateError: null });
    await useRoundStore.getState().hydrate();
    expect(useRoundStore.getState().hydrated).toBe(true);
    expect(useRoundStore.getState().round).toBeNull();
    expect(useRoundStore.getState().hydrateError).toMatch(/unreadable/);
    await flush();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.activeRound)).toBeNull();
  });

  describe('undo, batch scores and notes', () => {
    const start = () => {
      const s = useRoundStore.getState();
      s.setDraftCourse(cedarRidge, 'blue');
      s.setDraftPlayers([cody, marcus]);
      s.startRound([]);
    };
    const scoresOn = (hole: number) => useRoundStore.getState().round?.holeResults.find((h) => h.holeNumber === hole)?.scores;

    it('undoes the last change, removing a first entry and restoring an edit', () => {
      start();
      expect(useRoundStore.getState().undo).toEqual([]);
      useRoundStore.getState().setScore('cody', 1, 5);
      useRoundStore.getState().setScore('cody', 1, 4);
      expect(useRoundStore.getState().undoLastScore()).toEqual({ holeNumber: 1, previous: { cody: 5 } });
      expect(scoresOn(1)).toEqual({ cody: 5 });
      useRoundStore.getState().undoLastScore();
      expect(scoresOn(1)).toEqual({});
      expect(useRoundStore.getState().undoLastScore()).toBeNull();
    });

    it('returns to the hole it undoes on and caps the stack', () => {
      start();
      useRoundStore.getState().setScore('cody', 1, 4);
      useRoundStore.getState().setCurrentHole(2);
      useRoundStore.getState().undoLastScore();
      expect(useRoundStore.getState().round?.currentHole).toBe(1);
      for (let i = 0; i < MAX_UNDO + 5; i++) useRoundStore.getState().setScore('cody', 1, 3 + (i % 3));
      expect(useRoundStore.getState().undo).toHaveLength(MAX_UNDO);
    });

    it('setScores fills several players as one undo step', () => {
      start();
      useRoundStore.getState().setScore('cody', 3, 6);
      useRoundStore.getState().setScores(3, { cody: 4, marcus: 4 });
      expect(scoresOn(3)).toEqual({ cody: 4, marcus: 4 });
      useRoundStore.getState().undoLastScore();
      expect(scoresOn(3)).toEqual({ cody: 6 });
    });

    it('clears the stack when a new round starts or the round is discarded', () => {
      start();
      useRoundStore.getState().setScore('cody', 1, 4);
      useRoundStore.getState().discardRound();
      expect(useRoundStore.getState().undo).toEqual([]);
      start();
      useRoundStore.getState().setScore('cody', 1, 4);
      useRoundStore.setState({ draft: { course: cedarRidge, teeBoxId: 'blue', players: [cody, marcus], settings: { ...DEFAULT_SETTINGS } } });
      useRoundStore.getState().startRound([]);
      expect(useRoundStore.getState().undo).toEqual([]);
    });

    it('stores a trimmed, capped note and removes it when blank', async () => {
      start();
      useRoundStore.getState().setHoleNote(7, '  Lost ball left  ');
      await flush();
      expect((await persisted())?.holeResults).toEqual([{ holeNumber: 7, scores: {}, note: 'Lost ball left' }]);
      useRoundStore.getState().setHoleNote(7, 'x'.repeat(200));
      expect(useRoundStore.getState().round?.holeResults[0].note).toHaveLength(140);
      useRoundStore.getState().setHoleNote(7, '   ');
      expect(useRoundStore.getState().round?.holeResults[0]).toEqual({ holeNumber: 7, scores: {} });
    });
  });
});
