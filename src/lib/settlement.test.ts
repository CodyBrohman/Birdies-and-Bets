import { auditLines, netSettlements } from './settlement';
import type { Settlement } from '../types/game';

const names: Record<string, string> = { cody: 'Cody', marcus: 'Marcus', priya: 'Priya', dan: 'Dan' };
const nameOf = (id: string) => names[id] ?? id;

describe('netSettlements', () => {
  it('offsets both directions into one figure per pair and drops zero pairs', () => {
    const skins: Settlement = {
      gameId: 'skins',
      entries: [
        { from: 'priya', to: 'marcus', amount: 40, reason: 'Skins · Marcus 8 × 5 = 40' },
        { from: 'marcus', to: 'priya', amount: 10, reason: 'Skins · Priya 2 × 5 = 10' },
        { from: 'cody', to: 'dan', amount: 5, reason: 'Skins · Dan 1 × 5 = 5' },
        { from: 'dan', to: 'cody', amount: 5, reason: 'Skins · Cody 1 × 5 = 5' },
      ],
    };
    const match: Settlement = { gameId: 'match-play', entries: [{ from: 'marcus', to: 'cody', amount: 5, reason: 'Match Play · Cody won 3&2 = 5' }] };
    const { pairs, totals } = netSettlements([skins, match, null], ['cody', 'marcus', 'priya', 'dan']);
    expect(pairs.map((p) => `${p.from}>${p.to}:${p.amount}`)).toEqual(['priya>marcus:30', 'marcus>cody:5']);
    expect(totals).toEqual({ cody: 5, marcus: 25, priya: -30, dan: 0 });
    expect(auditLines(pairs[0]!, nameOf)).toEqual(['Skins · Marcus 8 × 5 = 40 · owed by Priya', 'Skins · Priya 2 × 5 = 10 · owed by Marcus', 'Net 30 → Marcus']);
  });

  it('orders biggest debts first and ignores empty or self entries', () => {
    const s: Settlement = {
      gameId: 'x',
      entries: [
        { from: 'cody', to: 'dan', amount: 2, reason: 'a' },
        { from: 'cody', to: 'marcus', amount: 9, reason: 'b' },
        { from: 'cody', to: 'cody', amount: 9, reason: 'self' },
        { from: 'dan', to: 'marcus', amount: 0, reason: 'zero' },
      ],
    };
    const { pairs } = netSettlements([s], ['cody', 'marcus', 'dan']);
    expect(pairs.map((p) => `${p.from}>${p.to}:${p.amount}`)).toEqual(['cody>marcus:9', 'cody>dan:2']);
  });

  it('is empty with no games', () => {
    expect(netSettlements([], ['cody'])).toEqual({ pairs: [], totals: { cody: 0 } });
  });
});
