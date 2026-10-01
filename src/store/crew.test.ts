import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, useRoundStore } from './roundStore';
import { useProfileStore } from './profileStore';
import { ensureMeInCrew, groupAsCrew, inCrew, rematch, toggleCrew } from './crew';
import { cedarRidge, cody, marcus } from '../lib/__fixtures__/cedarRidge';
import type { Round } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(async () => {
  await AsyncStorage.clear();
  useProfileStore.setState({ profiles: [], groups: [] });
  useRoundStore.setState({ round: null, draft: { course: null, teeBoxId: null, players: [], settings: { ...DEFAULT_SETTINGS } } });
});

const draftPlayers = () => useRoundStore.getState().draft.players;

describe('crew', () => {
  it('adds and removes saved profiles, capped at four', () => {
    const add = useProfileStore.getState().addProfile;
    const people = ['A', 'B', 'C', 'D', 'E'].map((n) => add(n, 10));
    for (const p of people.slice(0, 4)) expect(toggleCrew(p)).toBe(true);
    expect(toggleCrew(people[4]!)).toBe(false);
    expect(draftPlayers().map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(toggleCrew(people[1]!)).toBe(true);
    expect(inCrew(draftPlayers(), people[1]!.id)).toBe(false);
    expect(draftPlayers()).toHaveLength(3);
  });

  it('puts the owner in an empty crew only', () => {
    const me = useProfileStore.getState().addProfile('Alex', 14.2);
    ensureMeInCrew(me);
    expect(draftPlayers().map((p) => [p.name, p.handicapIndex, p.profileId])).toEqual([['Alex', 14.2, me.id]]);
    const friend = useProfileStore.getState().addProfile('Maya');
    toggleCrew(friend);
    ensureMeInCrew(me);
    expect(draftPlayers()).toHaveLength(2);
  });

  it('players added before a course get its tee when the course is picked', () => {
    toggleCrew(useProfileStore.getState().addProfile('Maya'));
    useRoundStore.getState().setDraftCourse(cedarRidge, 'blue');
    expect(draftPlayers()[0]!.teeBoxId).toBe('blue');
  });

  it('rematch copies course, tees and players', () => {
    const past = { course: cedarRidge, teeBoxId: 'blue', players: [cody, marcus] } as unknown as Round;
    rematch(past);
    const d = useRoundStore.getState().draft;
    expect(d.course?.id).toBe(cedarRidge.id);
    expect(d.teeBoxId).toBe('blue');
    expect(d.players.map((p) => p.name)).toEqual([cody.name, marcus.name]);
  });

  it('a group fills the crew in seat order', () => {
    const add = useProfileStore.getState().addProfile;
    const [a, b] = [add('A'), add('B')];
    groupAsCrew([b.id, a.id, 'missing']);
    expect(draftPlayers().map((p) => p.name)).toEqual(['B', 'A']);
  });
});
