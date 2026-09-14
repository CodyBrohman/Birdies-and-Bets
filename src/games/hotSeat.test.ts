import { runGame } from './engine';
import { hotSeat } from './hotSeat';
import { active, makeRound, resultsFrom } from './__fixtures__/round';
import { cody, dan, marcus } from '../lib/__fixtures__/cedarRidge';

describe('Hot Seat', () => {
  it('matches the brief: Priya takes the seat on 6', () => {
    const run = runGame(makeRound(), active('hot-seat'), hotSeat);
    expect(run.standings.headline).toBe('Priya is in the hot seat — next hole');
    expect(run.standings.subline).toBe('Took it on 6 with a net 5 · Putt with a wedge');
  });

  it('ties for worst leave the seat empty unless the holder is among them', () => {
    // h1: Marcus alone worst. h2: Marcus and Dan tie worst → Marcus keeps it, next punishment. h3: Cody and Dan tie → empty.
    const results = resultsFrom({ cody: [4, 4, 6], marcus: [6, 5, 4], dan: [4, 5, 6] });
    const round = makeRound({ players: [cody, marcus, dan], results });
    const h1 = runGame({ ...round, holeResults: results.slice(0, 1) }, active('hot-seat', {}, 'gross'), hotSeat);
    expect(h1.standings.headline).toBe('Marcus is in the hot seat — next hole');
    const h2 = runGame({ ...round, holeResults: results.slice(0, 2) }, active('hot-seat', {}, 'gross'), hotSeat);
    expect(h2.standings.headline).toBe('Marcus is in the hot seat — next hole');
    expect(h2.standings.subline).toContain('Tee off with an iron');
    const h3 = runGame(round, active('hot-seat', {}, 'gross'), hotSeat);
    expect(h3.standings.headline).toBe('Seat is empty — tied worst on 3');
  });

  it('a pick-up is the worst score; custom punishments are used', () => {
    const results = resultsFrom({ cody: [null], dan: [9] });
    const run = runGame(makeRound({ players: [cody, dan], results }), active('hot-seat', { punishments: ['Buy a round'] }, 'gross'), hotSeat);
    expect(run.standings.headline).toBe('Cody is in the hot seat — next hole');
    expect(run.standings.subline).toBe('Picked up on 1 · Buy a round');
    expect(run.standings.lines.map((l) => l.text)).toEqual(['Cody · in the seat 1×', 'Dan · in the seat 0×']);
  });
});
