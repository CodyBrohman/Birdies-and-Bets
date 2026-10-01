import { groupMembers, groupsWithoutProfile, newProfile, roundsForProfile, sortProfiles, syncProfilesWithPlayers, withIndex } from './profiles';
import type { HistoryEntry, PlayerProfile } from '../types';

const t0 = '2026-09-01T10:00:00.000Z';
const t1 = '2026-09-08T10:00:00.000Z';
let n = 0;
const makeId = () => `pr_${++n}`;

beforeEach(() => {
  n = 0;
});

describe('withIndex', () => {
  it('appends only when the index changes', () => {
    const p = newProfile('a', 'Sam', 8.2, t0);
    expect(withIndex(p, 8.2, t1)).toBe(p);
    expect(withIndex(p, 8.24, t1)).toBe(p);
    const changed = withIndex(p, 7.9, t1);
    expect(changed.handicapIndex).toBe(7.9);
    expect(changed.indexHistory).toEqual([
      { at: t0, index: 8.2 },
      { at: t1, index: 7.9 },
    ]);
    expect(withIndex(changed, undefined, t1).indexHistory.at(-1)).toEqual({ at: t1, index: null });
  });
});

describe('syncProfilesWithPlayers', () => {
  it('creates profiles for new names, links by name, and records a changed index', () => {
    const sam = newProfile('sam', 'Sam', 8.2, t0);
    const r = syncProfilesWithPlayers([sam], [{ id: 'p1', name: 'sam ', handicapIndex: 7.5, teeBoxId: 'b' }, { id: 'p2', name: 'Pat', teeBoxId: 'b' }], t1, makeId);
    expect(r.players.map((p) => p.profileId)).toEqual(['sam', 'pr_1']);
    expect(r.profiles.map((p) => [p.name, p.handicapIndex, p.lastPlayedAt])).toEqual([
      ['Sam', 7.5, t1],
      ['Pat', undefined, t1],
    ]);
    expect(r.profiles[0].indexHistory).toHaveLength(2);
  });

  it('leaves the index alone when a name is typed without one, but clears it for a linked player', () => {
    const sam = newProfile('sam', 'Sam', 8.2, t0);
    const typed = syncProfilesWithPlayers([sam], [{ id: 'p1', name: 'Sam', teeBoxId: 'b' }], t1, makeId);
    expect(typed.profiles[0].handicapIndex).toBe(8.2);
    const linked = syncProfilesWithPlayers([sam], [{ id: 'p1', name: 'Sam', teeBoxId: 'b', profileId: 'sam' }], t1, makeId);
    expect(linked.profiles[0].handicapIndex).toBeUndefined();
    expect(linked.profiles[0].indexHistory.at(-1)).toEqual({ at: t1, index: null });
  });
});

describe('groups', () => {
  const a: PlayerProfile = newProfile('a', 'A', undefined, t0);
  const b: PlayerProfile = newProfile('b', 'B', undefined, t0);
  const c: PlayerProfile = newProfile('c', 'C', undefined, t0);
  it('resolves members in seat order and skips missing ones', () => {
    expect(groupMembers({ id: 'g', name: 'Sat', memberIds: ['c', 'zzz', 'a'] }, [a, b, c]).map((p) => p.id)).toEqual(['c', 'a']);
  });
  it('drops a deleted profile and any group left with one member', () => {
    const groups = [
      { id: 'g1', name: 'Pair', memberIds: ['a', 'b'] },
      { id: 'g2', name: 'Trio', memberIds: ['a', 'b', 'c'] },
    ];
    expect(groupsWithoutProfile(groups, 'a').map((g) => [g.id, g.memberIds])).toEqual([['g2', ['b', 'c']]]);
  });
});

describe('sortProfiles', () => {
  it('orders by last played, then never-played alphabetically', () => {
    const list = [
      { ...newProfile('1', 'Zed', undefined, t0) },
      { ...newProfile('2', 'Amy', undefined, t0) },
      { ...newProfile('3', 'Kim', undefined, t0), lastPlayedAt: t0 },
      { ...newProfile('4', 'Bo', undefined, t0), lastPlayedAt: t1 },
    ];
    expect(sortProfiles(list).map((p) => p.name)).toEqual(['Bo', 'Kim', 'Amy', 'Zed']);
  });
});

describe('roundsForProfile', () => {
  it('matches by profile id when the round recorded one, else by name, newest first', () => {
    const sam = newProfile('sam', 'Sam', undefined, t0);
    const player = (id: string, name: string) => ({ id, name, gross: 80, net: 80, grossToPar: 8, playingHandicap: 0, holesPickedUp: 0 });
    const summary = (id: string, completedAt: string, players: ReturnType<typeof player>[]) => ({ id, completedAt, courseName: 'C', holeCount: 18 as const, gameNames: [], players, leaderId: players[0].id, resultLabel: '' });
    const entries: HistoryEntry[] = [
      { summary: summary('old', t0, [player('x', 'sam')]) },
      { summary: summary('new', t1, [player('y', 'Samuel')]), round: { players: [{ id: 'y', name: 'Samuel', teeBoxId: 'b', profileId: 'sam' }] } as never },
      { summary: summary('other', t1, [player('z', 'Pat')]) },
    ];
    expect(roundsForProfile(sam, entries).map((r) => r.summary.id)).toEqual(['new', 'old']);
  });
});
