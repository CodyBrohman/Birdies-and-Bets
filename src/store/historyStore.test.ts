import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_HISTORY, useHistoryStore } from './historyStore';
import { STORAGE_KEYS } from './storage';
import type { HistoryEntry, RoundSummary } from '../types';
import { makeRound } from '../games/__fixtures__/round';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const flush = () => new Promise((r) => setTimeout(r, 0));

function summary(id: string): RoundSummary {
  return {
    id,
    completedAt: '2026-09-22T18:00:00Z',
    courseName: 'Cedar Ridge Golf Club',
    teeName: 'Blue',
    holeCount: 18,
    gameNames: ['Nassau'],
    players: [{ id: 'cody', name: 'Cody', gross: 82, net: 74, grossToPar: 10, playingHandicap: 8, holesPickedUp: 0 }],
    leaderId: 'cody',
    resultLabel: '+12 pts',
  };
}
const entry = (id: string, withRound = true): HistoryEntry => ({ summary: summary(id), round: withRound ? { ...makeRound(), id, status: 'complete' } : undefined });

beforeEach(async () => {
  await AsyncStorage.clear();
  useHistoryStore.setState({ entries: [], hydrated: false });
});

describe('historyStore', () => {
  it('prepends full entries and persists them', async () => {
    useHistoryStore.getState().add(entry('a'));
    useHistoryStore.getState().add(entry('b'));
    expect(useHistoryStore.getState().entries.map((e) => e.summary.id)).toEqual(['b', 'a']);
    await flush();
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.roundHistory)) ?? '[]') as HistoryEntry[];
    expect(saved.map((e) => e.summary.id)).toEqual(['b', 'a']);
    expect(saved[0]?.round?.status).toBe('complete');
  });

  it('caps the list and de-duplicates by id', () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) useHistoryStore.getState().add(entry(`r${i}`));
    expect(useHistoryStore.getState().entries).toHaveLength(MAX_HISTORY);
    useHistoryStore.getState().add(entry(`r${MAX_HISTORY + 4}`));
    expect(useHistoryStore.getState().entries).toHaveLength(MAX_HISTORY);
  });

  it('removes a round and persists the shorter list', async () => {
    useHistoryStore.getState().add(entry('a'));
    useHistoryStore.getState().add(entry('b'));
    useHistoryStore.getState().remove('a');
    expect(useHistoryStore.getState().entries.map((e) => e.summary.id)).toEqual(['b']);
    await flush();
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.roundHistory)) ?? '[]') as HistoryEntry[];
    expect(saved.map((e) => e.summary.id)).toEqual(['b']);
  });

  it('hydrates entries, tolerates bare legacy summaries, and drops junk', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.roundHistory, JSON.stringify([entry('ok'), summary('legacy'), { summary: summary('noround'), round: { nope: true } }, { id: 'bad' }, 'nope']));
    await useHistoryStore.getState().hydrate();
    const { entries, hydrated } = useHistoryStore.getState();
    expect(hydrated).toBe(true);
    expect(entries.map((e) => e.summary.id)).toEqual(['ok', 'legacy', 'noround']);
    expect(entries[0]?.round).toBeDefined();
    expect(entries[1]?.round).toBeUndefined();
    expect(entries[2]?.round).toBeUndefined();
  });

  it('survives unreadable storage', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.roundHistory, '{not json');
    await useHistoryStore.getState().hydrate();
    expect(useHistoryStore.getState().hydrated).toBe(true);
    expect(useHistoryStore.getState().entries).toEqual([]);
  });
});
