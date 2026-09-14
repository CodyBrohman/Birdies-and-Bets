import { create } from 'zustand';
import type { ActiveGame, Course, GrossScore, HoleCount, HoleResult, Player, PlayerId, PlayerScores, Round, RoundSettings } from '@/types';
import { newId } from '@/lib/id';
import { storage, STORAGE_KEYS } from './storage';

const MAX_RECENT_PLAYERS = 8;

export interface Draft {
  course: Course | null;
  teeBoxId: string | null;
  players: Player[];
  holeCount: HoleCount;
}

const emptyDraft = (): Draft => ({ course: null, teeBoxId: null, players: [], holeCount: 18 });

export const DEFAULT_SETTINGS: RoundSettings = { holeCount: 18, allowance: 100, stakeLabel: 'points' };

interface RoundState {
  hydrated: boolean;
  /** Set when the saved round could not be read; Home shows a note and offers a fresh start. */
  hydrateError: string | null;
  draft: Draft;
  round: Round | null;
  recentPlayers: Player[];

  hydrate(): Promise<void>;

  // Setup
  setDraftCourse(course: Course, teeBoxId: string): void;
  setDraftPlayers(players: Player[]): void;
  setDraftHoleCount(holeCount: HoleCount): void;
  startRound(games: ActiveGame[]): Round | null;

  // Play
  setScore(playerId: PlayerId, holeNumber: number, score: GrossScore): void;
  recordHole(holeNumber: number, scores: PlayerScores): void;
  setGameInputs(holeNumber: number, gameId: string, inputs: Record<string, string>): void;
  setCurrentHole(holeNumber: number): void;
  setGames(games: ActiveGame[]): void;
  finishRound(): void;
  discardRound(): void;
}

/** Orchestration only. Rules live in lib/ and games/. Every mutation persists immediately. */
export const useRoundStore = create<RoundState>()((set, get) => {
  const persist = (round: Round | null) => {
    void (round ? storage.set(STORAGE_KEYS.activeRound, round) : storage.remove(STORAGE_KEYS.activeRound));
  };

  const update = (fn: (round: Round) => Round) => {
    const current = get().round;
    if (!current) return;
    const next = { ...fn(current), updatedAt: new Date().toISOString() };
    set({ round: next });
    persist(next);
  };

  const upsertHole = (results: HoleResult[], holeNumber: number, patch: (r: HoleResult) => HoleResult): HoleResult[] => {
    const idx = results.findIndex((r) => r.holeNumber === holeNumber);
    if (idx === -1) return [...results, patch({ holeNumber, scores: {} })].sort((a, b) => a.holeNumber - b.holeNumber);
    return results.map((r, i) => (i === idx ? patch(r) : r));
  };

  return {
    hydrated: false,
    hydrateError: null,
    draft: emptyDraft(),
    round: null,
    recentPlayers: [],

    async hydrate() {
      try {
        const [round, recentPlayers] = await Promise.all([
          storage.get<Round>(STORAGE_KEYS.activeRound),
          storage.get<Player[]>(STORAGE_KEYS.recentPlayers),
        ]);
        const valid = round && Array.isArray(round.players) && Array.isArray(round.holeResults) && round.course?.holes?.length ? round : null;
        set({
          round: valid,
          recentPlayers: Array.isArray(recentPlayers) ? recentPlayers : [],
          hydrated: true,
          hydrateError: round && !valid ? 'The saved round was unreadable, so it was cleared.' : null,
        });
        if (round && !valid) persist(null);
      } catch (e) {
        set({ round: null, recentPlayers: [], hydrated: true, hydrateError: e instanceof Error ? e.message : 'Could not read saved data.' });
      }
    },

    setDraftCourse(course, teeBoxId) {
      set((s) => ({
        draft: {
          ...s.draft,
          course,
          teeBoxId,
          // Keep players, but point them at the new tee.
          players: s.draft.players.map((p) => ({ ...p, teeBoxId })),
        },
      }));
    },

    setDraftPlayers(players) {
      set((s) => ({ draft: { ...s.draft, players } }));
    },

    setDraftHoleCount(holeCount) {
      set((s) => ({ draft: { ...s.draft, holeCount } }));
    },

    startRound(games) {
      const { draft } = get();
      if (!draft.course || !draft.teeBoxId) return null;
      const players = draft.players.filter((p) => p.name.trim().length > 0);
      if (players.length < 1) return null;
      const now = new Date().toISOString();
      const round: Round = {
        id: newId('round'),
        createdAt: now,
        updatedAt: now,
        status: 'in-progress',
        course: draft.course,
        teeBoxId: draft.teeBoxId,
        players,
        games,
        settings: { ...DEFAULT_SETTINGS, holeCount: draft.holeCount },
        holeResults: [],
        currentHole: 1,
      };
      const recentPlayers = [
        ...players,
        ...get().recentPlayers.filter((rp) => !players.some((p) => p.name.trim().toLowerCase() === rp.name.trim().toLowerCase())),
      ].slice(0, MAX_RECENT_PLAYERS);
      set({ round, recentPlayers, draft: emptyDraft() });
      persist(round);
      void storage.set(STORAGE_KEYS.recentPlayers, recentPlayers);
      return round;
    },

    setScore(playerId, holeNumber, score) {
      update((r) => ({
        ...r,
        holeResults: upsertHole(r.holeResults, holeNumber, (h) => ({ ...h, scores: { ...h.scores, [playerId]: score } })),
      }));
    },

    recordHole(holeNumber, scores) {
      update((r) => ({
        ...r,
        holeResults: upsertHole(r.holeResults, holeNumber, (h) => ({ ...h, scores: { ...h.scores, ...scores } })),
      }));
    },

    setGameInputs(holeNumber, gameId, inputs) {
      update((r) => ({
        ...r,
        holeResults: upsertHole(r.holeResults, holeNumber, (h) => ({
          ...h,
          gameInputs: { ...(h.gameInputs ?? {}), [gameId]: inputs },
        })),
      }));
    },

    setCurrentHole(holeNumber) {
      update((r) => ({ ...r, currentHole: Math.max(1, Math.min(r.settings.holeCount, holeNumber)) }));
    },

    setGames(games) {
      update((r) => ({ ...r, games }));
    },

    finishRound() {
      update((r) => ({ ...r, status: 'complete' }));
    },

    discardRound() {
      set({ round: null });
      persist(null);
    },
  };
});
