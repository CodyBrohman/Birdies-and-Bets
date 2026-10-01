import { create } from 'zustand';
import type { Course } from '@/types';
import { bundledCourses } from '@/data/courses';
import { newId } from '@/lib/id';
import { uniqueCourseName } from '@/lib/courseEditor';
import { storage, STORAGE_KEYS } from './storage';

const MAX_RECENT = 5;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHED_QUERIES = 50;

/** A course found by the search service but not yet imported. */
export interface CourseSearchResult {
  providerId: string;
  name: string;
  location?: string;
  holeCount?: number;
}

type SearchCache = Record<string, { at: string; results: CourseSearchResult[] }>;

interface CourseState {
  hydrated: boolean;
  userCourses: Course[];
  recentIds: string[];
  searchCache: SearchCache;
  hydrate(): Promise<void>;
  allCourses(): Course[];
  byId(id: string): Course | undefined;
  recent(): Course[];
  search(query: string): Course[];
  addUserCourse(course: Course): Promise<void>;
  updateUserCourse(course: Course): Promise<void>;
  removeUserCourse(id: string): Promise<void>;
  /** Copy any course (bundled or user) into an editable user course. */
  duplicateCourse(id: string, name?: string): Promise<Course | undefined>;
  /** Add a course fetched from the search service; an existing import of the same provider id is replaced. */
  importCourse(course: Course): Promise<void>;
  markRecent(id: string): Promise<void>;
  cachedSearch(query: string): CourseSearchResult[] | undefined;
  cacheSearch(query: string, results: CourseSearchResult[]): void;
}

const norm = (q: string) => q.trim().toLowerCase();

export const useCourseStore = create<CourseState>()((set, get) => {
  const persistUser = (userCourses: Course[]) => storage.set(STORAGE_KEYS.userCourses, userCourses);
  const persistRecent = (recentIds: string[]) => storage.set(STORAGE_KEYS.recentCourses, recentIds);

  return {
    hydrated: false,
    userCourses: [],
    recentIds: [],
    searchCache: {},

    async hydrate() {
      try {
        const [userCourses, recentIds, cache] = await Promise.all([
          storage.get<Course[]>(STORAGE_KEYS.userCourses),
          storage.get<string[]>(STORAGE_KEYS.recentCourses),
          storage.get<SearchCache>(STORAGE_KEYS.courseCache),
        ]);
        set({
          userCourses: Array.isArray(userCourses) ? userCourses : [],
          recentIds: Array.isArray(recentIds) ? recentIds : [],
          searchCache: cache && typeof cache === 'object' ? cache : {},
          hydrated: true,
        });
      } catch {
        set({ userCourses: [], recentIds: [], searchCache: {}, hydrated: true });
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
      const q = norm(query);
      const all = get().allCourses();
      if (!q) return all;
      return all.filter((c) => c.name.toLowerCase().includes(q) || (c.location ?? '').toLowerCase().includes(q));
    },

    async addUserCourse(course) {
      const userCourses = [{ ...course, userEntered: true, source: course.source ?? 'user' }, ...get().userCourses.filter((c) => c.id !== course.id)];
      set({ userCourses });
      await persistUser(userCourses);
    },

    async updateUserCourse(course) {
      const userCourses = get().userCourses.map((c) => (c.id === course.id ? { ...course, userEntered: true } : c));
      set({ userCourses });
      await persistUser(userCourses);
    },

    async removeUserCourse(id) {
      const userCourses = get().userCourses.filter((c) => c.id !== id);
      const recentIds = get().recentIds.filter((r) => r !== id);
      set({ userCourses, recentIds });
      await Promise.all([persistUser(userCourses), persistRecent(recentIds)]);
    },

    async duplicateCourse(id, name) {
      const source = get().byId(id);
      if (!source) return undefined;
      const copy: Course = {
        ...source,
        id: newId('course'),
        name: name ?? uniqueCourseName(source.name, get().allCourses()),
        userEntered: true,
        source: 'user',
        provider: undefined,
        providerId: undefined,
        importedAt: undefined,
        holes: source.holes.map((h) => ({ ...h, yardage: h.yardage ? { ...h.yardage } : undefined })),
        teeBoxes: source.teeBoxes.map((t) => ({ ...t })),
      };
      await get().addUserCourse(copy);
      return copy;
    },

    async importCourse(course) {
      const dup = course.providerId ? get().userCourses.find((c) => c.providerId === course.providerId && c.provider === course.provider) : undefined;
      const userCourses = [{ ...course, userEntered: true, source: 'api' as const }, ...get().userCourses.filter((c) => c.id !== course.id && c.id !== dup?.id)];
      set({ userCourses });
      await persistUser(userCourses);
    },

    async markRecent(id) {
      const recentIds = [id, ...get().recentIds.filter((r) => r !== id)].slice(0, MAX_RECENT);
      set({ recentIds });
      await persistRecent(recentIds);
    },

    cachedSearch(query) {
      const hit = get().searchCache[norm(query)];
      if (!hit) return undefined;
      if (Date.now() - new Date(hit.at).getTime() > CACHE_TTL_MS) return undefined;
      return hit.results;
    },

    cacheSearch(query, results) {
      const q = norm(query);
      if (!q) return;
      const now = Date.now();
      const kept = Object.entries(get().searchCache)
        .filter(([k, v]) => k !== q && now - new Date(v.at).getTime() <= CACHE_TTL_MS)
        .sort((a, b) => new Date(b[1].at).getTime() - new Date(a[1].at).getTime())
        .slice(0, MAX_CACHED_QUERIES - 1);
      const searchCache: SearchCache = Object.fromEntries([[q, { at: new Date(now).toISOString(), results }], ...kept]);
      set({ searchCache });
      void storage.set(STORAGE_KEYS.courseCache, searchCache);
    },
  };
});
