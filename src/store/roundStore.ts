import { create } from 'zustand';
import type { ActiveGame, Course, GrossScore, HoleResult, Player, PlayerId, PlayerScores, Round, RoundSettings } from '@/types';
import { newId } from '@/lib/id';
import { holesInPlay } from '@/lib/handicap';
import { holePosition, playOrder } from '@/lib/scoring';
import { teeTimeIsStale } from '@/lib/teeTime';
import { getGame } from '@/games/registry';
import { storage, STORAGE_KEYS } from './storage';
import { draftDefaults } from './preferencesStore';
import { useProfileStore } from './profileStore';

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;

/** The round being set up. Persisted (bb:round:draft) so a restart keeps the course, players, games and tee time. */
export interface Draft {
  course: Course | null;
  teeBoxId: string | null;
  players: Player[];
  settings: RoundSettings;
  games: ActiveGame[];
}

/** Undo keeps this many score changes, in memory only. */
export const MAX_UNDO = 20;
export const MAX_NOTE_LENGTH = 140;

/** What a score change replaced: undefined = the player had no score on that hole. */
export interface UndoEntry {
  holeNumber: number;
  previous: Record<PlayerId, GrossScore | undefined>;
}

export const DEFAULT_SETTINGS: RoundSettings = { holeCount: 18, allowance: 100, stakeLabel: 'points', nine: 'front' };

/** A fresh draft picks up the user's default stake label and allowance (see preferencesStore). */
const emptyDraft = (): Draft => ({ course: null, teeBoxId: null, players: [], settings: { ...DEFAULT_SETTINGS, ...draftDefaults() }, games: [] });

/** Games keep only the picked players and team seats that are still in the round (the builder then asks again). */
export function seatsFor(games: ActiveGame[], players: Player[]): ActiveGame[] {
  const ids = new Set(players.map((p) => p.id));
  return games.map((g) => {
    const teamKeys = (getGame(g.gameId)?.configFields ?? []).filter((f) => f.type === 'teams').map((f) => f.key);
    const config = { ...g.config };
    for (const k of teamKeys) if (Array.isArray(config[k])) config[k] = (config[k] as string[]).filter((id) => ids.has(id));
    return { ...g, config, ...(g.playerIds ? { playerIds: g.playerIds.filter((id) => ids.has(id)) } : {}) };
  });
}

/** A saved draft, checked field by field (anything unreadable falls back to a fresh value). A stale tee time is dropped. */
export function readDraft(saved: unknown, now: Date = new Date()): Draft {
  const fresh = emptyDraft();
  if (!saved || typeof saved !== 'object') return fresh;
  const d = saved as Partial<Draft>;
  const course = d.course && typeof d.course === 'object' && Array.isArray(d.course.holes) && d.course.holes.length > 0 && Array.isArray(d.course.teeBoxes) && d.course.teeBoxes.length > 0 ? d.course : null;
  const teeBoxId = course ? (course.teeBoxes.some((t) => t.id === d.teeBoxId) ? (d.teeBoxId as string) : course.teeBoxes[0]!.id) : null;
  const players = Array.isArray(d.players) ? d.players.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string').map((p) => (teeBoxId ? { ...p, teeBoxId } : p)) : [];
  const games = Array.isArray(d.games) ? d.games.filter((g) => g && typeof g.gameId === 'string' && !!getGame(g.gameId) && g.config && typeof g.config === 'object') : [];
  const settings: RoundSettings = { ...fresh.settings, ...(d.settings && typeof d.settings === 'object' ? d.settings : {}) };
  if (settings.teeTime && teeTimeIsStale(settings.teeTime, now)) delete settings.teeTime;
  return { course, teeBoxId, players, settings, games };
}

/** Holes in play for a round's settings, in the order they are played. */
export function orderFor(course: Course, settings: RoundSettings) {
  return playOrder(holesInPlay(course, settings.holeCount, settings.nine), settings.startHole);
}

interface RoundState {
  hydrated: boolean;
  /** Set when the saved round could not be read; Home shows a note and offers a fresh start. */
  hydrateError: string | null;
  draft: Draft;
  round: Round | null;
  /** Most recent last. Cleared whenever the round changes hands. */
  undo: UndoEntry[];

  hydrate(): Promise<void>;

  // Setup
  setDraftCourse(course: Course, teeBoxId: string): void;
  setDraftPlayers(players: Player[]): void;
  setDraftSettings(patch: Partial<RoundSettings>): void;
  setDraftGames(games: ActiveGame[]): void;
  /** Start from the draft. `games` defaults to the draft's own (the builder passes only those that fit the group). */
  startRound(games?: ActiveGame[]): Round | null;

  // Play
  setScore(playerId: PlayerId, holeNumber: number, score: GrossScore): void;
  /** Several players on one hole in one step ("everyone par"): one undo entry. */
  setScores(holeNumber: number, scores: PlayerScores): void;
  /** Revert the last score change; returns to that hole when it is not the current one. */
  undoLastScore(): UndoEntry | null;
  setHoleNote(holeNumber: number, note: string): void;
  recordHole(holeNumber: number, scores: PlayerScores): void;
  setGameInputs(holeNumber: number, gameId: string, inputs: Record<string, string>): void;
  setCurrentHole(holeNumber: number): void;
  setGames(games: ActiveGame[]): void;
  /** Mid-round settings changes. Start hole and nine are locked once a score exists. */
  updateSettings(patch: Partial<RoundSettings>): void;
  finishRound(): void;
  discardRound(): void;
}

