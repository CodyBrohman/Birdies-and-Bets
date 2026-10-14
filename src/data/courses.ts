import type { Course } from '@/types';
import cedarRidge from '../../assets/courses/cedar-ridge.json';

/**
 * The bundled sample: complete hole data (pars, stroke index, three tees) so a round can start with no signal and no
 * typing. It comes from the design brief, not a real club, so it is called what it is and has no location. Its id
 * stays the same, so rounds and recent lists from before the rename still match it.
 */
export const SAMPLE_COURSE: Course = { ...(cedarRidge as Course), name: 'Sample course', location: undefined };

/**
 * Bundled course data. Add a JSON file under assets/courses and one line here.
 * Only courses with verified hole data belong in this list; anything else the user enters by hand.
 */
export const bundledCourses: Course[] = [SAMPLE_COURSE];
