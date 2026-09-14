// Nets every game's settlement into one figure per pair. Pure; imports only types/.
import type { Settlement, SettlementEntry } from '../types/game';
import type { PlayerId } from '../types/player';

export interface NettedPair {
  from: PlayerId;
  to: PlayerId;
  /** Net amount `from` owes `to` after offsetting both directions. Always > 0. */
  amount: number;
  /** Every contributing entry between the two, in game order, for the audit view. */
  contributions: SettlementEntry[];
}

export interface NettedSettlement {
  pairs: NettedPair[];
  /** Net position per player: positive = collects, negative = pays. Zero for players with no entries. */
  totals: Record<PlayerId, number>;
}

/**
 * Combine settlements across games. For each unordered pair, sum what A owes B and what B owes A,
 * and keep only the difference in the direction it flows. Pairs that net to zero are dropped.
 */
export function netSettlements(settlements: (Settlement | null)[], playerIds: PlayerId[]): NettedSettlement {
  const entries = settlements.flatMap((s) => s?.entries ?? []);
  const byPair = new Map<string, { a: PlayerId; b: PlayerId; aOwesB: number; bOwesA: number; contributions: SettlementEntry[] }>();
  const keyOf = (x: PlayerId, y: PlayerId) => (x < y ? `${x}|${y}` : `${y}|${x}`);

  for (const e of entries) {
    if (e.amount <= 0 || e.from === e.to) continue;
    const key = keyOf(e.from, e.to);
    let rec = byPair.get(key);
    if (!rec) {
      const [a, b] = e.from < e.to ? [e.from, e.to] : [e.to, e.from];
      rec = { a, b, aOwesB: 0, bOwesA: 0, contributions: [] };
      byPair.set(key, rec);
    }
    if (e.from === rec.a) rec.aOwesB += e.amount;
    else rec.bOwesA += e.amount;
    rec.contributions.push(e);
  }

  const totals: Record<PlayerId, number> = {};
  for (const id of playerIds) totals[id] = 0;
  const pairs: NettedPair[] = [];
  for (const rec of byPair.values()) {
    const net = rec.aOwesB - rec.bOwesA;
    if (net === 0) continue;
    const pair: NettedPair = net > 0 ? { from: rec.a, to: rec.b, amount: net, contributions: rec.contributions } : { from: rec.b, to: rec.a, amount: -net, contributions: rec.contributions };
    pairs.push(pair);
    totals[pair.from] = (totals[pair.from] ?? 0) - pair.amount;
    totals[pair.to] = (totals[pair.to] ?? 0) + pair.amount;
  }
  // Biggest debts first; ties by payer then payee for a stable order.
  pairs.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from) || x.to.localeCompare(y.to));
  return { pairs, totals };
}

/** Audit lines for a netted pair, e.g. "Skins · Marcus 8 × 5 = 40 · owed by Priya". */
export function auditLines(pair: NettedPair, nameOf: (id: PlayerId) => string): string[] {
  const lines = pair.contributions.map((c) => `${c.reason} · owed by ${nameOf(c.from)}`);
  lines.push(`Net ${pair.amount} → ${nameOf(pair.to)}`);
  return lines;
}
