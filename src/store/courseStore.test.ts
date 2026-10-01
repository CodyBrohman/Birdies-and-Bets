import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCourseStore } from './courseStore';
import { STORAGE_KEYS } from './storage';
import { cedarRidge } from '../lib/__fixtures__/cedarRidge';
import type { Course } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const flush = () => new Promise((r) => setTimeout(r, 0));
const mine: Course = { ...cedarRidge, id: 'mine', name: 'My Muni', userEntered: true, source: 'user' };

beforeEach(async () => {
  await AsyncStorage.clear();
  useCourseStore.setState({ userCourses: [], recentIds: [], searchCache: {}, hydrated: false });
});

describe('courseStore', () => {
  it('adds, updates and lists user courses ahead of bundled ones', async () => {
    await useCourseStore.getState().addUserCourse(mine);
    expect(useCourseStore.getState().allCourses().map((c) => c.id)).toEqual(['mine', cedarRidge.id]);
    await useCourseStore.getState().updateUserCourse({ ...mine, name: 'My Muni (renamed)' });
    expect(useCourseStore.getState().byId('mine')?.name).toBe('My Muni (renamed)');
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.userCourses)) ?? '[]') as Course[];
    expect(saved[0]?.name).toBe('My Muni (renamed)');
  });

  it('removes a course and forgets it in recents', async () => {
    await useCourseStore.getState().addUserCourse(mine);
    await useCourseStore.getState().markRecent('mine');
    await useCourseStore.getState().markRecent(cedarRidge.id);
    await useCourseStore.getState().removeUserCourse('mine');
    expect(useCourseStore.getState().byId('mine')).toBeUndefined();
    expect(useCourseStore.getState().recentIds).toEqual([cedarRidge.id]);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.recentCourses)) ?? '[]')).toEqual([cedarRidge.id]);
  });

  it('duplicates a bundled course into an editable copy', async () => {
    const copy = await useCourseStore.getState().duplicateCourse(cedarRidge.id);
    expect(copy).toBeDefined();
    expect(copy!.id).not.toBe(cedarRidge.id);
    expect(copy!.name).toBe('Cedar Ridge Golf Club (copy)');
    expect(copy!.userEntered).toBe(true);
    expect(copy!.holes).toHaveLength(18);
    expect(copy!.holes[0]).not.toBe(cedarRidge.holes[0]);
    expect(useCourseStore.getState().byId(copy!.id)).toBeDefined();
    const again = await useCourseStore.getState().duplicateCourse(cedarRidge.id);
    expect(again!.name).toBe('Cedar Ridge Golf Club (copy 2)');
    expect(await useCourseStore.getState().duplicateCourse('nope')).toBeUndefined();
  });

  it('imports replace an earlier import of the same provider course', async () => {
    const imported: Course = { ...mine, id: 'api_x_1', provider: 'x', providerId: '1', source: 'api' };
    await useCourseStore.getState().importCourse(imported);
    await useCourseStore.getState().importCourse({ ...imported, id: 'api_x_1_again', name: 'Fresh' });
    const ids = useCourseStore.getState().userCourses.map((c) => c.id);
    expect(ids).toEqual(['api_x_1_again']);
  });

  it('caches searches with a TTL and a cap', async () => {
    const s = useCourseStore.getState();
    s.cacheSearch('Pebble', [{ providerId: '9', name: 'Pebble Beach' }]);
    expect(useCourseStore.getState().cachedSearch('  pebble ')).toEqual([{ providerId: '9', name: 'Pebble Beach' }]);
    expect(useCourseStore.getState().cachedSearch('other')).toBeUndefined();
    useCourseStore.setState({ searchCache: { pebble: { at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(), results: [] } } });
    expect(useCourseStore.getState().cachedSearch('pebble')).toBeUndefined();
    for (let i = 0; i < 60; i++) useCourseStore.getState().cacheSearch(`q${i}`, []);
    expect(Object.keys(useCourseStore.getState().searchCache)).toHaveLength(50);
    await flush();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.courseCache)).not.toBeNull();
  });

  it('hydrates all three keys and tolerates junk', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.userCourses, JSON.stringify([mine]));
    await AsyncStorage.setItem(STORAGE_KEYS.recentCourses, JSON.stringify('junk'));
    await AsyncStorage.setItem(STORAGE_KEYS.courseCache, JSON.stringify({ x: { at: new Date().toISOString(), results: [] } }));
    await useCourseStore.getState().hydrate();
    const st = useCourseStore.getState();
    expect(st.hydrated).toBe(true);
    expect(st.userCourses.map((c) => c.id)).toEqual(['mine']);
    expect(st.recentIds).toEqual([]);
    expect(Object.keys(st.searchCache)).toEqual(['x']);
  });
});
