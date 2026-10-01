import { useMemo } from 'react';
import { create } from 'zustand';
import type { HistoryEntry, RoundSummary } from '@/types';
import { isRound, isSummary } from '@/lib/history';
import { storage, STORAGE_KEYS } from './storage';

export const MAX_HISTORY = 50;

interface HistoryState {
  hydrated: boolean;
  /** Newest first. */
  entries: HistoryEntry[];
  hydrate(): Promise<void>;
  add(entry: HistoryEntry): void;
  remove(id: string): void;
  clear(): void;
}

function toEntry(v: unknown): HistoryEntry | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as { summary?: unknown; round?: unknown };
  if (isSummary(o.summary)) return { summary: o.summary, round: isRound(o.round) ? o.round : undefined };
  // Legacy: a bare summary saved before full history existed (tolerated even if migration has not run).
  if (isSummary(v)) return { summary: v };
  return null;
}

/** Completed rounds: a summary for the list plus the full round for detail. Display only. */
export const useHistoryStore = create<HistoryState>()((set, get) => {
  const persist = (entries: HistoryEntry[]) => void storage.set(STORAGE_KEYS.roundHistory, entries);
  return {
    hydrated: false,
    entries: [],

    async hydrate() {
      try {
        const saved = await storage.get<unknown>(STORAGE_KEYS.roundHistory);
        const entries = Array.isArray(saved) ? saved.map(toEntry).filter((e): e is HistoryEntry => e != null) : [];
        set({ entries, hydrated: true });
      } catch {
        set({ entries: [], hydrated: true });
      }
    },

    add(entry) {
      const entries = [entry, ...get().entries.filter((e) => e.summary.id !== entry.summary.id)].slice(0, MAX_HISTORY);
      set({ entries });
      persist(entries);
    },

    remove(id) {
      const entries = get().entries.filter((e) => e.summary.id !== id);
      set({ entries });
      persist(entries);
    },

    clear() {
      set({ entries: [] });
      void storage.remove(STORAGE_KEYS.roundHistory);
    },
  };
});

/** Summaries, newest first, for the Home list. */
export function useHistorySummaries(): RoundSummary[] {
  const entries = useHistoryStore((s) => s.entries);
  return useMemo(() => entries.map((e) => e.summary), [entries]);
}

export function useHistoryEntry(id: string | undefined): HistoryEntry | undefined {
  return useHistoryStore((s) => (id ? s.entries.find((e) => e.summary.id === id) : undefined));
}
