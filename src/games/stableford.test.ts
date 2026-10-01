import { runGame } from './engine';
import { stableford } from './stableford';
import { active, makeRound, resultsFrom } from './__fixtures__/round';
import { cody, dan } from '../lib/__fixtures__/cedarRidge';

describe('Stableford', () => {
  it('scores the brief foursome net through six', () => {
    const run = runGame(makeRound(), active('stableford'), stableford);
    const pts = Object.fromEntries(run.standings.lines.map((l) => [l.playerId, l.value]));
    expect(pts).toEqual({ cody: 13, dan: 11, marcus: 10, priya: 6 });
    expect(run.standings.headline).toBe('Cody 13 · Dan 11 · Marcus 10 · Priya 6');
    expect(run.settlement).toBeNull();
  });

  it('a pick-up scores the double-or-worse value and custom values apply', () => {
    const results = resultsFrom({ cody: [3, null], dan: [7, 4] });
    const run = runGame(makeRound({ players: [cody, dan], results }), active('stableford', { birdie: 4, worse: 1 }, 'gross'), stableford);
    const pts = Object.fromEntries(run.standings.lines.map((l) => [l.playerId, l.value]));
    // Cody: birdie (4) + pick-up (worse=1) = 5. Dan: triple on par 4 (worse=1) + birdie on par 5 (4) = 5.
    expect(pts).toEqual({ cody: 5, dan: 5 });
  });
});

describe('Modified Stableford', () => {
  it('uses the tour table on the foursome through six (gross)', () => {
    const run = runGame(makeRound(), active('stableford', { scoring: 'modified' }, 'gross'), stableford);
    const pts = Object.fromEntries(run.standings.lines.map((l) => [l.playerId, l.value]));
    expect(pts).toEqual({ cody: -1, marcus: -8, priya: -18, dan: 4 });
    expect(run.standings.subline).toBe('Modified Stableford thru 6');
  });

  it('a pick-up costs the double-or-worse value, and custom honours the fields', () => {
    const results = resultsFrom({ cody: [null], dan: [4] });
    const modified = runGame(makeRound({ players: [cody, dan], results }), active('stableford', { scoring: 'modified' }, 'gross'), stableford);
    expect(Object.fromEntries(modified.standings.lines.map((l) => [l.playerId, l.value]))).toEqual({ cody: -3, dan: 0 });
    const custom = runGame(makeRound({ players: [cody, dan], results }), active('stableford', { scoring: 'custom', par: 7, worse: -2 }, 'gross'), stableford);
    expect(Object.fromEntries(custom.standings.lines.map((l) => [l.playerId, l.value]))).toEqual({ cody: -2, dan: 7 });
    expect(custom.standings.subline).toBe('Custom points thru 1');
  });
});
