import type { GameMode, GameState, Settlement, Standings } from './types';
import { stakeOf } from './types';

interface BbbState extends GameState {
  points: Record<string, number>;
  thru: number;
  /** Holes with fewer than three answers. */
  incomplete: number[];
}

const PROMPTS = [
  { key: 'bingo', label: 'First on the green' },
  { key: 'bango', label: 'Closest once everyone is on' },
  { key: 'bongo', label: 'First in the hole' },
] as const;

/** Three points a hole for things strokes don't capture. Good for mixed ability; favors the slow player. */
export const bingoBangoBongo: GameMode = {
  id: 'bingo-bango-bongo',
  name: 'Bingo Bango Bongo',
  category: 'betting',
  blurb: 'Three points a hole: first on, closest on, first in.',
  rules:
    'Every hole has three points. Bingo: first ball on the green. Bango: closest to the pin once everyone is on. Bongo: first ball in the hole. Play strictly in order — furthest away plays first — so the slow player gets a look. Points are settled between every pair at the stake per point. Strokes do not matter, so there is no gross or net.',
  minPlayers: 2,
  maxPlayers: 4,
  supportsNet: false,
  defaultBasis: 'gross',
  configFields: [{ key: 'stake', label: 'Stake', type: 'number', default: 1, min: 1, max: 50, unit: 'per point', help: 'Per point, between each pair' }],
  holeInputs: PROMPTS.map((p) => ({ key: p.key, label: p.label, type: 'player' as const })),

  initState(): BbbState {
    return { points: {}, thru: 0, incomplete: [] };
  },

  onHoleComplete(prev, hole, ctx): BbbState {
    const state = prev as BbbState;
    const inputs = hole.gameInputs?.['bingo-bango-bongo'] ?? {};
    const points = { ...state.points };
    for (const p of ctx.participants) points[p.id] = points[p.id] ?? 0;
    let answered = 0;
    for (const prompt of PROMPTS) {
      const v = inputs[prompt.key];
      const who = v ? ctx.participants.find((p) => p.name === v || p.id === v) : undefined;
      if (!who) continue;
      answered += 1;
      points[who.id] = (points[who.id] ?? 0) + 1;
    }
    const incomplete = answered < PROMPTS.length ? [...state.incomplete, hole.holeNumber] : state.incomplete;
    return { points, thru: hole.holeNumber, incomplete };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as BbbState;
    const rows = ctx.participants.map((p) => ({ p, pts: state.points[p.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
    const headline = state.thru ? rows.map((r) => `${r.p.name} ${r.pts}`).join(' · ') : 'Nothing scored yet';
    const subline = state.incomplete.length
      ? `Points thru ${state.thru} · hole${state.incomplete.length > 1 ? 's' : ''} ${state.incomplete.join(', ')} missing answers`
      : state.thru
        ? `Points thru ${state.thru} · 3 a hole`
        : 'First on, closest on, first in.';
    return {
      gameId: 'bingo-bango-bongo',
      basis: 'gross',
      headline,
      subline,
      lines: rows.map((r) => ({ playerId: r.p.id, text: `${r.p.name} · ${r.pts} pts`, value: r.pts })),
    };
  },

  getSettlement(prev, ctx): Settlement | null {
    const state = prev as BbbState;
    const stake = stakeOf(ctx);
    if (!stake) return null;
    const entries: Settlement['entries'] = [];
    const ps = ctx.participants;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i]!;
        const b = ps[j]!;
        const diff = (state.points[a.id] ?? 0) - (state.points[b.id] ?? 0);
        if (diff === 0) continue;
        const [from, to] = diff > 0 ? [b, a] : [a, b];
        entries.push({ from: from.id, to: to.id, amount: Math.abs(diff) * stake, reason: `Bingo Bango Bongo · ${to.name} ${Math.abs(diff)} pts up on ${from.name} × ${stake}` });
      }
    }
    return { gameId: 'bingo-bango-bongo', entries };
  },
};
