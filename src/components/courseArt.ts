import type { ImageSourcePropType } from 'react-native';
import type { Course } from '@/types';
import { plural } from '@/lib/format';

/** Brand photos shared with the website; a course keeps the same one every time (hash of its id). */
export const PHOTOS: ImageSourcePropType[] = [require('../../assets/photos/dawn-tee.jpg'), require('../../assets/photos/foursome.jpg'), require('../../assets/photos/sprinklers.jpg'), require('../../assets/photos/tee-ball.jpg')];

export const HERO_PHOTO: ImageSourcePropType = PHOTOS[0]!;

export function coursePhoto(id: string): ImageSourcePropType {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PHOTOS[h % PHOTOS.length]!;
}

export function coursePar(course: Course): number {
  return course.holes.reduce((sum, h) => sum + h.par, 0);
}

/** The pill on the photo: what we actually know about this course. */
export function courseTag(course: Course, recentIds: string[]): string | undefined {
  if (recentIds[0] === course.id) return 'Last played';
  if (recentIds.includes(course.id)) return 'Played recently';
  if (course.source === 'api') return 'Imported';
  if (course.userEntered) return 'Your course';
  return 'Ready to play';
}

/** "18 holes · Par 72 · 3 tees". */
export function courseFacts(course: Course): string[] {
  return [plural(course.holes.length, 'hole'), `Par ${coursePar(course)}`, plural(course.teeBoxes.length, 'tee')];
}
