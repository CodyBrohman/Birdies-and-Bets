import type { TeeBoxId } from './course';

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  /** Handicap index as entered, e.g. 8.2 or -1.8 for a plus handicap. Undefined = scratch / gross only. */
  handicapIndex?: number;
  teeBoxId: TeeBoxId;
  /** First hole this player is scored on. Defaults to 1; supports joining mid-round. */
  startsAtHole?: number;
}

/** Derived per-round handicap state, computed at setup and shown to the player. */
export interface PlayerRoundState {
  playerId: PlayerId;
  courseHandicap: number;
  /** After the round-level allowance percentage is applied. */
  playingHandicap: number;
  /** Strokes received on each hole, keyed by hole number. Negative means a stroke is given back. */
  strokesByHole: Record<number, number>;
}
