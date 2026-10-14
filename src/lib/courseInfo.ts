// What a course is, in a line: the facts the app shows instead of photos. Pure; imports only types/ and lib/.

import type { Course, TeeBox } from '../types/course';
import { joinMeta, plural } from './format';

export function coursePar(course: Course): number {
  return course.holes.reduce((sum, h) => sum + h.par, 0);
}

/** "Pebble Beach, CA · Par 72 · 4 tees" (and "9 holes" when it is not an 18). */
export function courseSummary(course: Course): string {
  return joinMeta([course.location, course.holes.length !== 18 ? plural(course.holes.length, 'hole') : null, `Par ${coursePar(course)}`, plural(course.teeBoxes.length, 'tee')]);
}

/** "6,412 yds · 71.2 / 128" — what is known about a set of tees. */
export function teeSummary(tee: TeeBox): string {
  return joinMeta([tee.totalYards ? `${tee.totalYards.toLocaleString('en-US')} yds` : null, tee.rating ? `${tee.rating.toFixed(1)} / ${tee.slope ?? '—'}` : null]);
}
