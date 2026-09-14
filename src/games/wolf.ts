import type { GameMode, GameState, HoleResult, Standings } from './types';
import { cfg, nameOf, scoresFor } from './types';

interface WolfState extends GameState {
  points: Record<string, number>;
  /** Per hole: wolf, partner (null = alone), and who won ('wolf' | 'pack' | 'tie' | 'pending'). */
  holes: { holeNumber: number; wolf: string; partner: string | null; result: 'wolf' | 'pack' | 'tie' | 'pending' }[];
  thru: number;
}

/** Wolf for a hole: rotates through participants in order, starting at hole 1. */
export function wolfFor(participantIds: string[], holeNumber: number): string {
  return participantIds[(holeNumber - 1) % participantIds.length]!;
}

/**
 * Rotating wolf. After the tee shots the wolf either takes a partner (best ball, two versus two)
 * or goes alone for double. Points, no settlement — a social game in this app.
 */
export const wolf: GameMode = {
  id: 'wolf',
  name: 'Wolf',
  category: 'social',
  blurb: 'Rotating wolf picks a partner off the tee, or goes alone.',
  rules:
    'The wolf rotates each hole and tees off last. After each drive the wolf may take that player as partner or pass; passing everyone means going alone. Best ball of each side decides the hole. Partners who win get a point each. A lone wolf who wins gets three; if the wolf loses alone, the other three get a point each. Ties score nothing. Tell the app after the hole who the wolf took, or that they went alone.',
  minPlayers: 4,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  configFields: [{ key: 'points', label: 'Points per hole', type: 'number', default: 1, min: 1, max: 5, help: 'Multiplier for every hole' }],
  holeInputs: [
    { key: 'mode', label: 'The wolf went', type: 'choice', options: ['Alone', 'With a partner'] },
    { key: 'partner', label: 'Partner', type: 'player', showIf: { key: 'mode', equals: 'With a partner' } },
  ],

  initState(): WolfState {
    return { points: {}, holes: [], thru: 0 };
  },

  onHoleComplete(prev, hole, ctx): WolfState {
    const state = prev as WolfState;
    const ids = ctx.participants.map((p) => p.id);
    const wolfId = wolfFor(ids, hole.holeNumber);
    const inputs = hole.gameInputs?.wolf ?? {};
    const points = { ...state.points };
    for (const id of ids) points[id] = points[id] ?? 0;
    const mult = Number(cfg(ctx, 'points', 1)) || 1;

    const alone = inputs.mode === 'Alone';
    const partnerName = inputs.mode === 'With a partner' ? inputs.partner : undefined;
    const partner = partnerName ? (ctx.participants.find((p) => p.name === partnerName || p.id === partnerName)?.id ?? null) : null;
    if (!alone && !partner) {
      return { ...state, points, holes: [...state.holes, { holeNumber: hole.holeNumber, wolf: wolfId, partner: null, result: 'pending' }], thru: hole.holeNumber };
    }

    const scores = scoresFor(ctx, hole);
    const best = (side: string[]) => {
      const s = scores.filter((x) => side.includes(x.playerId)).map((x) => x.score);
      return s.length ? Math.min(...s) : Infinity;
    };
    const wolfSide = alone ? [wolfId] : [wolfId, partner!];
    const pack = ids.filter((id) => !wolfSide.includes(id));
    const w = best(wolfSide);
    const p = best(pack);
    let result: 'wolf' | 'pack' | 'tie';
    if (w === Infinity && p === Infinity) result = 'tie';
    else if (w < p) result = 'wolf';
    else if (p < w) result = 'pack';
    else result = 'tie';

    if (result === 'wolf') {
      if (alone) points[wolfId] += 3 * mult;
      else for (const id of wolfSide) points[id] += mult;
    } else if (result === 'pack') {
      for (const id of pack) points[id] += mult;
    }
    return { points, holes: [...state.holes, { holeNumber: hole.holeNumber, wolf: wolfId, partner: alone ? null : partner, result }], thru: hole.holeNumber };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as WolfState;
    const ids = ctx.participants.map((p) => p.id);
    const rows = ctx.participants.map((p) => ({ p, pts: state.points[p.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
    const pending = state.holes.filter((h) => h.result === 'pending').length;
    const headline = state.thru ? rows.map((r) => `${r.p.name} ${r.pts}`).join(' · ') : 'Nothing scored yet';
    const next = state.thru + 1;
    const nextWolf = next <= ctx.holeCount ? `${nameOf(ctx, wolfFor(ids, next))} is the wolf on ${next}` : 'Round complete';
    const subline = pending ? `${nextWolf} · ${pending} hole${pending > 1 ? 's' : ''} waiting on who the wolf took` : nextWolf;
    return {
      gameId: 'wolf',
      basis: ctx.active.basis,
      headline,
      subline,
      lines: rows.map((r) => ({ playerId: r.p.id, text: `${r.p.name} · ${r.pts} pts`, value: r.pts })),
    };
  },

  getSettlement() {
    return null;
  },
};

export type { HoleResult };
