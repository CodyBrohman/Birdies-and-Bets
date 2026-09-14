import { runGame } from './engine';
import { vegas, vegasNumber } from './vegas';
import { active, makeRound, resultsFrom } from './__fixtures__/round';

const teams = (config = {}) => active('vegas', { teams: ['cody', 'dan'], stake: 1, flip: true, ...config }, 'gross');

describe('Vegas', () => {
  it('forms two-digit numbers low digit first, with 10+ and pick-ups leading', () => {
    expect(vegasNumber([4, 6], false)).toBe(46);
    expect(vegasNumber([6, 4], false)).toBe(46);
    expect(vegasNumber([4, 6], true)).toBe(64);
    expect(vegasNumber([4, 10], false)).toBe(104);
    expect(vegasNumber([4, null], false)).toBe(104);
    expect(vegasNumber([null, null], false)).toBe(1010);
  });

  it('scores the difference each hole and flips on a birdie', () => {
    // h1 par 4: Cody 4 & Dan 6 = 46 vs Marcus 5 & Priya 5 = 55 → A +9.
    // h2 par 5: Cody 4 (birdie) & Dan 5 = 45; Marcus 5 & Priya 6 flips to 65 → A +20 → 29.
    const results = resultsFrom({ cody: [4, 4], dan: [6, 5], marcus: [5, 5], priya: [5, 6] });
    const run = runGame(makeRound({ results }), teams(), vegas);
    expect(run.standings.headline).toBe('Cody & Dan +29 thru 2');
    expect(run.standings.subline).toBe('Cody & Dan vs Marcus & Priya · hole 2: 45 v 65');
    expect(run.settlement?.entries).toHaveLength(4);
    expect(run.settlement?.entries[0]).toEqual({ from: 'marcus', to: 'cody', amount: 29, reason: 'Vegas · 29 pts × 1' });
  });

  it('with flip off, the birdie does not change the other number', () => {
    const results = resultsFrom({ cody: [4, 4], dan: [6, 5], marcus: [5, 5], priya: [5, 6] });
    const run = runGame(makeRound({ results }), teams({ flip: false }), vegas);
    // 46 v 55 (+9) then 45 v 56 (+11).
    expect(run.standings.headline).toBe('Cody & Dan +20 thru 2');
  });

  it('asks for teams when they are not set', () => {
    const run = runGame(makeRound(), active('vegas', { stake: 1 }, 'gross'), vegas);
    expect(run.standings.headline).toBe('Pick the teams');
    expect(run.settlement).toBeNull();
  });
});
