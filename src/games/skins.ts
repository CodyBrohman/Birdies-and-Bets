import type { GameMode, GameContext, GameState, HoleResult, ProgressionCell, Settlement, Standings } from './types';
import { cfg, initialOf, nameOf, scoresFor, stakeOf } from './types';
import { lowest } from '../lib/scoring';
import { plural } from '../lib/format';

interface HoleOutcome {
  holeNumber: number;
  /** Winner of the pot on this hole, or null when it carried. */
  winner: string | null;
  /** Skins awarded on this hole (pot size), 0 when carried. */
  skins: number;
  /** True when the hole was played with nobody able to win (all picked up). */
  void?: boolean;
}

interface SkinsState extends GameState {
  outcomes: HoleOutcome[];
  /** Skins in the pot for the next hole (1 = just the next hole's own skin). */
  pot: number;
  /** Validation: a skin won last hole that must be validated by its winner on this hole. */
  pending: { playerId: string; skins: number } | null;
  totals: Record<string, number>;
}

/**
 * Lowest score on a hole takes the skin. Ties carry (configurable).
 * Validation (off by default): a skin won on one hole is only kept if the winner
 * at least ties for low on the following hole; otherwise it rolls into that hole's pot.
 */
export const skins: GameMode = {
  id: 'skins',
  name: 'Skins',
  category: 'betting',
  blurb: 'Lowest score on a hole takes the skin. Ties carry.',
  rules:
    'Every hole is worth one skin. The outright lowest score wins it. If two or more tie for low, nobody wins and the skin rolls to the next hole, so a hole can be worth several skins. Skins are paid by each other player at the stake. With validation on, a skin is only kept if the winner at least ties for low on the next hole.',
  minPlayers: 2,
  maxPlayers: 4,
  supportsNet: true,
  defaultBasis: 'net',
  configFields: [
    { key: 'stake', label: 'Stake', type: 'number', default: 5, min: 1, max: 100, unit: 'per skin', help: 'Per skin, in points' },
    { key: 'carryover', label: 'Carryover', type: 'boolean', default: true, help: 'Tied holes roll into the next' },
    { key: 'validation', label: 'Validation', type: 'boolean', default: false, help: 'Winner must tie or beat low on the next hole to keep it' },
  ],

  initState(): SkinsState {
    return { outcomes: [], pot: 1, pending: null, totals: {} };
  },

  onHoleComplete(prev, hole, ctx): SkinsState {
    const state = prev as SkinsState;
    const carryover = cfg(ctx, 'carryover', true);
    const validation = cfg(ctx, 'validation', false);
    const scores = scoresFor(ctx, hole);
    const low = lowest(scores);
    const totals = { ...state.totals };
    let pot = state.pot;
    let pending = state.pending;
    const outcomes = [...state.outcomes];

    // Resolve last hole's pending skin: validated if the winner ties or beats low here.
    if (validation && pending) {
      const winnerLow = low.some((l) => l.playerId === pending!.playerId);
      if (winnerLow) {
        totals[pending.playerId] = (totals[pending.playerId] ?? 0) + pending.skins;
      } else {
        pot += pending.skins;
        // The previous hole's outcome turns out to have carried after all.
        const last = outcomes[outcomes.length - 1];
        if (last && last.winner === pending.playerId) outcomes[outcomes.length - 1] = { ...last, winner: null, skins: 0 };
      }
      pending = null;
    }

    if (scores.length === 0) {
      // Nobody scored: hole is void, pot carries.
      outcomes.push({ holeNumber: hole.holeNumber, winner: null, skins: 0, void: true });
      pot = carryover ? pot + 1 : 1;
      return { outcomes, pot, pending, totals };
    }

    if (low.length === 1) {
      const winner = low[0]!.playerId;
      const isLast = hole.holeNumber >= ctx.holeCount;
      outcomes.push({ holeNumber: hole.holeNumber, winner, skins: pot });
      if (validation && !isLast) {
        pending = { playerId: winner, skins: pot };
      } else {
        totals[winner] = (totals[winner] ?? 0) + pot;
      }
      pot = 1;
    } else {
      outcomes.push({ holeNumber: hole.holeNumber, winner: null, skins: 0 });
      pot = carryover ? pot + 1 : 1;
    }
    return { outcomes, pot, pending, totals };
  },

  getStandings(prev, ctx): Standings {
    const state = prev as SkinsState;
    const thru = state.outcomes.length ? state.outcomes[state.outcomes.length - 1]!.holeNumber : 0;
    const totals = { ...state.totals };
    // Show a pending (unvalidated) skin as provisional in the ledger so the headline moves.
    const ranked = ctx.participants
      .map((p) => ({ p, n: totals[p.id] ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
    const parts = ranked.map((x) => `${x.p.name} ${plural(x.n, 'skin')}`);
    const carrying = state.pot - 1;
    if (carrying > 0) parts.push(`${carrying} carrying`);
    if (state.pending) parts.push(`${nameOf(ctx, state.pending.playerId)} ${plural(state.pending.skins, 'skin')} pending`);
    const headline = parts.length ? parts.join(' · ') : thru ? 'No skins yet' : 'Nothing won yet';

    const next = thru + 1;
    const stake = stakeOf(ctx);
    const subline =
      next <= ctx.holeCount
        ? `Hole ${next} is worth ${plural(state.pot, 'skin')}${stake ? ` · ${state.pot * stake} ${unit(ctx)} from each player` : ''}`
        : 'Round complete';

    const byHole = new Map(state.outcomes.map((o) => [o.holeNumber, o]));
    const progression: ProgressionCell[] = [];
    for (let n = 1; n <= ctx.holeCount; n++) {
      const o = byHole.get(n);
      if (!o) progression.push({ holeNumber: n, tone: 'none' });
      else if (o.winner) {
        const p = ctx.participants.find((x) => x.id === o.winner);
        progression.push({ holeNumber: n, tone: 'win', label: `${p ? initialOf(p) : '?'}${o.skins > 1 ? `×${o.skins}` : ''}` });
      } else progression.push({ holeNumber: n, tone: 'carry', label: '↷' });
    }

    return {
      gameId: 'skins',
      basis: ctx.active.basis,
      headline,
      subline,
      lines: ctx.participants.map((p) => ({ playerId: p.id, text: `${p.name} · ${plural(totals[p.id] ?? 0, 'skin')}`, value: totals[p.id] ?? 0 })),
      progression,
    };
  },

  getSettlement(prev, ctx): Settlement | null {
    const state = prev as SkinsState;
    const stake = stakeOf(ctx);
    if (!stake) return null;
    const entries: Settlement['entries'] = [];
    for (const winner of ctx.participants) {
      const n = state.totals[winner.id] ?? 0;
      if (!n) continue;
      for (const other of ctx.participants) {
        if (other.id === winner.id) continue;
        entries.push({ from: other.id, to: winner.id, amount: n * stake, reason: `Skins · ${winner.name} ${n} × ${stake} = ${n * stake}` });
      }
    }
    return { gameId: 'skins', entries };
  },
};

function unit(ctx: GameContext): string {
  return ctx.settings.stakeLabel === 'points' ? 'pts' : ctx.settings.stakeLabel;
}

