import type { TeeBoxId } from './course';

export type PlayerId = string;
export type ProfileId = string;
export type GroupId = string;

export interface Player {
  id: PlayerId;
  name: string;
  /** Handicap index as entered, e.g. 8.2 or -1.8 for a plus handicap. Undefined = scratch / gross only. */
  handicapIndex?: number;
  teeBoxId: TeeBoxId;
  /** First hole this player is scored on. Defaults to 1; supports joining mid-round. */
  startsAtHole?: number;
  /** The saved profile this round-player came from. Set when a round starts. */
  profileId?: ProfileId;
}

/** One change to a profile's handicap index. `null` = the index was cleared (plays scratch). */
export interface IndexEntry {
  at: string; // ISO
  index: number | null;
}

/** A person who plays in this phone's rounds. Outlives any one round. */
export interface PlayerProfile {
  id: ProfileId;
  name: string;
  /** Current index; undefined = scratch / gross only. */
  handicapIndex?: number;
  /** Every index change, oldest first. */
  indexHistory: IndexEntry[];
  createdAt: string; // ISO
  lastPlayedAt?: string; // ISO
}

/** A named set of profiles that can fill the Players step in one tap. */
export interface PlayerGroup {
  id: GroupId;
  name: string;
  /** 2–4 profile ids, in seat order. */
  memberIds: ProfileId[];
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
