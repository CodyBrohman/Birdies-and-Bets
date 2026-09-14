import type { GameMode, GameState, Settlement, Standings } from './types';
import { cfg, scoresFor, stakeOf } from './types';
import { formatToPar } from '../lib/format';

interface VegasState extends GameState {
  /** Positive = team A ahead, in points. */
  diff: number;
  thru: number;
  holes: { holeNumber: number; a: number; b: number }[];
}

/** Two scores make a two-digit number, low digit first. A 10+ goes first ("104"); a pick-up counts as 10. */
export function vegasNumber(scores: (number | null)[], flipped: boolean): number {
  const s = scores.map((x) => (x == null ? 10 : x)).sort((x, y) => x - y);
  const [lo, hi] = [s[0] ?? 10, s[1] ?? 10];
  if (hi >= 10) return Number(`${hi}${lo}`);
  return flipped ? Number(`${hi}${lo}`) : Number(`${lo}${hi}`);
}

/** Team A is the config's list; team B is everyone else among the participants. */
export function teamsOf(ctx: { participants: { id: string }[]; active: { config: Record<string, unknown> } }): { a: string[]; b: string[] } {
  const raw = ctx.active.config.teams;
  const aIds = Array.isArray(raw) ? (raw as string[]) : [];
  const ids = ctx.participants.map((p) => p.id);
  const a = ids.filter((id) => aIds.includes(id));
  const b = ids.filter((id) => !aIds.includes(id));
  return { a, b };
}

/**
 * Two-person teams. Each team's scores form a two-digit number, low digit first; the difference is the points
 * on the hole. With flip on, a birdie or better by one team flips the other team's number high digit first.
 */
export const vegas: GameMode = {
  id: 'vegas',
  name: 'Vegas',
  category: 'betting',
  blurb: 'Teams of two. A 4 and a 6 make 46. Difference is the bet.',
  rules:
    'Two teams of two. On each hole a team’s two scores form a two-digit number with the lower score first: a 4 and a 6 make 46. The difference between the two numbers is the points won on the hole. A 10 or worse goes first, and a pick-up counts as 10. With flip on, a birdie or better flips the other team’s number so the high score leads. Each player on the losing side pays each player on the winning side the point difference times the stake.',
  minPlayers: 4,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  configFields: [
    { key: 'teams', label: 'Teams', type: 'teams', default: [], teamSize: 2, help: 'Pick the two players on team A' },
    { key: 'stake', label: 'Stake', type: 'number', default: 1, min: 1, max: 20, unit: 'per point', help: 'Per point, per player' },
    { key: 'flip', label: 'Flip on birdie', type: 'boolean', default: true, help: 'A birdie flips the other team’s number' },
  ],

  initState(): VegasState {
    return { diff: 0, thru: 0, holes: [] };
  },

  onHoleComplete(prev, hole, ctx): VegasState {
    const state = prev as VegasState;
    const { a, b } = teamsOf(ctx);
    if (a.length !== 2 || b.length !== 2) return { ...state, thru: hole.holeNumber };
    const par = ctx.course.holes.find((h) => h.number === hole.holeNumber)?.par ?? 0;
    const scores = scoresFor(ctx, hole);
    const of = (ids: string[]) => ids.map((id) => scores.find((s) => s.playerId === id)?.score ?? null);
    const sa = of(a);
    const sb = of(b);
    const flip = cfg(ctx, 'flip', true);
    const birdieA = flip && sa.some((s) => s != null && s - par <= -1);
    const birdieB = flip && sb.some((s) => s != null && s - par <= -1);
    const na = vegasNumber(sa, birdieB && !birdieA);
    const nb = vegasNumber(sb, birdieA && !birdieB);
    const diff = state.diff + (nb - na);
    return { diff, thru: hole.holeNumber, holes: [...state.holes, { holeNumber: hole.holeNumber, a: na, b: nb }] };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as VegasState;
    const { a, b } = teamsOf(ctx);
    const name = (ids: string[]) => ids.map((id) => ctx.participants.find((p) => p.id === id)?.name ?? id).join(' & ');
    const teamsSet = a.length === 2 && b.length === 2;
    const headline = !teamsSet
      ? 'Pick the teams'
      : !state.thru
        ? 'All square'
        : state.diff === 0
          ? `All square thru ${state.thru}`
          : `${name(state.diff > 0 ? a : b)} ${formatToPar(Math.abs(state.diff))} thru ${state.thru}`;
    const last = state.holes[state.holes.length - 1];
    const subline = teamsSet ? `${name(a)} vs ${name(b)}${last ? ` · hole ${last.holeNumber}: ${last.a} v ${last.b}` : ''}` : 'Two players on team A, the rest on team B';
    return {
      gameId: 'vegas',
      basis: ctx.active.basis,
      headline,
      subline,
      lines: teamsSet
        ? [
            { text: `${name(a)} · ${formatToPar(state.diff)}`, value: state.diff },
            { text: `${name(b)} · ${formatToPar(-state.diff)}`, value: -state.diff },
          ]
        : [{ text: 'Teams not set' }],
    };
  },

  getSettlement(prev, ctx): Settlement | null {
    const state = prev as VegasState;
    const stake = stakeOf(ctx);
    const { a, b } = teamsOf(ctx);
    if (!stake || state.diff === 0 || a.length !== 2 || b.length !== 2) return null;
    const winners = state.diff > 0 ? a : b;
    const losers = state.diff > 0 ? b : a;
    const amount = Math.abs(state.diff) * stake;
    const entries: Settlement['entries'] = [];
    for (const l of losers) for (const w of winners) entries.push({ from: l, to: w, amount, reason: `Vegas · ${Math.abs(state.diff)} pts × ${stake}` });
    return { gameId: 'vegas', entries };
  },
};
