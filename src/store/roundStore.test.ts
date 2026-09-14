import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoundStore } from './roundStore';
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
  useRoundStore.setState({ round: null, recentPlayers: [], draft: { course: null, teeBoxId: null, players: [], holeCount: 18 } });
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
    expect(useRoundStore.getState().recentPlayers.map((p) => p.name)).toEqual(['Cody', 'Marcus']);
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

  it('clamps the current hole to the round length', () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftHoleCount(9);
    s.setDraftPlayers([cody]);
    s.startRound([]);
    useRoundStore.getState().setCurrentHole(12);
    expect(useRoundStore.getState().round?.currentHole).toBe(9);
    useRoundStore.getState().setCurrentHole(0);
    expect(useRoundStore.getState().round?.currentHole).toBe(1);
  });

  it('hydrates a persisted round after a relaunch', async () => {
    const s = useRoundStore.getState();
    s.setDraftCourse(cedarRidge, 'blue');
    s.setDraftPlayers([cody]);
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
    s.setDraftPlayers([cody]);
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
});
