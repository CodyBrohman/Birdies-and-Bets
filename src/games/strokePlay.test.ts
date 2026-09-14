import { runGame } from './engine';
import { strokePlay } from './strokePlay';
import { active, makeRound, resultsFrom } from './__fixtures__/round';
import { cody, dan } from '../lib/__fixtures__/cedarRidge';

describe('Stroke Play', () => {
  it('ranks by net to par through six', () => {
    const run = runGame(makeRound(), active('stroke-play', { stake: 5 }), strokePlay);
    expect(run.standings.headline).toBe('Cody leads by 2 thru 6');
    expect(run.standings.lines.map((l) => l.text)).toEqual(['Cody · 23 (−1)', 'Dan · 25 (+1)', 'Marcus · 26 (+2)', 'Priya · 30 (+6)']);
    expect(run.settlement).toBeNull(); // not finished
  });

  it('gross ranks differently', () => {
    const run = runGame(makeRound(), active('stroke-play', { stake: 5 }, 'gross'), strokePlay);
    expect(run.standings.headline).toBe('Dan leads by 2 thru 6');
  });

  it('a pick-up means no card; ties pay nothing; the winner collects from everyone', () => {
    const tie = resultsFrom({ cody: Array(9).fill(4), dan: Array(9).fill(4) });
    const t = runGame(makeRound({ players: [cody, dan], results: tie, holeCount: 9 }), active('stroke-play', { stake: 5 }, 'gross'), strokePlay);
    expect(t.standings.headline).toBe('Cody and Dan tied at E thru 9');
    expect(t.settlement?.entries).toEqual([]);

    const pick = resultsFrom({ cody: Array(9).fill(4), dan: [null, ...Array(8).fill(3)] });
    const p = runGame(makeRound({ players: [cody, dan], results: pick, holeCount: 9 }), active('stroke-play', { stake: 5 }, 'gross'), strokePlay);
    expect(p.standings.lines[1]?.text).toBe('Dan · no card (picked up)');
    expect(p.settlement?.entries).toEqual([{ from: 'dan', to: 'cody', amount: 5, reason: 'Stroke Play · Cody low = 5' }]);
  });
});
