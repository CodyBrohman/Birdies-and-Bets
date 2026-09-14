import type { GameMode, GameState, ProgressionCell, Settlement, Standings } from './types';
import { scoresFor, stakeOf } from './types';
import { formatMatchStatus } from '../lib/format';

type HoleOutcome = 'a' | 'b' | 'half' | 'skip';

interface MatchState extends GameState {
  /** Per hole: which side won. */
  results: { holeNumber: number; outcome: HoleOutcome }[];
  /** Positive = A leads, negative = B leads. */
  lead: number;
  thru: number;
  /** Set when the match is mathematically decided. */
  closed: { lead: number; remaining: number } | null;
}

/**
 * Two players, hole by hole. Win a hole to go one up; ties halve. The match closes out
 * when one player leads by more holes than remain ("3&2"). Net play is off the low handicapper.
 */
export const matchPlay: GameMode = {
  id: 'match-play',
  name: 'Match Play',
  category: 'betting',
  blurb: 'Head to head, hole by hole.',
  rules:
    'Two players. Win a hole, go one up; halve it and nothing changes. The match ends when one player leads by more holes than remain, e.g. 3&2. If it reaches the last hole all square, the match is halved. The stake is paid once by the loser. When played net, strokes are taken off the lower handicap so the better player plays scratch.',
  minPlayers: 2,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  participantCount: 2,
  configFields: [
    { key: 'stake', label: 'Stake', type: 'number', default: 5, min: 1, max: 100, help: 'Paid once by the loser' },
    { key: 'playOffLow', label: 'Play off low handicap', type: 'boolean', default: true, help: 'Subtract the lower handicap from both' },
  ],

  initState(): MatchState {
    return { results: [], lead: 0, thru: 0, closed: null };
  },

  onHoleComplete(prev, hole, ctx): MatchState {
    const state = prev as MatchState;
    if (state.closed) return state;
    const [a, b] = ctx.participants;
    if (!a || !b) return state;
    const scores = scoresFor(ctx, hole);
    const sa = scores.find((s) => s.playerId === a.id)?.score;
    const sb = scores.find((s) => s.playerId === b.id)?.score;
    let outcome: HoleOutcome;
    if (sa == null && sb == null) outcome = 'skip';
    else if (sa == null) outcome = 'b';
    else if (sb == null) outcome = 'a';
    else outcome = sa < sb ? 'a' : sb < sa ? 'b' : 'half';
    const lead = state.lead + (outcome === 'a' ? 1 : outcome === 'b' ? -1 : 0);
    const thru = hole.holeNumber;
    const remaining = ctx.holeCount - thru;
    const closed = Math.abs(lead) > remaining || remaining === 0 ? { lead: Math.abs(lead), remaining } : null;
    return { results: [...state.results, { holeNumber: thru, outcome }], lead, thru, closed };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as MatchState;
    const [a, b] = ctx.participants;
    const leaderName = state.lead > 0 ? a?.name : state.lead < 0 ? b?.name : undefined;
    const headline = formatMatchStatus({
      leaderName,
      lead: Math.abs(state.lead),
      thru: state.thru,
      holesRemaining: ctx.holeCount - state.thru,
      closed: state.closed != null,
    });
    const next = state.thru + 1;
    const subline = a && b ? `${a.name} vs ${b.name}${state.closed ? '' : next <= ctx.holeCount ? ` · hole ${next} next` : ''}` : 'Pick two players';
    const byHole = new Map(state.results.map((r) => [r.holeNumber, r.outcome]));
    const progression: ProgressionCell[] = [];
    for (let n = 1; n <= ctx.holeCount; n++) {
      const o = byHole.get(n);
      progression.push({ holeNumber: n, tone: o === 'a' ? 'a' : o === 'b' ? 'b' : o === 'half' ? 'half' : 'none' });
    }
    return {
      gameId: 'match-play',
      basis: ctx.active.basis,
      headline,
      subline,
      lines: [
        ...(a ? [{ playerId: a.id, text: `${a.name} · ${state.results.filter((r) => r.outcome === 'a').length} holes won`, value: state.lead }] : []),
        ...(b ? [{ playerId: b.id, text: `${b.name} · ${state.results.filter((r) => r.outcome === 'b').length} holes won`, value: -state.lead }] : []),
      ],
      progression,
      closed: state.closed != null,
    };
  },

  getSettlement(prev, ctx): Settlement | null {
    const state = prev as MatchState;
    const stake = stakeOf(ctx);
    const [a, b] = ctx.participants;
    if (!stake || !a || !b || !state.closed || state.lead === 0) return null;
    const winner = state.lead > 0 ? a : b;
    const loser = state.lead > 0 ? b : a;
    const result = state.closed.remaining > 0 ? `${state.closed.lead}&${state.closed.remaining}` : `${state.closed.lead} up`;
    return {
      gameId: 'match-play',
      entries: [{ from: loser.id, to: winner.id, amount: stake, reason: `Match Play · ${winner.name} won ${result} = ${stake}` }],
    };
  },
};
