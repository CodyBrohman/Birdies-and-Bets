import type { GameMode, GameState, Standings } from './types';
import { cfg, nameOf, pickedUp, scoresFor } from './types';
import { highest } from '../lib/scoring';

export const DEFAULT_PUNISHMENTS = [
  'Putt with a wedge',
  'Tee off with an iron',
  'Play the hole from the forward tees, no mulligans',
  'Carry the drinks',
  'Announce your score out loud',
  'Wear the hat',
];

interface HotSeatState extends GameState {
  holder: string | null;
  /** Hole the current holder took the seat on. */
  since: number | null;
  /** Score that put them there (for the subline). */
  score: number | null;
  /** How many times each player has taken the seat. */
  taken: Record<string, number>;
  /** Index into the punishment list for the next hole. */
  punishmentIndex: number;
  /** Holes on which the seat holder confirmed serving the punishment. */
  served: Record<string, number>;
  thru: number;
}

/**
 * Worst score on a hole takes the hot seat and serves a punishment on the next hole.
 * Ties for worst: the current holder keeps it if they are among the tied; otherwise the seat is empty.
 * A pick-up is the worst score on the hole.
 */
export const hotSeat: GameMode = {
  id: 'hot-seat',
  name: 'Hot Seat',
  category: 'social',
  blurb: 'Worst score on the hole earns a punishment on the next.',
  rules:
    'The highest score on each hole takes the hot seat and serves the next punishment on the list on the following hole. Tie for worst and the seat stays where it is — or stays empty. Picking up counts as worst. Write your own punishments; nothing is at stake but pride.',
  minPlayers: 2,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  configFields: [{ key: 'punishments', label: 'Punishments', type: 'list', default: DEFAULT_PUNISHMENTS, help: 'Served in order, one per hole in the seat' }],
  holeInputs: [{ key: 'served', label: 'Punishment served this hole', type: 'confirm' }],

  initState(): HotSeatState {
    return { holder: null, since: null, score: null, taken: {}, punishmentIndex: 0, served: {}, thru: 0 };
  },

  onHoleComplete(prev, hole, ctx): HotSeatState {
    const state = prev as HotSeatState;
    const scores = scoresFor(ctx, hole);
    const picked = pickedUp(ctx, hole);
    // Anyone who picked up is worst; otherwise the highest score.
    const worst = picked.length ? picked : highest(scores).map((s) => s.playerId);
    const worstScore = picked.length ? null : (highest(scores)[0]?.score ?? null);
    const served = { ...state.served };
    if (state.holder && hole.gameInputs?.['hot-seat']?.served === 'yes') served[state.holder] = (served[state.holder] ?? 0) + 1;
    if (worst.length === 0) return { ...state, served, thru: hole.holeNumber };

    let holder = state.holder;
    let since = state.since;
    let score = state.score;
    const taken = { ...state.taken };
    let punishmentIndex = state.punishmentIndex;

    if (worst.length === 1) {
      const next = worst[0]!;
      if (next !== holder) {
        holder = next;
        since = hole.holeNumber;
        score = worstScore;
        taken[next] = (taken[next] ?? 0) + 1;
      }
      punishmentIndex = state.holder ? state.punishmentIndex + 1 : state.punishmentIndex;
    } else if (holder && worst.includes(holder)) {
      // Holder tied for worst again: keeps the seat, next punishment.
      punishmentIndex = state.punishmentIndex + 1;
    } else {
      holder = null;
      since = null;
      score = null;
    }
    return { holder, since, score, taken, punishmentIndex, served, thru: hole.holeNumber };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as HotSeatState;
    const list = cfg<string[]>(ctx, 'punishments', DEFAULT_PUNISHMENTS);
    const punishment = list.length ? list[state.punishmentIndex % list.length] : undefined;
    const next = state.thru + 1;
    let headline: string;
    let subline: string | undefined;
    if (!state.thru) {
      headline = 'Seat is empty';
      subline = 'Worst score on a hole takes it.';
    } else if (state.holder) {
      headline = `${nameOf(ctx, state.holder)} is in the hot seat${next <= ctx.holeCount ? ' — next hole' : ''}`;
      const took = state.score != null ? `Took it on ${state.since} with a ${ctx.active.basis} ${state.score}` : `Picked up on ${state.since}`;
      subline = punishment && next <= ctx.holeCount ? `${took} · ${punishment}` : took;
    } else {
      headline = `Seat is empty — tied worst on ${state.thru}`;
      subline = 'Nobody serves on the next hole.';
    }
    const rows = ctx.participants.map((p) => ({ p, n: state.taken[p.id] ?? 0 })).sort((a, b) => b.n - a.n);
    return {
      gameId: 'hot-seat',
      basis: ctx.active.basis,
      headline,
      subline,
      lines: rows.map((r) => ({ playerId: r.p.id, text: `${r.p.name} · in the seat ${r.n}×${state.served[r.p.id] ? ` · served ${state.served[r.p.id]}` : ''}`, value: r.n })),
    };
  },

  getSettlement() {
    return null;
  },
};
