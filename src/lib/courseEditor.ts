// Field-level validation for the course editor. Pure; the screen only renders what these return.
import type { Course } from '@/types';

export const RATING_RANGE = { min: 55, max: 85 } as const;
export const SLOPE_RANGE = { min: 55, max: 155 } as const;
export const YARDS_RANGE = { min: 50, max: 700 } as const;

/** Trimmed numeric parse; undefined when blank, NaN when text is present but not a number. */
export function parseNumber(raw: string): number | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

export interface TeeProblems {
  name?: string;
  rating?: string;
  slope?: string;
}

/** Name is required. Rating and slope are optional but must be plausible together: one without the other is a problem. */
export function validateTee(tee: { name: string; rating: string; slope: string }): TeeProblems {
  const out: TeeProblems = {};
  if (!tee.name.trim()) out.name = 'Name the tee';
  const rating = parseNumber(tee.rating);
  const slope = parseNumber(tee.slope);
  if (rating != null && (Number.isNaN(rating) || rating < RATING_RANGE.min || rating > RATING_RANGE.max)) out.rating = `Rating is ${RATING_RANGE.min}–${RATING_RANGE.max}`;
  if (slope != null && (Number.isNaN(slope) || !Number.isInteger(slope) || slope < SLOPE_RANGE.min || slope > SLOPE_RANGE.max)) out.slope = `Slope is a whole number ${SLOPE_RANGE.min}–${SLOPE_RANGE.max}`;
  if (rating != null && slope == null && !out.rating) out.slope = 'Add the slope too';
  if (slope != null && rating == null && !out.slope) out.rating = 'Add the rating too';
  return out;
}

export interface StrokeIndexCheck {
  /** Hole indexes (0-based) whose SI is blank, out of range or duplicated. */
  badHoles: Set<number>;
  /** SI values that have not been used yet, ascending. */
  missing: number[];
  message: string | null;
}

/** Every SI from 1 to n exactly once. Blank or out-of-range holes are flagged; duplicates flag every hole sharing the value. */
export function checkStrokeIndexes(raw: string[], holeCount: number): StrokeIndexCheck {
  const badHoles = new Set<number>();
  const byValue = new Map<number, number[]>();
  raw.forEach((s, i) => {
    const n = Number(s.trim());
    if (!s.trim() || !Number.isInteger(n) || n < 1 || n > holeCount) {
      badHoles.add(i);
      return;
    }
    byValue.set(n, [...(byValue.get(n) ?? []), i]);
  });
  const dupes: string[] = [];
  for (const [value, holes] of [...byValue.entries()].sort((a, b) => a[0] - b[0])) {
    if (holes.length > 1) {
      holes.forEach((i) => badHoles.add(i));
      dupes.push(`SI ${value} on holes ${holes.map((i) => i + 1).join(' and ')}`);
    }
  }
  const missing: number[] = [];
  for (let v = 1; v <= holeCount; v++) if (!byValue.has(v)) missing.push(v);
  let message: string | null = null;
  const blankOrRange = raw.filter((s, i) => badHoles.has(i) && !byValue.has(Number(s.trim()))).length;
  if (dupes.length) message = dupes.join('; ');
  else if (blankOrRange) message = `Stroke index must be 1–${holeCount} on every hole`;
  if (message && missing.length && missing.length <= 4) message += `. Unused: ${missing.join(', ')}`;
  return { badHoles, missing, message };
}

/** Stroke index in hole order (1, 2, 3 …). The safe default when the card is unknown. */
export function strokeIndexesInHoleOrder(holeCount: number): string[] {
  return Array.from({ length: holeCount }, (_, i) => String(i + 1));
}

export function yardageProblem(raw: string): string | null {
  const n = parseNumber(raw);
  if (n == null) return null;
  if (Number.isNaN(n) || !Number.isInteger(n) || n < YARDS_RANGE.min || n > YARDS_RANGE.max) return `Yardage is ${YARDS_RANGE.min}–${YARDS_RANGE.max}`;
  return null;
}

/** Per-tee totals when every hole in play has a valid yardage for that tee; holes with any bad value flag it. */
export function yardageTotals(holes: { yards: Record<string, string> }[], teeIds: string[]): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  for (const id of teeIds) {
    let total = 0;
    let complete = true;
    for (const h of holes) {
      const n = parseNumber(h.yards[id] ?? '');
      if (n == null || yardageProblem(h.yards[id] ?? '')) {
        complete = false;
        break;
      }
      total += n;
    }
    out[id] = complete && holes.length > 0 ? total : undefined;
  }
  return out;
}

/** A soft warning: totals well outside what a real card shows usually mean a par chip was mis-tapped. */
export function parWarning(pars: number[]): string | null {
  const n = pars.length;
  const total = pars.reduce((a, b) => a + b, 0);
  const [lo, hi] = n === 9 ? [27, 39] : [58, 78];
  if (n === 9 || n === 18) return total < lo || total > hi ? `Par ${total} is unusual for ${n} holes. Check the par chips.` : null;
  return null;
}

/** "Name (copy)", then "Name (copy 2)" … until it is not taken. Case-insensitive. */
export function uniqueCourseName(base: string, existing: Pick<Course, 'name'>[]): string {
  const taken = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  const root = base.replace(/\s*\(copy(?: \d+)?\)\s*$/i, '').trim();
  let candidate = `${root} (copy)`;
  for (let i = 2; taken.has(candidate.toLowerCase()); i++) candidate = `${root} (copy ${i})`;
  return candidate;
}
