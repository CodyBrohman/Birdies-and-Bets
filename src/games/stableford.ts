import type { GameMode, GameState, Standings } from './types';
import { cfg, pickedUp, positionOf, scoresFor } from './types';
import { relationToPar, type Relation } from '../lib/scoring';

interface StablefordState extends GameState {
  points: Record<string, number>;
  thru: number;
}

type Table = Record<'albatross' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'worse', number>;

/** Classic and Modified (tour style) point tables. Custom reads the six fields. */
export const STABLEFORD_TABLES: Record<'standard' | 'modified', Table> = {
  standard: { albatross: 5, eagle: 4, birdie: 3, par: 2, bogey: 1, worse: 0 },
  modified: { albatross: 8, eagle: 5, birdie: 2, par: 0, bogey: -1, worse: -3 },
};

/** Explicit presets use their table; custom, and rounds saved before presets existed, read the six fields. */
function tableFor(ctx: Parameters<GameMode['onHoleComplete']>[2]): Table {
  const scoring = ctx.active.config.scoring;
  if (scoring === 'standard' || scoring === 'modified') return STABLEFORD_TABLES[scoring];
  const d = STABLEFORD_TABLES.standard;
  return {
    albatross: Number(cfg(ctx, 'albatross', d.albatross)),
    eagle: Number(cfg(ctx, 'eagle', d.eagle)),
    birdie: Number(cfg(ctx, 'birdie', d.birdie)),
    par: Number(cfg(ctx, 'par', d.par)),
    bogey: Number(cfg(ctx, 'bogey', d.bogey)),
    worse: Number(cfg(ctx, 'worse', d.worse)),
  };
}

function valueOf(table: Table, rel: Relation): number {
  return rel === 'albatross' ? table.albatross : rel === 'eagle' ? table.eagle : rel === 'birdie' ? table.birdie : rel === 'par' ? table.par : rel === 'bogey' ? table.bogey : table.worse;
}

/** Points relative to par. A pick-up scores the "double or worse" value: zero in standard, −3 in modified. */
export const stableford: GameMode = {
  id: 'stableford',
  name: 'Stableford',
  category: 'social',
  blurb: 'Points for each hole. Standard, Modified or your own table.',
  rules:
    'Each hole earns points against par. Standard: albatross 5, eagle 4, birdie 3, par 2, bogey 1, anything worse 0. Modified (tour style): albatross 8, eagle 5, birdie 2, par 0, bogey −1, double or worse −3, which rewards going for it. A pick-up counts as double or worse. Highest total wins. Custom lets you set every value.',
  minPlayers: 1,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  configFields: [
    {
      key: 'scoring',
      label: 'Scoring',
      type: 'choice',
      default: 'standard',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'modified', label: 'Modified' },
        { value: 'custom', label: 'Custom' },
      ],
      help: 'Modified: 8 / 5 / 2 / 0 / −1 / −3',
    },
    { key: 'albatross', label: 'Albatross', type: 'number', default: 5, min: -5, max: 10, showWhen: { key: 'scoring', equals: 'custom' } },
    { key: 'eagle', label: 'Eagle', type: 'number', default: 4, min: -5, max: 10, showWhen: { key: 'scoring', equals: 'custom' } },
    { key: 'birdie', label: 'Birdie', type: 'number', default: 3, min: -5, max: 10, showWhen: { key: 'scoring', equals: 'custom' } },
    { key: 'par', label: 'Par', type: 'number', default: 2, min: -5, max: 10, showWhen: { key: 'scoring', equals: 'custom' } },
    { key: 'bogey', label: 'Bogey', type: 'number', default: 1, min: -5, max: 10, showWhen: { key: 'scoring', equals: 'custom' } },
    { key: 'worse', label: 'Double or worse', type: 'number', default: 0, min: -5, max: 10, showWhen: { key: 'scoring', equals: 'custom' } },
  ],

  initState(): StablefordState {
    return { points: {}, thru: 0 };
  },

  onHoleComplete(prev, hole, ctx): StablefordState {
    const state = prev as StablefordState;
    const par = ctx.course.holes.find((h) => h.number === hole.holeNumber)?.par ?? 0;
    const table = tableFor(ctx);
    const points = { ...state.points };
    for (const p of ctx.participants) points[p.id] = points[p.id] ?? 0;
    for (const s of scoresFor(ctx, hole)) points[s.playerId] = (points[s.playerId] ?? 0) + valueOf(table, relationToPar(s.score - par));
    for (const id of pickedUp(ctx, hole)) points[id] = (points[id] ?? 0) + table.worse;
    return { points, thru: positionOf(ctx, hole.holeNumber) };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as StablefordState;
    const scoring = cfg<string>(ctx, 'scoring', 'standard');
    const label = scoring === 'modified' ? 'Modified Stableford' : scoring === 'custom' ? 'Custom points' : 'Points';
    const rows = ctx.participants.map((p) => ({ p, pts: state.points[p.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
    const headline = state.thru ? rows.map((r) => `${r.p.name} ${r.pts}`).join(' · ') : 'Nothing scored yet';
    return {
      gameId: 'stableford',
      basis: ctx.active.basis,
      headline,
      subline: state.thru ? `${label} thru ${state.thru}` : scoring === 'modified' ? 'Modified Stableford' : undefined,
      lines: rows.map((r) => ({ playerId: r.p.id, text: `${r.p.name} · ${r.pts} pts`, value: r.pts })),
    };
  },

  getSettlement() {
    return null;
  },
};
