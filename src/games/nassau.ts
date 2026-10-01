import type { GameMode, GameState, Settlement, Standings } from './types';
import { cfg, paySide, positionOf, progressionFor, sideName, sideOutcome, sidesOf, sidesReady, stakeOf, type SideOutcome } from './types';
import { formatMatchStatus } from '../lib/format';

interface Bet {
  key: string;
  label: string;
  /** Hole numbers this bet covers, in play order. */
  holes: number[];
  lead: number;
  /** Holes of this bet played so far. */
  played: number;
  /** Position in the round of the last hole decided (for "thru N"); 0 before the bet starts. */
  thru: number;
  closed: { lead: number; remaining: number } | null;
  /** True for an automatic press. */
  press: boolean;
}

interface NassauState extends GameState {
  bets: Bet[];
  results: { holeNumber: number; outcome: SideOutcome }[];
}

function decide(bet: Bet, holeNumber: number, position: number, outcome: SideOutcome): Bet {
  const idx = bet.holes.indexOf(holeNumber);
  if (bet.closed || idx === -1) return bet;
  const lead = bet.lead + (outcome === 'a' ? 1 : outcome === 'b' ? -1 : 0);
  const remaining = bet.holes.length - idx - 1;
  const closed = Math.abs(lead) > remaining || remaining === 0 ? { lead: Math.abs(lead), remaining } : null;
  return { ...bet, lead, played: idx + 1, thru: position, closed };
}

/**
 * Three match-play bets at one stake: front nine, back nine, overall. Singles, or two teams of two on best ball.
 * Optional automatic presses: when a side falls two down in the front or back, a new bet starts on the next hole
 * to the end of that nine. A nine-hole round collapses to a single match. Bets are defined by hole number, so a
 * shotgun start simply plays the back bet before the front.
 */