/** Orchestration only. Rules live in lib/ and games/. Every mutation persists immediately. */
export const useRoundStore = create<RoundState>()((set, get) => {
  const persist = (round: Round | null) => {
    void (round ? storage.set(STORAGE_KEYS.activeRound, round) : storage.remove(STORAGE_KEYS.activeRound));
  };

  const persistDraft = (draft: Draft) => void storage.set(STORAGE_KEYS.draft, draft);
  const setDraft = (fn: (draft: Draft) => Draft) => {
    const draft = fn(get().draft);
    set({ draft });
    persistDraft(draft);
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
    undo: [],

    async hydrate() {
      try {
        const [round, savedDraft] = await Promise.all([storage.get<Round>(STORAGE_KEYS.activeRound), storage.get<unknown>(STORAGE_KEYS.draft)]);
        const valid = round && Array.isArray(round.players) && Array.isArray(round.holeResults) && round.course?.holes?.length ? round : null;
        set({
          draft: readDraft(savedDraft),
          round: valid,
          undo: [],
          hydrated: true,
          hydrateError: round && !valid ? 'The saved round was unreadable, so it was cleared.' : null,
        });
        if (round && !valid) persist(null);
      } catch (e) {
        set({ round: null, hydrated: true, hydrateError: e instanceof Error ? e.message : 'Could not read saved data.' });
      }
    },

    setDraftCourse(course, teeBoxId) {
      setDraft((d) => ({
        ...d,
        course,
        teeBoxId,
        // Keep players, but point them at the new tee.
        players: d.players.map((p) => ({ ...p, teeBoxId })),
        // A start hole from another course may not exist here.
        settings: { ...d.settings, startHole: undefined },
      }));
    },

    setDraftPlayers(players) {
      setDraft((d) => ({ ...d, players, games: seatsFor(d.games, players) }));
    },

    setDraftSettings(patch) {
      setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    },

    setDraftGames(games) {
      setDraft((d) => ({ ...d, games }));
    },

    startRound(gamesArg) {
      const { draft } = get();
      const games = gamesArg ?? draft.games;
      if (!draft.course || !draft.teeBoxId) return null;
      const named = draft.players.filter((p) => p.name.trim().length > 0);
      if (named.length < MIN_PLAYERS || named.length > MAX_PLAYERS) return null;
      const now = new Date().toISOString();
      // Profiles: link, record index changes and the date played.
      const players = useProfileStore.getState().syncFromRound(named, now);
      const settings: RoundSettings = { ...DEFAULT_SETTINGS, ...draft.settings };
      const inPlay = holesInPlay(draft.course, settings.holeCount, settings.nine);
      if (settings.startHole != null && !inPlay.some((h) => h.number === settings.startHole)) delete settings.startHole;
      const order = playOrder(inPlay, settings.startHole);
      const round: Round = {
        id: newId('round'),
        createdAt: now,
        updatedAt: now,
        status: 'in-progress',
        course: draft.course,
        teeBoxId: draft.teeBoxId,
        players,
        games,
        settings,
        holeResults: [],
        currentHole: order[0]?.number ?? 1,
      };
      set({ round, draft: emptyDraft(), undo: [] });
      persist(round);
      void storage.remove(STORAGE_KEYS.draft);
      return round;
    },

    setScore(playerId, holeNumber, score) {
      get().setScores(holeNumber, { [playerId]: score });
    },

    setScores(holeNumber, scores) {
      const current = get().round;
      if (!current) return;
      const existing = current.holeResults.find((h) => h.holeNumber === holeNumber)?.scores ?? {};
      const previous: UndoEntry['previous'] = {};
      for (const id of Object.keys(scores)) previous[id] = id in existing ? existing[id] : undefined;
      set((s) => ({ undo: [...s.undo, { holeNumber, previous }].slice(-MAX_UNDO) }));
      update((r) => ({
        ...r,
        holeResults: upsertHole(r.holeResults, holeNumber, (h) => ({ ...h, scores: { ...h.scores, ...scores } })),
      }));
    },

    undoLastScore() {
      const entry = get().undo[get().undo.length - 1];
      if (!entry || !get().round) return null;
      set((s) => ({ undo: s.undo.slice(0, -1) }));
      update((r) => ({
        ...r,
        currentHole: holePosition(orderFor(r.course, r.settings), entry.holeNumber) ? entry.holeNumber : r.currentHole,
        holeResults: upsertHole(r.holeResults, entry.holeNumber, (h) => {
          const next = { ...h.scores };
          for (const [id, prev] of Object.entries(entry.previous)) {
            if (prev === undefined) delete next[id];
            else next[id] = prev;
          }
          return { ...h, scores: next };
        }),
      }));
      return entry;
    },

    setHoleNote(holeNumber, note) {
      const text = note.trim().slice(0, MAX_NOTE_LENGTH);
      update((r) => ({
        ...r,
        holeResults: upsertHole(r.holeResults, holeNumber, (h) => {
          const { note: _old, ...rest } = h;
          return text ? { ...rest, note: text } : rest;
        }),
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
      const current = get().round;
      if (!current) return;
      if (holePosition(orderFor(current.course, current.settings), holeNumber) === 0) return;
      update((r) => ({ ...r, currentHole: holeNumber }));
    },

    setGames(games) {
      update((r) => ({ ...r, games }));
    },

    updateSettings(patch) {
      update((r) => {
        const locked = r.holeResults.some((h) => Object.keys(h.scores).length > 0);
        const next: RoundSettings = { ...r.settings, ...patch };
        if (locked) {
          next.holeCount = r.settings.holeCount;
          next.nine = r.settings.nine;
          next.startHole = r.settings.startHole;
        }
        return { ...r, settings: next };
      });
    },

    finishRound() {
      update((r) => ({ ...r, status: 'complete' }));
    },

    discardRound() {
      set({ round: null, undo: [] });
      persist(null);
    },
  };
});
