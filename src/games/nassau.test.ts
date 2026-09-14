import { runGame } from './engine';
import { nassau } from './nassau';
import { active, makeRound, resultsFrom } from './__fixtures__/round';
import { cody, marcus } from '../lib/__fixtures__/cedarRidge';

const cvm = (config = {}) => active('nassau', { stake: 5, presses: false, playOffLow: false, ...config }, 'gross', ['cody', 'marcus']);

describe('Nassau', () => {
  it('runs three bets and settles each that is decided', () => {
    // Cody wins holes 1-3, Marcus wins 10-13, everything else halved.
    const cody18 = Array(18).fill(4) as number[];
    const marcus18 = Array(18).fill(4) as number[];
    for (let i = 0; i < 3; i++) marcus18[i] = 5;
    for (let i = 9; i < 13; i++) cody18[i] = 5;
    const run = runGame(makeRound({ players: [cody, marcus], results: resultsFrom({ cody: cody18, marcus: marcus18 }) }), cvm(), nassau);
    expect(run.standings.headline).toBe('Cody won front · Marcus won back · Marcus won overall');
    // Front closes 3&2 on hole 7; back closes 4&3 on hole 15; overall goes the distance.
    expect(run.standings.lines.map((l) => l.text)).toEqual(['Front · Cody won 3&2', 'Back · Marcus won 4&3', 'Overall · Marcus won 1 up']);
    expect(run.settlement?.entries.map((e) => `${e.from}>${e.to}:${e.amount}`)).toEqual(['marcus>cody:5', 'cody>marcus:5', 'cody>marcus:5']);
  });

  it('shows live status mid-round', () => {
    const run = runGame(makeRound({ players: [cody, marcus], results: resultsFrom({ cody: [4, 4, 5], marcus: [5, 5, 5] }) }), cvm(), nassau);
    expect(run.standings.headline).toBe('Cody 2 up front · Back not started · Cody 2 up overall');
    expect(run.settlement?.entries).toEqual([]);
  });

  it('opens an automatic press at two down', () => {
    const run = runGame(makeRound({ players: [cody, marcus], results: resultsFrom({ cody: [4, 4, 4, 4], marcus: [5, 5, 4, 3] }) }), cvm({ presses: true }), nassau);
    // Cody 2 up after hole 2 → press from hole 3 to 9. Hole 3 halved, hole 4 Marcus wins → press: Marcus 1 up.
    expect(run.standings.subline).toBe('Cody vs Marcus · 1 press open');
    expect(run.standings.lines.map((l) => l.text)).toContain('Press 3–9 · Marcus 1 up thru 4');
    // Only one press opens while the front-nine deficit stays at 2.
    const again = runGame(makeRound({ players: [cody, marcus], results: resultsFrom({ cody: [4, 4, 4, 4, 4], marcus: [5, 5, 4, 4, 4] }) }), cvm({ presses: true }), nassau);
    expect(again.standings.lines.filter((l) => l.text.startsWith('Press')).length).toBe(1);
  });

  it('collapses to one match on nine holes', () => {
    const run = runGame(makeRound({ players: [cody, marcus], results: resultsFrom({ cody: [3], marcus: [4] }), holeCount: 9 }), cvm(), nassau);
    expect(run.standings.lines).toHaveLength(1);
    expect(run.standings.headline).toBe('Cody 1 up match');
  });
});
