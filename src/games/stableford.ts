import type { GameMode, GameState, Standings } from './types';
import { cfg, scoresFor } from './types';
import { relationToPar } from '../lib/scoring';

interface StablefordState extends GameState {
  points: Record<string, number>;
  thru: number;
}

/** Points relative to par. A pick-up scores zero — the whole point of the format. */
export const stableford: GameMode = {
  id: 'stableford',
  name: 'Stableford',
  category: 'social',
  blurb: 'Points for each hole: birdie 3, par 2, bogey 1.',
  rules:
    'Each hole earns points against par: albatross 5, eagle 4, birdie 3, par 2, bogey 1, anything worse 0. Pick up when the hole is gone — it costs nothing more than a zero. Highest total wins. Point values are configurable.',
  minPlayers: 1,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  configFields: [
    { key: 'albatross', label: 'Albatross', type: 'number', default: 5, min: 0, max: 10 },
    { key: 'eagle', label: 'Eagle', type: 'number', default: 4, min: 0, max: 10 },
    { key: 'birdie', label: 'Birdie', type: 'number', default: 3, min: 0, max: 10 },
    { key: 'par', label: 'Par', type: 'number', default: 2, min: 0, max: 10 },
    { key: 'bogey', label: 'Bogey', type: 'number', default: 1, min: 0, max: 10 },
    { key: 'worse', label: 'Double or worse', type: 'number', default: 0, min: 0, max: 10 },
  ],

  initState(): StablefordState {
    return { points: {}, thru: 0 };
  },

  onHoleComplete(prev, hole, ctx): StablefordState {
    const state = prev as StablefordState;
    const par = ctx.course.holes.find((h) => h.number === hole.holeNumber)?.par ?? 0;
    const points = { ...state.points };
    for (const p of ctx.participants) points[p.id] = points[p.id] ?? 0;
    for (const s of scoresFor(ctx, hole)) {
      const rel = relationToPar(s.score - par);
      const value =
        rel === 'albatross'
          ? cfg(ctx, 'albatross', 5)
          : rel === 'eagle'
            ? cfg(ctx, 'eagle', 4)
            : rel === 'birdie'
              ? cfg(ctx, 'birdie', 3)
              : rel === 'par'
                ? cfg(ctx, 'par', 2)
                : rel === 'bogey'
                  ? cfg(ctx, 'bogey', 1)
                  : cfg(ctx, 'worse', 0);
      points[s.playerId] = (points[s.playerId] ?? 0) + Number(value);
    }
    return { points, thru: hole.holeNumber };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as StablefordState;
    const rows = ctx.participants.map((p) => ({ p, pts: state.points[p.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
    const headline = state.thru ? rows.map((r) => `${r.p.name} ${r.pts}`).join(' · ') : 'Nothing scored yet';
    return {
      gameId: 'stableford',
      basis: ctx.active.basis,
      headline,
      subline: state.thru ? `Points thru ${state.thru}` : undefined,
      lines: rows.map((r) => ({ playerId: r.p.id, text: `${r.p.name} · ${r.pts} pts`, value: r.pts })),
    };
  },

  getSettlement() {
    return null;
  },
};
