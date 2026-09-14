import type { GameMode, GameState, Settlement, Standings } from './types';
import { scoresFor, stakeOf } from './types';
import { formatToPar } from '../lib/format';

interface StrokeState extends GameState {
  totals: Record<string, number>;
  par: Record<string, number>;
  holes: Record<string, number>;
  /** Players who picked up at least once have no card. */
  noCard: Record<string, boolean>;
  thru: number;
}

/** Lowest total, gross or net. The baseline. */
export const strokePlay: GameMode = {
  id: 'stroke-play',
  name: 'Stroke Play',
  category: 'betting',
  blurb: 'Lowest total wins. Gross or net.',
  rules:
    'Every stroke counts. Lowest total over the round wins and collects the stake from each other player. A player who picks up on any hole has no card and cannot win. A tie for low splits nothing — no one pays.',
  minPlayers: 2,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  configFields: [{ key: 'stake', label: 'Stake', type: 'number', default: 5, min: 1, max: 100, help: 'Paid to the winner by each other player' }],

  initState(): StrokeState {
    return { totals: {}, par: {}, holes: {}, noCard: {}, thru: 0 };
  },

  onHoleComplete(prev, hole, ctx): StrokeState {
    const state = prev as StrokeState;
    const par = ctx.course.holes.find((h) => h.number === hole.holeNumber)?.par ?? 0;
    const totals = { ...state.totals };
    const parTotals = { ...state.par };
    const holes = { ...state.holes };
    const noCard = { ...state.noCard };
    const scored = new Set(scoresFor(ctx, hole).map((s) => s.playerId));
    for (const s of scoresFor(ctx, hole)) {
      totals[s.playerId] = (totals[s.playerId] ?? 0) + s.score;
      parTotals[s.playerId] = (parTotals[s.playerId] ?? 0) + par;
      holes[s.playerId] = (holes[s.playerId] ?? 0) + 1;
    }
    for (const p of ctx.participants) {
      if (!scored.has(p.id) && hole.scores[p.id] === null) noCard[p.id] = true;
    }
    return { totals, par: parTotals, holes, noCard, thru: hole.holeNumber };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as StrokeState;
    const rows = ctx.participants.map((p) => ({
      p,
      total: state.totals[p.id] ?? 0,
      toPar: (state.totals[p.id] ?? 0) - (state.par[p.id] ?? 0),
      noCard: !!state.noCard[p.id],
    }));
    const eligible = rows.filter((r) => !r.noCard && (state.holes[r.p.id] ?? 0) > 0).sort((a, b) => a.toPar - b.toPar);
    let headline = 'Nothing scored yet';
    if (eligible.length) {
      const lead = eligible[0]!;
      const tied = eligible.filter((r) => r.toPar === lead.toPar);
      if (tied.length > 1) headline = `${tied.map((r) => r.p.name).join(' and ')} tied at ${formatToPar(lead.toPar)} thru ${state.thru}`;
      else {
        const gap = eligible[1] ? eligible[1].toPar - lead.toPar : 0;
        headline = eligible[1] ? `${lead.p.name} leads by ${gap} thru ${state.thru}` : `${lead.p.name} ${formatToPar(lead.toPar)} thru ${state.thru}`;
      }
    }
    const sorted = [...rows].sort((a, b) => (a.noCard === b.noCard ? a.toPar - b.toPar : a.noCard ? 1 : -1));
    return {
      gameId: 'stroke-play',
      basis: ctx.active.basis,
      headline,
      subline: state.thru ? `Thru ${state.thru}` : undefined,
      lines: sorted.map((r) => ({
        playerId: r.p.id,
        text: r.noCard ? `${r.p.name} · no card (picked up)` : `${r.p.name} · ${r.total} (${formatToPar(r.toPar)})`,
        value: r.toPar,
      })),
    };
  },

  getSettlement(prev, ctx): Settlement | null {
    const state = prev as StrokeState;
    const stake = stakeOf(ctx);
    if (!stake || state.thru < ctx.holeCount) return null;
    const rows = ctx.participants
      .filter((p) => !state.noCard[p.id] && (state.holes[p.id] ?? 0) > 0)
      .map((p) => ({ p, toPar: (state.totals[p.id] ?? 0) - (state.par[p.id] ?? 0) }))
      .sort((a, b) => a.toPar - b.toPar);
    // No cards at all, or a tie for low: nobody pays. A lone card wins by default.
    if (rows.length === 0 || (rows.length > 1 && rows[0]!.toPar === rows[1]!.toPar)) return { gameId: 'stroke-play', entries: [] };
    const winner = rows[0]!.p;
    return {
      gameId: 'stroke-play',
      entries: ctx.participants
        .filter((p) => p.id !== winner.id)
        .map((p) => ({ from: p.id, to: winner.id, amount: stake, reason: `Stroke Play · ${winner.name} low = ${stake}` })),
    };
  },
};
