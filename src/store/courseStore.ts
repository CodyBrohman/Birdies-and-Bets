import { create } from 'zustand';
import type { Course } from '@/types';
import { bundledCourses } from '@/data/courses';
import { storage, STORAGE_KEYS } from './storage';

const MAX_RECENT = 5;

interface CourseState {
  hydrated: boolean;
  userCourses: Course[];
  recentIds: string[];
  hydrate(): Promise<void>;
  allCourses(): Course[];
  byId(id: string): Course | undefined;
  recent(): Course[];
  search(query: string): Course[];
  addUserCourse(course: Course): Promise<void>;
  markRecent(id: string): Promise<void>;
}

export const useCourseStore = create<CourseState>()((set, get) => ({
  hydrated: false,
  userCourses: [],
  recentIds: [],

  async hydrate() {
    try {
      const [userCourses, recentIds] = await Promise.all([
        storage.get<Course[]>(STORAGE_KEYS.userCourses),
        storage.get<string[]>(STORAGE_KEYS.recentCourses),
      ]);
      set({ userCourses: Array.isArray(userCourses) ? userCourses : [], recentIds: Array.isArray(recentIds) ? recentIds : [], hydrated: true });
    } catch {
      set({ userCourses: [], recentIds: [], hydrated: true });
    }
  },

  allCourses() {
    return [...get().userCourses, ...bundledCourses];
  },

  byId(id) {
    return get()
      .allCourses()
      .find((c) => c.id === id);
  },

  recent() {
    const { recentIds } = get();
    return recentIds.map((id) => get().byId(id)).filter((c): c is Course => c != null);
  },

  search(query) {
    const q = query.trim().toLowerCase();
    const all = get().allCourses();
    if (!q) return all;
    return all.filter((c) => c.name.toLowerCase().includes(q) || (c.location ?? '').toLowerCase().includes(q));
  },

  async addUserCourse(course) {
    const userCourses = [course, ...get().userCourses.filter((c) => c.id !== course.id)];
    set({ userCourses });
    await storage.set(STORAGE_KEYS.userCourses, userCourses);
  },

  async markRecent(id) {
    const recentIds = [id, ...get().recentIds.filter((r) => r !== id)].slice(0, MAX_RECENT);
    set({ recentIds });
    await storage.set(STORAGE_KEYS.recentCourses, recentIds);
  },
}));
