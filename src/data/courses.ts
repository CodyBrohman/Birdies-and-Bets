import type { Course } from '@/types';
import cedarRidge from '../../assets/courses/cedar-ridge.json';

/**
 * Bundled course data. Add a JSON file under assets/courses and one line here.
 * Only courses with verified hole data belong in this list; anything else the user enters by hand.
 */
export const bundledCourses: Course[] = [cedarRidge as Course];
