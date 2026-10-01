import type { GameMode, GameState, Settlement, Standings } from './types';
import { nextAfter, paySide, positionOf, progressionFor, remainingAfter, sideName, sideOutcome, sidesOf, sidesReady, stakeOf, type SideOutcome } from './types';
import { formatMatchStatus } from '../lib/format';

interface MatchState extends GameState {
  /** Per hole: which side won. */
  results: { holeNumber: number; outcome: SideOutcome }[];
  /** Positive = A leads, negative = B leads. */
  lead: number;
  /** Holes played (position in the play order). */
  thru: number;
  /** Last hole played, by number. 0 before the first. */
  lastHole: number;
  /** Set when the match is mathematically decided. */
  closed: { lead: number; remaining: number } | null;
}

/**
 * Head to head, hole by hole: two players, or two teams of two on best ball. Win a hole to go one up;
 * ties halve. The match closes out when one side leads by more holes than remain ("3&2").
 * Net play is off the low handicapper among everyone in the match.
 */
export const matchPlay: GameMode = {
  id: 'match-play',
  name: 'Match Play',
  category: 'betting',
  blurb: 'Head to head, hole by hole. Singles or 2 v 2.',
  rules:
    'Two players, or with a foursome two teams of two playing best ball. Win a hole, go one up; halve it and nothing changes. The match ends when one side leads by more holes than remain, e.g. 3&2. If it reaches the last hole all square, the match is halved. The stake is paid once by each loser to the winner opposite. When played net, strokes are taken off the lowest handicap in the match so the best player plays scratch.',
  minPlayers: 2,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  participantCount: 2,
  participantCountFor: (config) => (config.format === 'teams' ? undefined : 2),
  configFields: [
    {
      key: 'format',
      label: 'Format',
      type: 'choice',
      default: 'singles',
      options: [
        { value: 'singles', label: '1 v 1' },
        { value: 'teams', label: '2 v 2' },
      ],
      requiresPlayers: 4,
      help: 'Teams play best ball',
    },
    { key: 'teams', label: 'Team A', type: 'teams', default: [], teamSize: 2, showWhen: { key: 'format', equals: 'teams' }, help: 'The other two are team B' },
    { key: 'stake', label: 'Stake', type: 'number', default: 5, min: 1, max: 100, help: 'Paid once by each loser' },
    { key: 'playOffLow', label: 'Play off low handicap', type: 'boolean', default: true, help: 'Subtract the lowest handicap from everyone' },
  ],

  initState(): MatchState {
    return { results: [], lead: 0, thru: 0, lastHole: 0, closed: null };
  },

  onHoleComplete(prev, hole, ctx): MatchState {
    const state = prev as MatchState;
    if (state.closed) return state;
    const sides = sidesOf(ctx);
    if (!sidesReady(sides)) return state;
    const outcome = sideOutcome(ctx, hole, sides.a, sides.b);
    const lead = state.lead + (outcome === 'a' ? 1 : outcome === 'b' ? -1 : 0);
    const thru = positionOf(ctx, hole.holeNumber);
    const remaining = remainingAfter(ctx, hole.holeNumber);
    const closed = Math.abs(lead) > remaining || remaining === 0 ? { lead: Math.abs(lead), remaining } : null;
    return { results: [...state.results, { holeNumber: hole.holeNumber, outcome }], lead, thru, lastHole: hole.holeNumber, closed };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as MatchState;
    const sides = sidesOf(ctx);
    const ready = sidesReady(sides);
    const nameA = sideName(ctx, sides.a);
    const nameB = sideName(ctx, sides.b);
    const leaderName = state.lead > 0 ? nameA : state.lead < 0 ? nameB : undefined;
    const headline = !ready
      ? sides.teams
        ? 'Pick the teams'
        : 'Pick two players'
      : formatMatchStatus({
          leaderName,
          lead: Math.abs(state.lead),
          thru: state.thru,
          holesRemaining: ctx.holeCount - state.thru,
          closed: state.closed != null,
        });
    const next = nextAfter(ctx, state.lastHole);
    const subline = ready ? `${nameA} vs ${nameB}${state.closed ? '' : next != null ? ` · hole ${next} next` : ''}` : sides.teams ? 'Two players on team A, the rest on team B' : 'Pick two players';
    const byHole = new Map(state.results.map((r) => [r.holeNumber, r.outcome]));
    const progression = progressionFor(ctx, (n) => {
      const o = byHole.get(n);
      return { holeNumber: n, tone: o === 'a' ? 'a' : o === 'b' ? 'b' : o === 'half' ? 'half' : 'none' };
    });
    const won = (side: 'a' | 'b') => state.results.filter((r) => r.outcome === side).length;
    return {
      gameId: 'match-play',
      basis: ctx.active.basis,
      headline,
      subline,
      lines: ready
        ? [
            { playerId: sides.a[0], text: `${nameA} · ${won('a')} holes won`, value: state.lead },
            { playerId: sides.b[0], text: `${nameB} · ${won('b')} holes won`, value: -state.lead },
          ]
        : ctx.participants.map((p) => ({ playerId: p.id, text: p.name, value: 0 })),
      progression,
      closed: state.closed != null,
    };
  },

  getSettlement(prev, ctx): Settlement | null {
    const state = prev as MatchState;
    const stake = stakeOf(ctx);
    const sides = sidesOf(ctx);
    if (!stake || !sidesReady(sides) || !state.closed || state.lead === 0) return null;
    const winners = state.lead > 0 ? sides.a : sides.b;
    const losers = state.lead > 0 ? sides.b : sides.a;
    const result = state.closed.remaining > 0 ? `${state.closed.lead}&${state.closed.remaining}` : `${state.closed.lead} up`;
    return {
      gameId: 'match-play',
      entries: paySide(losers, winners, stake, `Match Play · ${sideName(ctx, winners)} won ${result} = ${stake}`),
    };
  },
};