export const nassau: GameMode = {
  id: 'nassau',
  name: 'Nassau',
  category: 'betting',
  blurb: 'Three matches: front nine, back nine, overall. Singles or 2 v 2.',
  rules:
    'Three separate match-play bets at the same stake: the front nine, the back nine, and all eighteen. Each is won, lost or halved on its own. Two players, or with a foursome two teams of two on best ball, each loser paying the winner opposite. With presses on, whenever a side goes two down on the front or back a new bet starts from the next hole to the end of that nine, for the same stake. Played net off the lowest handicap. On a nine-hole round there is just the one match.',
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
    { key: 'stake', label: 'Stake', type: 'number', default: 5, min: 1, max: 100, unit: 'per bet', help: 'Front, back and overall each' },
    { key: 'presses', label: 'Auto press', type: 'boolean', default: false, help: 'New bet when a side goes 2 down' },
    { key: 'playOffLow', label: 'Play off low handicap', type: 'boolean', default: true, help: 'Subtract the lowest handicap from everyone' },
  ],

  initState(ctx): NassauState {
    const all = ctx.holes.map((h) => h.number);
    const front = all.filter((n) => n <= 9);
    const back = all.filter((n) => n > 9);
    const bet = (key: string, label: string, holes: number[]): Bet => ({ key, label, holes, lead: 0, played: 0, thru: 0, closed: null, press: false });
    const bets: Bet[] = front.length === 0 || back.length === 0 ? [bet('match', 'Match', all)] : [bet('front', 'Front', front), bet('back', 'Back', back), bet('overall', 'Overall', all)];
    return { bets, results: [] };
  },

  onHoleComplete(prev, hole, ctx): NassauState {
    const state = prev as NassauState;
    const sides = sidesOf(ctx);
    if (!sidesReady(sides)) return state;
    const outcome = sideOutcome(ctx, hole, sides.a, sides.b);

    const position = positionOf(ctx, hole.holeNumber);
    let bets = state.bets.map((bet) => decide(bet, hole.holeNumber, position, outcome));

    if (cfg(ctx, 'presses', false)) {
      // A press opens on the next hole each time the deficit in the front or back (or an open press)
      // grows to a new even number: 2 down, then 4 down, and so on. Never on the overall.
      const presses: Bet[] = [];
      for (const bet of bets) {
        const before = state.bets.find((x) => x.key === bet.key);
        const deficit = Math.abs(bet.lead);
        const grew = deficit > Math.abs(before?.lead ?? 0);
        if (bet.key === 'overall' || bet.closed || deficit < 2 || deficit % 2 !== 0 || !grew) continue;
        const idx = bet.holes.indexOf(hole.holeNumber);
        const rest = idx === -1 ? [] : bet.holes.slice(idx + 1);
        if (rest.length === 0) continue;
        const first = rest[0]!;
        const last = rest[rest.length - 1]!;
        if (presses.some((x) => x.holes[0] === first && x.holes[x.holes.length - 1] === last)) continue;
        presses.push({ key: `press-${first}-${last}`, label: `Press ${first}–${last}`, holes: rest, lead: 0, played: 0, thru: 0, closed: null, press: true });
      }
      bets = [...bets, ...presses];
    }
    return { bets, results: [...state.results, { holeNumber: hole.holeNumber, outcome }] };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as NassauState;
    const sides = sidesOf(ctx);
    const ready = sidesReady(sides);
    const nameA = sideName(ctx, sides.a);
    const nameB = sideName(ctx, sides.b);
    const leader = (bet: Bet) => (bet.lead > 0 ? nameA : bet.lead < 0 ? nameB : undefined);
    const status = (bet: Bet) =>
      formatMatchStatus({
        leaderName: leader(bet),
        lead: Math.abs(bet.lead),
        thru: bet.thru,
        holesRemaining: bet.holes.length - bet.played,
        closed: bet.closed != null,
      });
    const main = state.bets.filter((x) => !x.press);
    const short = (bet: Bet) => {
      const name = leader(bet);
      if (bet.closed) return name ? `${name} won ${bet.label.toLowerCase()}` : `${bet.label} halved`;
      if (bet.played === 0) return `${bet.label} not started`;
      return bet.lead === 0 ? `${bet.label} AS` : `${name} ${Math.abs(bet.lead)} up ${bet.label.toLowerCase()}`;
    };
    const headline = !ready ? (sides.teams ? 'Pick the teams' : 'Pick two players') : state.results.length ? main.map(short).join(' · ') : 'All square';
    const presses = state.bets.filter((x) => x.press);
    const byHole = new Map(state.results.map((r) => [r.holeNumber, r.outcome]));
    const progression = progressionFor(ctx, (n) => {
      const o = byHole.get(n);
      return { holeNumber: n, tone: o === 'a' ? 'a' : o === 'b' ? 'b' : o === 'half' ? 'half' : 'none' };
    });
    return {
      gameId: 'nassau',
      basis: ctx.active.basis,
      headline,
      subline: ready ? `${nameA} vs ${nameB}${presses.length ? ` · ${presses.length} press${presses.length > 1 ? 'es' : ''} open` : ''}` : sides.teams ? 'Two players on team A, the rest on team B' : 'Pick two players',
      lines: state.bets.map((bet) => ({ text: `${bet.label} · ${status(bet)}`, value: bet.lead })),
      progression,
      closed: state.bets.every((x) => x.closed),
    };
  },

  getSettlement(prev, ctx): Settlement | null {
    const state = prev as NassauState;
    const stake = stakeOf(ctx);
    const sides = sidesOf(ctx);
    if (!stake || !sidesReady(sides)) return null;
    const entries: Settlement['entries'] = [];
    for (const bet of state.bets) {
      if (!bet.closed || bet.lead === 0) continue;
      const winners = bet.lead > 0 ? sides.a : sides.b;
      const losers = bet.lead > 0 ? sides.b : sides.a;
      const result = bet.closed.remaining > 0 ? `${bet.closed.lead}&${bet.closed.remaining}` : `${bet.closed.lead} up`;
      entries.push(...paySide(losers, winners, stake, `Nassau ${bet.label.toLowerCase()} · ${sideName(ctx, winners)} won ${result} = ${stake}`));
    }
    return { gameId: 'nassau', entries };
  },
};
