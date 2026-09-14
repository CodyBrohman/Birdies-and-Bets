import type { Course, TeeBoxId } from './course';
import type { Player, PlayerId } from './player';

export type RoundId = string;
export type GameId = string;

/**
 * A player's gross strokes on one hole.
 * `null` means "no score" — the player picked up. Distinct from unentered (absent key).
 */
export type GrossScore = number | null;

export type PlayerScores = Record<PlayerId, GrossScore>;

/** Answers to game-declared hole inputs, keyed by game id then input key. */
export type GameInputs = Record<GameId, Record<string, string>>;

export interface HoleResult {
  holeNumber: number;
  scores: PlayerScores;
  gameInputs?: GameInputs;
}

export type ScoringBasis = 'gross' | 'net';

export interface ActiveGame {
  gameId: GameId;
  /** Values for that game's configFields, keyed by field key. */
  config: Record<string, string | number | boolean | string[]>;
  basis: ScoringBasis;
  /** Subset of players in this game (e.g. a two-player match inside a foursome). Undefined = everyone. */
  playerIds?: PlayerId[];
}

export type HoleCount = 9 | 18;

export interface RoundSettings {
  holeCount: HoleCount;
  /** Percentage of course handicap applied. Default 100. */
  allowance: number;
  /** Label for stakes. Default "points"; the app never suggests a currency. */
  stakeLabel: string;
}

export type RoundStatus = 'in-progress' | 'complete';

/** Single source of truth for a round and the only thing persisted. */
export interface Round {
  id: RoundId;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  status: RoundStatus;
  course: Course;
  teeBoxId: TeeBoxId;
  players: Player[];
  games: ActiveGame[];
  settings: RoundSettings;
  holeResults: HoleResult[];
  /** Hole the scorekeeper is currently on. */
  currentHole: number;
}
