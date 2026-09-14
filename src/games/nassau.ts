import type { GameMode, GameState, ProgressionCell, Settlement, Standings } from './types';
import { cfg, scoresFor, stakeOf } from './types';
import { formatMatchStatus } from '../lib/format';

type Outcome = 'a' | 'b' | 'half' | 'skip';

interface Bet {
  key: string;
  label: string;
  from: number;
  to: number;
  lead: number;
  thru: number;
  closed: { lead: number; remaining: number } | null;
  /** True for an automatic press. */
  press: boolean;
}

interface NassauState extends GameState {
  bets: Bet[];
  results: { holeNumber: number; outcome: Outcome }[];
}

function decide(bet: Bet, holeNumber: number, outcome: Outcome): Bet {
  if (bet.closed || holeNumber < bet.from || holeNumber > bet.to) return bet;
  const lead = bet.lead + (outcome === 'a' ? 1 : outcome === 'b' ? -1 : 0);
  const remaining = bet.to - holeNumber;
  const closed = Math.abs(lead) > remaining || remaining === 0 ? { lead: Math.abs(lead), remaining } : null;
  return { ...bet, lead, thru: holeNumber, closed };
}

/**
 * Three match-play bets at one stake: front nine, back nine, overall. Optional automatic presses:
 * when a player falls two down in the front or back, a new bet starts on the next hole to the end of that nine.
 * A nine-hole round collapses to a single match.
 */
