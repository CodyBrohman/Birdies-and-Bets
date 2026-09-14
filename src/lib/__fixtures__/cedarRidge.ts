// Sample data from the design brief, used across lib/ and games/ tests.
import type { Course } from '../../types/course';
import type { Player } from '../../types/player';
import type { HoleResult } from '../../types/round';
import courseJson from '../../../assets/courses/cedar-ridge.json';

export const cedarRidge: Course = courseJson as Course;

export const cody: Player = { id: 'cody', name: 'Cody', handicapIndex: 8.2, teeBoxId: 'blue' };
export const marcus: Player = { id: 'marcus', name: 'Marcus', handicapIndex: 13.6, teeBoxId: 'blue' };
export const priya: Player = { id: 'priya', name: 'Priya', handicapIndex: 21.4, teeBoxId: 'blue' };
export const dan: Player = { id: 'dan', name: 'Dan', handicapIndex: -1.8, teeBoxId: 'blue' };
export const scratchTheo: Player = { id: 'theo', name: 'Theo', teeBoxId: 'blue' };

export const foursome: Player[] = [cody, marcus, priya, dan];

/** Holes 1–6 from the brief: Cody 5 4 4 5 5 3 · Marcus 6 6 5 5 5 4 · Priya 6 7 6 7 6 6 · Dan 3 3 5 5 5 3. */
export const throughSix: HoleResult[] = [
  { holeNumber: 1, scores: { cody: 5, marcus: 6, priya: 6, dan: 3 } },
  { holeNumber: 2, scores: { cody: 4, marcus: 6, priya: 7, dan: 3 } },
  { holeNumber: 3, scores: { cody: 4, marcus: 5, priya: 6, dan: 5 } },
  { holeNumber: 4, scores: { cody: 5, marcus: 5, priya: 7, dan: 5 } },
  { holeNumber: 5, scores: { cody: 5, marcus: 5, priya: 6, dan: 5 } },
  { holeNumber: 6, scores: { cody: 3, marcus: 4, priya: 6, dan: 3 } },
];
