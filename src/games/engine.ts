// Runs a game over a round. Pure: the same round always yields the same result.
import type { ActiveGame, Round } from '../types/round';
import type { GameContext, GameMode, GameState, Settlement, Standings } from '../types/game';
import type { PlayerId, PlayerRoundState } from '../types/player';
import { applyMatchDifferential, computeAllHandicaps, holesInPlay } from '../lib/handicap';
import { playedResults } from '../lib/scoring';
import { cfg } from './types';

export interface GameRun {
  gameId: string;
  mode: GameMode;
  state: GameState;
  standings: Standings;
  settlement: Settlement | null;
}

/** Build the context a game sees. Applies the match-play differential when the game asks for it. */
export function buildContext(round: Round, active: ActiveGame, mode: GameMode, baseHandicaps?: Record<PlayerId, PlayerRoundState>): GameContext {
  const participants = active.playerIds ? round.players.filter((p) => active.playerIds!.includes(p.id)) : round.players;
  let handicaps = baseHandicaps ?? computeAllHandicaps(round.players, round.course, round.settings);
  const holes = holesInPlay(round.course, round.settings.holeCount);
  const ctx: GameContext = {
    course: round.course,
    players: round.players,
    participants,
    handicaps,
    active,
    settings: round.settings,
    holeCount: round.settings.holeCount,
  };
  const playOffLow = mode.configFields.some((f) => f.key === 'playOffLow') && cfg(ctx, 'playOffLow', true) === true;
  if (playOffLow && active.basis === 'net') {
    handicaps = applyMatchDifferential(
      handicaps,
      participants.map((p) => p.id),
      holes,
    );
    ctx.handicaps = handicaps;
  }
  return ctx;
}

/** Fold every played hole through the game, in order. Editing hole 4 at hole 12 simply reruns this. */
export function runGame(round: Round, active: ActiveGame, mode: GameMode, baseHandicaps?: Record<PlayerId, PlayerRoundState>): GameRun {
  const ctx = buildContext(round, active, mode, baseHandicaps);
  let state = mode.initState(ctx);
  for (const hole of playedResults(round.holeResults)) {
    if (hole.holeNumber > round.settings.holeCount) continue;
    state = mode.onHoleComplete(state, hole, ctx);
  }
  return {
    gameId: active.gameId,
    mode,
    state,
    standings: mode.getStandings(state, ctx),
    settlement: mode.getSettlement(state, ctx),
  };
}
