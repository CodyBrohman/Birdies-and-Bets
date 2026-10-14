import type { ActiveGame, Course, Player, RoundSettings } from '@/types';
import { useRoundStore } from './roundStore';

/** Which round a games or options sheet edits: the one being set up, or the one in progress. */
export type GamesTarget = 'draft' | 'round';

export interface GamesTargetState {
  course: Course | null;
  players: Player[];
  games: ActiveGame[];
  settings: RoundSettings;
  /** The round in progress has a score: the start hole and nine are locked. */
  scored: boolean;
  setGames: (games: ActiveGame[]) => void;
  setSettings: (patch: Partial<RoundSettings>) => void;
}

/** One interface over the draft and the round in progress, so the game sheets serve both. */
export function useGamesTarget(target: GamesTarget): GamesTargetState {
  const draft = useRoundStore((s) => s.draft);
  const round = useRoundStore((s) => s.round);
  const setDraftGames = useRoundStore((s) => s.setDraftGames);
  const setRoundGames = useRoundStore((s) => s.setGames);
  const setDraftSettings = useRoundStore((s) => s.setDraftSettings);
  const updateSettings = useRoundStore((s) => s.updateSettings);
  const live = target === 'round' && round?.status === 'in-progress' ? round : null;
  if (live) {
    return {
      course: live.course,
      players: live.players,
      games: live.games,
      settings: live.settings,
      scored: live.holeResults.some((h) => Object.keys(h.scores).length > 0),
      setGames: setRoundGames,
      setSettings: updateSettings,
    };
  }
  return {
    course: draft.course,
    players: draft.players.filter((p) => p.name.trim()),
    games: draft.games,
    settings: draft.settings,
    scored: false,
    setGames: setDraftGames,
    setSettings: setDraftSettings,
  };
}

/** The `target` route param, defaulting to the draft. */
export function targetFrom(param: string | string[] | undefined): GamesTarget {
  return param === 'round' ? 'round' : 'draft';
}
