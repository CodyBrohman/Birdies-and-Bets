import type { GameMode, GameState, HoleResult, Settlement, Standings } from './types';
import { cfg, nameOf, nextAfter, positionOf, scoresFor, stakeOf } from './types';
import { formatStake } from '../lib/format';

interface WolfState extends GameState {
  points: Record<string, number>;
  /** Per hole: wolf, partner (null = alone), and who won ('wolf' | 'pack' | 'tie' | 'pending'). */
  holes: { holeNumber: number; wolf: string; partner: string | null; result: 'wolf' | 'pack' | 'tie' | 'pending' }[];
  thru: number;
}

/** Wolf for a hole: rotates through participants in order, starting with the first hole played (position 1). */
export function wolfFor(participantIds: string[], position: number): string {
  return participantIds[(position - 1) % participantIds.length]!;
}

/**
 * Rotating wolf for three or four players. After the tee shots the wolf either takes a partner (best ball,
 * side against side) or goes alone. Points per hole, optionally settled pairwise at a stake per point.
 */
export const wolf: GameMode = {
  id: 'wolf',
  name: 'Wolf',
  category: 'betting',
  blurb: 'Rotating wolf picks a partner off the tee, or goes alone.',
  rules:
    'The wolf rotates each hole and tees off last. After each drive the wolf may take that player as partner or pass; passing everyone means going alone. Best ball of each side decides the hole. Partners who win get a point each; when the pack wins, each of them gets a point. A lone wolf who wins takes a point from everyone else (three with four players, two with three); a lone wolf who loses gives the others a point each. Ties score nothing. Tell the app after the hole who the wolf took, or that they went alone. With a stake, every pair settles the difference in their points at the end.',
  minPlayers: 3,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  configFields: [
    { key: 'points', label: 'Points per hole', type: 'number', default: 1, min: 1, max: 5, help: 'Multiplier for every hole' },
    { key: 'stake', label: 'Stake', type: 'number', default: 1, min: 0, max: 100, unit: 'per point', help: '0 = points only, nothing to settle' },
  ],
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
    const wolfId = wolfFor(ids, positionOf(ctx, hole.holeNumber));
    const inputs = hole.gameInputs?.wolf ?? {};
    const points = { ...state.points };
    for (const id of ids) points[id] = points[id] ?? 0;
    const mult = Number(cfg(ctx, 'points', 1)) || 1;

    const alone = inputs.mode === 'Alone';
    const partnerName = inputs.mode === 'With a partner' ? inputs.partner : undefined;
    const partner = partnerName ? (ctx.participants.find((p) => (p.name === partnerName || p.id === partnerName) && p.id !== wolfId)?.id ?? null) : null;
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
      if (alone) points[wolfId] += (ids.length - 1) * mult;
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
    const next = nextAfter(ctx, state.thru);
    const nextWolf = next != null ? `${nameOf(ctx, wolfFor(ids, positionOf(ctx, next)))} is the wolf on ${next}` : 'Round complete';
    const subline = pending ? `${nextWolf} · ${pending} hole${pending > 1 ? 's' : ''} waiting on who the wolf took` : nextWolf;
    return {
      gameId: 'wolf',
      basis: ctx.active.basis,
      headline,
      subline,
      lines: rows.map((r) => ({ playerId: r.p.id, text: `${r.p.name} · ${r.pts} pts`, value: r.pts })),
    };
  },

  /** Every pair settles the difference in their points at the stake per point. */
  getSettlement(prev, ctx): Settlement | null {
    const state = prev as WolfState;
    const stake = stakeOf(ctx);
    if (!stake) return null;
    const ids = ctx.participants.map((p) => p.id);
    const entries: Settlement['entries'] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]!;
        const b = ids[j]!;
        const diff = (state.points[a] ?? 0) - (state.points[b] ?? 0);
        if (diff === 0) continue;
        const [from, to] = diff > 0 ? [b, a] : [a, b];
        const amount = Math.abs(diff) * stake;
        entries.push({ from, to, amount, reason: `Wolf · ${nameOf(ctx, to)} ${Math.abs(diff)} pts up on ${nameOf(ctx, from)} × ${formatStake(stake, ctx.settings.stakeLabel)} = ${amount}` });
      }
    }
    return { gameId: 'wolf', entries };
  },
};

export type { HoleResult };
