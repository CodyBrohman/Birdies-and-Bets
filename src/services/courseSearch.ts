// The only place the app talks to the network. Talks to our proxy, never to the provider directly.
import type { Course } from '@/types';
import { mapProviderCourse, type ProviderCourseDto } from '@/lib/courseImport';
import type { CourseSearchResult } from '@/store/courseStore';

export interface CourseProvider {
  /** Short name stored on imported courses, e.g. "golfcourseapi". */
  name: string;
  search(query: string, signal?: AbortSignal): Promise<CourseSearchResult[]>;
  fetch(providerId: string, signal?: AbortSignal): Promise<ProviderCourseDto>;
}

/** Our Cloudflare Worker (see worker/). Only its URL ships in the bundle; the provider key stays server-side. */
export function proxyProvider(baseUrl: string): CourseProvider {
  const base = baseUrl.replace(/\/+$/, '');
  const get = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
    const res = await fetch(`${base}${path}`, { signal, headers: { Accept: 'application/json' } });
    if (res.status === 429) throw new Error('Too many searches right now. Try again in a minute.');
    if (!res.ok) throw new Error(`Course service error (${res.status})`);
    return (await res.json()) as T;
  };
  return {
    name: 'golfcourseapi',
    async search(query, signal) {
      const data = await get<{ results: CourseSearchResult[] }>(`/search?q=${encodeURIComponent(query.trim())}`, signal);
      return Array.isArray(data.results) ? data.results : [];
    },
    async fetch(providerId, signal) {
      return get<ProviderCourseDto>(`/course/${encodeURIComponent(providerId)}`, signal);
    },
  };
}

let provider: CourseProvider | null = null;

export function setCourseProvider(p: CourseProvider | null): void {
  provider = p;
}

/** True when a proxy URL is configured for this build. */
export function courseSearchAvailable(): boolean {
  return provider != null;
}

const url = process.env.EXPO_PUBLIC_COURSE_API_URL;
if (url) provider = proxyProvider(url);

export async function searchCourses(query: string, signal?: AbortSignal): Promise<CourseSearchResult[]> {
  if (!provider) return [];
  if (query.trim().length < 3) return [];
  return provider.search(query, signal);
}

/** Fetch, map and validate one course. Throws when the provider's data cannot be scored. */
export async function fetchCourse(providerId: string, signal?: AbortSignal): Promise<Course> {
  if (!provider) throw new Error('Course search is not available in this build.');
  const dto = await provider.fetch(providerId, signal);
  return mapProviderCourse(dto, provider.name);
}
