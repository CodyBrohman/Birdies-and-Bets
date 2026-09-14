import type { Course } from './course';
import type { Player, PlayerId, PlayerRoundState } from './player';
import type { ActiveGame, GameId, HoleResult, RoundSettings, ScoringBasis } from './round';

export type GameCategory = 'betting' | 'social';

// ---------- Setup-time configuration ----------

export type ConfigField =
  | {
      key: string;
      label: string;
      type: 'number';
      default: number;
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
      help?: string;
    }
  | { key: string; label: string; type: 'boolean'; default: boolean; help?: string }
  | {
      key: string;
      label: string;
      type: 'choice';
      default: string;
      options: { value: string; label: string }[];
      help?: string;
    }
  | { key: string; label: string; type: 'list'; default: string[]; help?: string }
  /** Split the participants into two teams. Value = player ids on team A; everyone else is team B. */
  | { key: string; label: string; type: 'teams'; default: string[]; teamSize: number; help?: string };

// ---------- Per-hole extra input ----------

/** A condition on an earlier answer for the same game and hole. */
export interface ShowIf {
  key: string;
  equals: string;
}

export type HoleInputSpec =
  | { key: string; label: string; type: 'player'; showIf?: ShowIf }
  | { key: string; label: string; type: 'choice'; options: string[]; showIf?: ShowIf }
  /** Optional acknowledgement; never blocks confirming the hole. */
  | { key: string; label: string; type: 'confirm'; showIf?: ShowIf };

// ---------- Runtime ----------

export interface GameContext {
  course: Course;
  players: Player[];
  /** Players participating in this game (respects ActiveGame.playerIds). */
  participants: Player[];
  handicaps: Record<PlayerId, PlayerRoundState>;
  active: ActiveGame;
  settings: RoundSettings;
  holeCount: number;
}

/** Opaque, serializable, fully recomputable from the hole array. */
export type GameState = Record<string, unknown>;

export interface StandingsLine {
  playerId?: PlayerId;
  text: string;
  /** Numeric position or score for sorting/display where the game defines one. */
  value?: number;
}

/** One cell of a per-hole progression strip, rendered generically by the standings card. */
export interface ProgressionCell {
  holeNumber: number;
  /** Short label inside the cell (an initial, "×2", "↷"). Empty for a bare bar. */
  label?: string;
  /**
   * Visual tone. 'a'/'b' = the two sides of a head-to-head (bar up / bar down),
   * 'half' = halved, 'win' = filled chip, 'carry' = tinted chip, 'none' = unplayed.
   */
  tone: 'a' | 'b' | 'half' | 'win' | 'carry' | 'none';
}

export interface Standings {
  gameId: GameId;
  basis: ScoringBasis;
  /** One-line headline in the game's own vocabulary, e.g. "Cody 2 up thru 6". */
  headline: string;
  /** Optional secondary line, e.g. "Hole 7 is worth 2 skins". */
  subline?: string;
  lines: StandingsLine[];
  /** Optional per-hole strip (match progression, skins ledger). */
  progression?: ProgressionCell[];
  /** True when the game can no longer change (e.g. match closed out). */
  closed?: boolean;
}

export interface SettlementEntry {
  from: PlayerId;
  to: PlayerId;
  amount: number;
  /** Human-readable reason for the audit view. */
  reason: string;
}

export interface Settlement {
  gameId: GameId;
  entries: SettlementEntry[];
}

export interface GameMode {
  id: GameId;
  name: string;
  category: GameCategory;
  /** One line, shown in the picker. */
  blurb: string;
  /** Full explanation, shown on expand. */
  rules: string;

  minPlayers: number;
  maxPlayers: number;
  supportsNet: boolean;
  /** Default scoring basis when the game is added. */
  defaultBasis: ScoringBasis;
  /**
   * When set, the user picks exactly this many players from the group to take part
   * (e.g. a two-player match inside a foursome). Otherwise everyone plays.
   */
  participantCount?: number;

  configFields: ConfigField[];
  holeInputs?: HoleInputSpec[];

  initState(ctx: GameContext): GameState;
  onHoleComplete(state: GameState, hole: HoleResult, ctx: GameContext): GameState;
  getStandings(state: GameState, ctx: GameContext): Standings;
  getSettlement(state: GameState, ctx: GameContext): Settlement | null;
}
