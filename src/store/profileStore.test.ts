import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfileStore } from './profileStore';
import { STORAGE_KEYS } from './storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const flush = () => new Promise((r) => setTimeout(r, 0));
const stored = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');

beforeEach(async () => {
  await AsyncStorage.clear();
  useProfileStore.setState({ profiles: [], groups: [], hydrated: false });
});

describe('profileStore', () => {
  it('adds, updates and persists profiles', async () => {
    const s = useProfileStore.getState();
    const sam = s.addProfile('Sam', 8.2);
    s.updateProfile(sam.id, { handicapIndex: 7.9 });
    s.updateProfile(sam.id, { name: '  Samantha ' });
    await flush();
    const p = useProfileStore.getState().profiles[0];
    expect([p.name, p.handicapIndex, p.indexHistory.length]).toEqual(['Samantha', 7.9, 2]);
    expect((await stored(STORAGE_KEYS.playerProfiles))[0].name).toBe('Samantha');
  });

  it('hydrates and drops junk', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.playerProfiles, JSON.stringify([{ id: 'a', name: 'A', indexHistory: [], createdAt: 't' }, { nope: true }]));
    await AsyncStorage.setItem(STORAGE_KEYS.playerGroups, JSON.stringify([{ id: 'g', name: 'G', memberIds: ['a'] }, 'junk']));
    await useProfileStore.getState().hydrate();
    expect(useProfileStore.getState().profiles.map((p) => p.id)).toEqual(['a']);
    expect(useProfileStore.getState().groups.map((g) => g.id)).toEqual(['g']);
  });

  it('saves groups of 2–4 known profiles and cleans up when a member is deleted', async () => {
    const s = useProfileStore.getState();
    const a = s.addProfile('A');
    const b = s.addProfile('B');
    const c = s.addProfile('C');
    expect(s.saveGroup({ name: 'Solo', memberIds: [a.id] })).toBeNull();
    expect(s.saveGroup({ name: '', memberIds: [a.id, b.id] })).toBeNull();
    const g = s.saveGroup({ name: 'Saturday', memberIds: [a.id, b.id, c.id, 'ghost', a.id] });
    expect(g?.memberIds).toEqual([a.id, b.id, c.id]);
    s.saveGroup({ id: g!.id, name: 'Sat', memberIds: [a.id, b.id] });
    expect(useProfileStore.getState().groups).toEqual([{ id: g!.id, name: 'Sat', memberIds: [a.id, b.id] }]);
    s.removeProfile(a.id);
    await flush();
    expect(useProfileStore.getState().groups).toEqual([]);
    expect(await stored(STORAGE_KEYS.playerGroups)).toEqual([]);
    expect((await stored(STORAGE_KEYS.playerProfiles)).map((p: { id: string }) => p.id)).toEqual([b.id, c.id]);
  });

  it('syncFromRound links players and records the date played', async () => {
    const s = useProfileStore.getState();
    const sam = s.addProfile('Sam', 8.2);
    const players = s.syncFromRound([{ id: 'p1', name: 'Sam', handicapIndex: 8.0, teeBoxId: 'b', profileId: sam.id }, { id: 'p2', name: 'Pat', teeBoxId: 'b' }], '2026-09-28T12:00:00.000Z');
    expect(players[0].profileId).toBe(sam.id);
    expect(players[1].profileId).toBeDefined();
    const profiles = useProfileStore.getState().profiles;
    expect(profiles.map((p) => [p.name, p.handicapIndex, p.lastPlayedAt])).toEqual([
      ['Sam', 8.0, '2026-09-28T12:00:00.000Z'],
      ['Pat', undefined, '2026-09-28T12:00:00.000Z'],
    ]);
  });
});