export const nassau: GameMode = {
  id: 'nassau',
  name: 'Nassau',
  category: 'betting',
  blurb: 'Three matches: front nine, back nine, overall.',
  rules:
    'Three separate match-play bets at the same stake: the front nine, the back nine, and all eighteen. Each is won, lost or halved on its own. With presses on, whenever a player goes two down on the front or back a new bet starts from the next hole to the end of that nine, for the same stake. Played net off the lower handicap. On a nine-hole round there is just the one match.',
  minPlayers: 2,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  participantCount: 2,
  configFields: [
    { key: 'stake', label: 'Stake', type: 'number', default: 5, min: 1, max: 100, unit: 'per bet', help: 'Front, back and overall each' },
    { key: 'presses', label: 'Auto press', type: 'boolean', default: false, help: 'New bet when a player goes 2 down' },
    { key: 'playOffLow', label: 'Play off low handicap', type: 'boolean', default: true, help: 'Subtract the lower handicap from both' },
  ],

  initState(ctx): NassauState {
    const nine = ctx.holeCount === 9;
    const bets: Bet[] = nine
      ? [{ key: 'match', label: 'Match', from: 1, to: 9, lead: 0, thru: 0, closed: null, press: false }]
      : [
          { key: 'front', label: 'Front', from: 1, to: 9, lead: 0, thru: 0, closed: null, press: false },
          { key: 'back', label: 'Back', from: 10, to: 18, lead: 0, thru: 0, closed: null, press: false },
          { key: 'overall', label: 'Overall', from: 1, to: 18, lead: 0, thru: 0, closed: null, press: false },
        ];
    return { bets, results: [] };
  },

  onHoleComplete(prev, hole, ctx): NassauState {
    const state = prev as NassauState;
    const [a, b] = ctx.participants;
    if (!a || !b) return state;
    const scores = scoresFor(ctx, hole);
    const sa = scores.find((s) => s.playerId === a.id)?.score;
    const sb = scores.find((s) => s.playerId === b.id)?.score;
    let outcome: Outcome;
    if (sa == null && sb == null) outcome = 'skip';
    else if (sa == null) outcome = 'b';
    else if (sb == null) outcome = 'a';
    else outcome = sa < sb ? 'a' : sb < sa ? 'b' : 'half';

    let bets = state.bets.map((bet) => decide(bet, hole.holeNumber, outcome));

    if (cfg(ctx, 'presses', false)) {
      // A press opens on the next hole each time the deficit in the front or back (or an open press)
      // grows to a new even number: 2 down, then 4 down, and so on. Never on the overall.
      const presses: Bet[] = [];
      for (const bet of bets) {
        const before = state.bets.find((x) => x.key === bet.key);
        const deficit = Math.abs(bet.lead);
        const grew = deficit > Math.abs(before?.lead ?? 0);
        if (bet.key === 'overall' || bet.closed || deficit < 2 || deficit % 2 !== 0 || !grew) continue;
        if (hole.holeNumber >= bet.to) continue;
        if (presses.some((x) => x.from === hole.holeNumber + 1 && x.to === bet.to)) continue;
        presses.push({ key: `press-${hole.holeNumber + 1}-${bet.to}`, label: `Press ${hole.holeNumber + 1}–${bet.to}`, from: hole.holeNumber + 1, to: bet.to, lead: 0, thru: 0, closed: null, press: true });
      }
      bets = [...bets, ...presses];
    }
    return { bets, results: [...state.results, { holeNumber: hole.holeNumber, outcome }] };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as NassauState;
    const [a, b] = ctx.participants;
    const status = (bet: Bet) =>
      formatMatchStatus({
        leaderName: bet.lead > 0 ? a?.name : bet.lead < 0 ? b?.name : undefined,
        lead: Math.abs(bet.lead),
        thru: bet.thru,
        holesRemaining: bet.to - Math.max(bet.thru, bet.from - 1),
        closed: bet.closed != null,
      });
    const main = state.bets.filter((x) => !x.press);
    const short = (bet: Bet) => {
      const name = bet.lead > 0 ? a?.name : bet.lead < 0 ? b?.name : undefined;
      if (bet.closed) return name ? `${name} won ${bet.label.toLowerCase()}` : `${bet.label} halved`;
      if (bet.thru < bet.from) return `${bet.label} not started`;
      return bet.lead === 0 ? `${bet.label} AS` : `${name} ${Math.abs(bet.lead)} up ${bet.label.toLowerCase()}`;
    };
    const thru = state.results.length ? state.results[state.results.length - 1]!.holeNumber : 0;
    const headline = thru ? main.map(short).join(' · ') : 'All square';
    const presses = state.bets.filter((x) => x.press);
    const byHole = new Map(state.results.map((r) => [r.holeNumber, r.outcome]));
    const progression: ProgressionCell[] = [];
    for (let n = 1; n <= ctx.holeCount; n++) {
      const o = byHole.get(n);
      progression.push({ holeNumber: n, tone: o === 'a' ? 'a' : o === 'b' ? 'b' : o === 'half' ? 'half' : 'none' });
    }
    return {
      gameId: 'nassau',
      basis: ctx.active.basis,
      headline,
      subline: a && b ? `${a.name} vs ${b.name}${presses.length ? ` · ${presses.length} press${presses.length > 1 ? 'es' : ''} open` : ''}` : 'Pick two players',
      lines: state.bets.map((bet) => ({ text: `${bet.label} · ${status(bet)}`, value: bet.lead })),
      progression,
      closed: state.bets.every((x) => x.closed),
    };
  },

  getSettlement(prev, ctx): Settlement | null {
    const state = prev as NassauState;
    const stake = stakeOf(ctx);
    const [a, b] = ctx.participants;
    if (!stake || !a || !b) return null;
    const entries: Settlement['entries'] = [];
    for (const bet of state.bets) {
      if (!bet.closed || bet.lead === 0) continue;
      const winner = bet.lead > 0 ? a : b;
      const loser = bet.lead > 0 ? b : a;
      const result = bet.closed.remaining > 0 ? `${bet.closed.lead}&${bet.closed.remaining}` : `${bet.closed.lead} up`;
      entries.push({ from: loser.id, to: winner.id, amount: stake, reason: `Nassau ${bet.label.toLowerCase()} · ${winner.name} won ${result} = ${stake}` });
    }
    return { gameId: 'nassau', entries };
  },
};
