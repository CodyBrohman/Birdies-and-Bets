import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageAdapter } from './asyncStorage';
import { migrate, promptAnswersToIds } from './migrate';
import { SCHEMA_VERSION, STORAGE_KEYS } from './adapter';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const storage = asyncStorageAdapter;
const version = async () => storage.get<number>(STORAGE_KEYS.schemaVersion);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('migrate', () => {
  it('stamps a fresh install without touching anything', async () => {
    const r = await migrate(storage);
    expect(r).toEqual({ from: SCHEMA_VERSION, to: SCHEMA_VERSION });
    expect(await version()).toBe(SCHEMA_VERSION);
    expect(await storage.get(STORAGE_KEYS.roundHistory)).toBeNull();
  });

  it('treats unstamped data as v1 and wraps history entries', async () => {
    await storage.set(STORAGE_KEYS.roundHistory, [{ id: 'a', courseName: 'X', players: [], completedAt: 'now' }]);
    const r = await migrate(storage);
    expect(r).toEqual({ from: 1, to: SCHEMA_VERSION });
    expect(await storage.get(STORAGE_KEYS.roundHistory)).toEqual([{ summary: { id: 'a', courseName: 'X', players: [], completedAt: 'now' } }]);
    expect(await version()).toBe(SCHEMA_VERSION);
  });

  it('is a no-op on a second run and idempotent on already-wrapped entries', async () => {
    await storage.set(STORAGE_KEYS.roundHistory, [{ summary: { id: 'a' } }]);
    await storage.set(STORAGE_KEYS.schemaVersion, 1);
    await migrate(storage);
    const once = await storage.get(STORAGE_KEYS.roundHistory);
    const r = await migrate(storage);
    expect(r.from).toBe(SCHEMA_VERSION);
    expect(await storage.get(STORAGE_KEYS.roundHistory)).toEqual(once);
    expect(once).toEqual([{ summary: { id: 'a' } }]);
  });

  it('seeds profiles from the recent-players list and removes it (v2 → v3)', async () => {
    await storage.set(STORAGE_KEYS.schemaVersion, 2);
    await storage.set(STORAGE_KEYS.recentPlayers, [{ id: 'p', name: 'Pat', handicapIndex: 8.2, teeBoxId: 'b' }, { id: 'q', name: 'pat ', teeBoxId: 'b' }, { id: 'r', name: '', teeBoxId: 'b' }]);
    const r = await migrate(storage);
    expect(r).toEqual({ from: 2, to: SCHEMA_VERSION });
    const profiles = (await storage.get<{ name: string; handicapIndex?: number; indexHistory: unknown[] }[]>(STORAGE_KEYS.playerProfiles)) ?? [];
    expect(profiles.map((p) => [p.name, p.handicapIndex, p.indexHistory.length])).toEqual([['Pat', 8.2, 1]]);
    expect(await storage.get(STORAGE_KEYS.recentPlayers)).toBeNull();
  });

  it('leaves data from a newer app version alone', async () => {
    await storage.set(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION + 5);
    await storage.set(STORAGE_KEYS.roundHistory, [{ future: true }]);
    const r = await migrate(storage);
    expect(r).toEqual({ from: SCHEMA_VERSION + 5, to: SCHEMA_VERSION + 5 });
    expect(await storage.get(STORAGE_KEYS.roundHistory)).toEqual([{ future: true }]);
    expect(await version()).toBe(SCHEMA_VERSION + 5);
  });

  it('v4: player prompts store ids instead of names, only where the name is unambiguous', async () => {
    const round = (inputs: Record<string, Record<string, string>>) => ({
      players: [
        { id: 'p1', name: 'Cody' },
        { id: 'p2', name: 'Sam' },
        { id: 'p3', name: 'Sam' },
      ],
      holeResults: [{ holeNumber: 1, scores: {}, gameInputs: inputs }],
    });
    await storage.set(STORAGE_KEYS.schemaVersion, 3);
    await storage.set(STORAGE_KEYS.activeRound, round({ wolf: { mode: 'With a partner', partner: 'Cody' }, 'bingo-bango-bongo': { bingo: 'Sam', bango: 'Cody' } }));
    await storage.set(STORAGE_KEYS.roundHistory, [{ summary: { id: 'h1' }, round: round({ wolf: { mode: 'Alone' } }) }]);
    await migrate(storage);
    const active = (await storage.get<ReturnType<typeof round>>(STORAGE_KEYS.activeRound))!;
    expect(active.holeResults[0]!.gameInputs).toEqual({
      wolf: { mode: 'With a partner', partner: 'p1' }, // choice answers ("With a partner") are not names
      'bingo-bango-bongo': { bingo: 'Sam', bango: 'p1' }, // two players called Sam: left as it was
    });
    expect(await version()).toBe(4);
  });

  it('v4 conversion leaves ids, unknown games and odd shapes alone', () => {
    const r = { players: [{ id: 'p1', name: 'Cody' }], holeResults: [{ holeNumber: 1, scores: {}, gameInputs: { wolf: { partner: 'p1' }, 'not-a-game': { partner: 'Cody' } } }] };
    expect(promptAnswersToIds(r)).toBe(r);
    expect(promptAnswersToIds(null)).toBeNull();
    expect(promptAnswersToIds({ players: 'nope' })).toEqual({ players: 'nope' });
  });
});
