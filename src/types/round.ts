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
  /** Free text the scorekeeper attached to the hole. */
  note?: string;
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

export type Nine = 'front' | 'back';

export interface RoundSettings {
  holeCount: HoleCount;
  /** Which nine when holeCount is 9. Default front. */
  nine?: Nine;
  /** Shotgun start: the first hole played. Default: the first hole in play. */
  startHole?: number;
  /** Percentage of course handicap applied. Default 100. */
  allowance: number;
  /** Label for stakes. Default "points"; the app never suggests a currency. */
  stakeLabel: string;
  /** Planned tee time, ISO local date-time ("2026-10-03T08:30"). Display only. */
  teeTime?: string;
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

// ---------- History ----------

export interface RoundSummaryPlayer {
  id: PlayerId;
  name: string;
  gross: number;
  net: number;
  grossToPar: number;
  playingHandicap: number;
  holesPickedUp: number;
}

/** What history persists per finished round: the summary for the list, the full round for detail. */
export interface HistoryEntry {
  summary: RoundSummary;
  /** Absent for rounds saved before full history existed. */
  round?: Round;
}

/** A finished round, boiled down for the Home list. Display only. */
export interface RoundSummary {
  id: RoundId;
  completedAt: string; // ISO
  courseName: string;
  teeName?: string;
  holeCount: HoleCount;
  gameNames: string[];
  players: RoundSummaryPlayer[];
  /** Featured on Home: lowest net when anyone has strokes, else lowest gross. */
  leaderId: PlayerId;
  /** "+12 pts", "38 pts", "+4" — precomputed so Home stays dumb. */
  resultLabel: string;
}
