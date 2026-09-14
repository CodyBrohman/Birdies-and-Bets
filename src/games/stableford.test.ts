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

  it('a pick-up scores zero and custom values apply', () => {
    const results = resultsFrom({ cody: [3, null], dan: [7, 4] });
    const run = runGame(makeRound({ players: [cody, dan], results }), active('stableford', { birdie: 4, worse: 1 }, 'gross'), stableford);
    const pts = Object.fromEntries(run.standings.lines.map((l) => [l.playerId, l.value]));
    // Cody: birdie (4) + pick-up (0) = 4. Dan: triple on par 4 (worse=1) + birdie on par 5 (4) = 5.
    expect(pts).toEqual({ cody: 4, dan: 5 });
  });
});
