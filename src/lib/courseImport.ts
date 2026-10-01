// Mapping and validation for courses that arrive from a search service. Pure; imports only types/.

import type { Course, Hole, TeeBox } from '../types/course';

/** What the course service hands the app: already trimmed to what a scorecard needs. */
export interface ProviderCourseDto {
  id: string;
  name: string;
  location?: string;
  tees: { id: string; name: string; rating?: number; slope?: number; color?: string; totalYards?: number }[];
  holes: { number: number; par: number; strokeIndex: number; yardage?: Record<string, number> }[];
}

/** Problems that make a course unusable for scoring. Empty means valid. */
export function validateCourse(course: Pick<Course, 'name' | 'holes' | 'teeBoxes'>): string[] {
  const problems: string[] = [];
  if (!course.name.trim()) problems.push('Course has no name');
  const n = course.holes.length;
  if (n !== 9 && n !== 18) problems.push(`Course has ${n} holes; expected 9 or 18`);
  const numbers = course.holes.map((h) => h.number).sort((a, b) => a - b);
  if (numbers.some((num, i) => num !== i + 1)) problems.push('Holes are not numbered 1 to n');
  for (const h of course.holes) if (!Number.isInteger(h.par) || h.par < 3 || h.par > 6) problems.push(`Hole ${h.number} has par ${h.par}`);
  const sis = course.holes.map((h) => h.strokeIndex);
  if (sis.some((si) => !Number.isInteger(si) || si < 1 || si > n)) problems.push(`Stroke indexes must be 1 to ${n}`);
  else if (new Set(sis).size !== sis.length) problems.push('Stroke indexes must be unique');
  if (course.teeBoxes.length === 0) problems.push('Course has no tees');
  return problems;
}

/** Turn a provider DTO into a Course. Throws with the validation problems when it cannot be scored. */
export function mapProviderCourse(dto: ProviderCourseDto, provider: string, now: string = new Date().toISOString()): Course {
  const holes: Hole[] = [...dto.holes]
    .sort((a, b) => a.number - b.number)
    .map((h) => ({ number: h.number, par: h.par, strokeIndex: h.strokeIndex, ...(h.yardage && Object.keys(h.yardage).length ? { yardage: { ...h.yardage } } : {}) }));
  const teeBoxes: TeeBox[] = dto.tees.map((t) => {
    const yards = holes.map((h) => h.yardage?.[t.id]).filter((y): y is number => typeof y === 'number');
    const totalYards = t.totalYards ?? (yards.length === holes.length && holes.length > 0 ? yards.reduce((a, b) => a + b, 0) : undefined);
    return { id: t.id, name: t.name, ...(t.color ? { color: t.color } : {}), ...(t.rating != null ? { rating: t.rating } : {}), ...(t.slope != null ? { slope: t.slope } : {}), ...(totalYards != null ? { totalYards } : {}) };
  });
  const course: Course = {
    id: `api_${provider}_${dto.id}`,
    name: dto.name.trim(),
    ...(dto.location ? { location: dto.location } : {}),
    holes,
    teeBoxes,
    userEntered: true,
    source: 'api',
    provider,
    providerId: dto.id,
    importedAt: now,
  };
  const problems = validateCourse(course);
  if (problems.length) throw new Error(problems.join('. '));
  return course;
}
