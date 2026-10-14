import { useMemo } from 'react';
import type { HistoryEntry } from '@/types';
import { sameName } from '@/lib/profiles';
import { useHistoryStore } from './historyStore';
import { useMe } from './crew';

/** What you have done at a course: how many rounds, your best gross (when you played), and when you last played it. */
export interface CourseStat {
  rounds: number;
  best?: number;
  last: string;
}

/** Pure: course id → your record there, from finished rounds (rounds saved without the full card are matched by name). */
export function courseStats(entries: HistoryEntry[], me?: { id: string; name: string }): Map<string, CourseStat> {
  const out = new Map<string, CourseStat>();
  for (const e of entries) {
    const id = e.round?.course.id ?? `name:${e.summary.courseName.trim().toLowerCase()}`;
    const mine = me
      ? (e.round?.players.find((p) => p.profileId === me.id) ?? e.summary.players.find((p) => sameName(p.name, me.name)))
      : undefined;
    const gross = mine ? e.summary.players.find((p) => p.id === mine.id)?.gross : undefined;
    const prev = out.get(id);
    out.set(id, {
      rounds: (prev?.rounds ?? 0) + 1,
      best: gross != null && (prev?.best == null || gross < prev.best) ? gross : prev?.best,
      last: !prev || e.summary.completedAt > prev.last ? e.summary.completedAt : prev.last,
    });
  }
  return out;
}

export function useCourseStats(): Map<string, CourseStat> {
  const entries = useHistoryStore((s) => s.entries);
  const { me } = useMe();
  return useMemo(() => courseStats(entries, me ? { id: me.id, name: me.name } : undefined), [entries, me]);
}
