// Back nine and shotgun starts: every game must reason in play order, never in hole numbers.
import { runGame } from './engine';
import { GAME_MODES } from './registry';
import { matchPlay } from './matchPlay';
import { nassau } from './nassau';
import { skins } from './skins';
import { strokePlay } from './strokePlay';
import { wolf } from './wolf';
import { hotSeat } from './hotSeat';
import { active, backNineRound, makeRound, resultsAt, resultsFrom, shotgunRound } from './__fixtures__/round';
import { cody, dan, marcus, priya } from '../lib/__fixtures__/cedarRidge';

const two = [cody, marcus];
const mp = () => active('match-play', { stake: 5, playOffLow: false }, 'gross', ['cody', 'marcus']);
const nas = () => active('nassau', { stake: 5, presses: false, playOffLow: false }, 'gross', ['cody', 'marcus']);
const sk = () => active('skins', { stake: 5, carryover: true, validation: false }, 'gross');
const nineOf = (from: number, f: (n: number) => { cody: number; marcus: number }) => {
  const scores: Record<number, { cody: number; marcus: number }> = {};
  for (let n = from; n < from + 9; n++) scores[n] = f(n);
  return resultsAt(scores);
};

describe('play order: back nine', () => {
  it('the context lists holes 10-18 and games treat 10 as the first hole', () => {
    const run = runGame(backNineRound({ players: two, results: resultsAt({ 10: { cody: 4, marcus: 5 } }) }), mp(), matchPlay);
    expect(run.standings.headline).toBe('Cody 1 up thru 1');
    expect(run.standings.subline).toBe('Cody vs Marcus · hole 11 next');
    expect(run.standings.closed).toBe(false);
    expect(run.standings.progression!.map((c) => c.holeNumber)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it('a match on the back nine closes at 18, not before', () => {
    const halved = runGame(backNineRound({ players: two, results: nineOf(10, () => ({ cody: 4, marcus: 4 })) }), mp(), matchPlay);
    expect(halved.standings.headline).toBe('Halved');
    const early = runGame(backNineRound({ players: two, results: resultsAt({ 10: { cody: 3, marcus: 5 }, 11: { cody: 3, marcus: 5 } }) }), mp(), matchPlay);
    expect(early.standings.headline).toBe('Cody 2 up thru 2');
    expect(early.standings.closed).toBe(false);
  });

  it('Nassau collapses to one match covering 10-18', () => {
    const run = runGame(backNineRound({ players: two, results: resultsAt({ 10: { cody: 3, marcus: 4 } }) }), nas(), nassau);
    expect(run.standings.lines).toHaveLength(1);
    expect(run.standings.headline).toBe('Cody 1 up match');
  });

  it('Skins: hole 18 is the last hole and a pot on 17 rolls into it', () => {
    const run = runGame(backNineRound({ players: two, results: resultsAt({ 17: { cody: 4, marcus: 4 } }) }), sk(), skins);
    expect(run.standings.subline).toMatch(/^Hole 18 is worth 2 skins/);
    const done = runGame(backNineRound({ players: two, results: resultsAt({ 17: { cody: 4, marcus: 4 }, 18: { cody: 3, marcus: 4 } }) }), sk(), skins);
    expect(done.standings.subline).toBe('Round complete');
    expect(done.standings.lines.find((l) => l.playerId === 'cody')?.value).toBe(2);
  });

  it('front-nine results are ignored on a back-nine round', () => {
    const run = runGame(backNineRound({ players: two, results: resultsAt({ 1: { cody: 3, marcus: 5 }, 10: { cody: 4, marcus: 4 } }) }), mp(), matchPlay);
    expect(run.standings.headline).toBe('All square thru 1');
  });

  it('stroke play settles after nine holes on the back', () => {
    const run = runGame(backNineRound({ players: two, results: nineOf(10, () => ({ cody: 4, marcus: 5 })) }), active('stroke-play', { stake: 5 }, 'gross'), strokePlay);
    expect(run.settlement?.entries).toEqual([{ from: 'marcus', to: 'cody', amount: 5, reason: 'Stroke Play · Cody low = 5' }]);
  });
});

describe('play order: shotgun start', () => {
  it('rotates the holes so 10 is played first and 9 is last', () => {
    const run = runGame(shotgunRound(10, { players: two, results: resultsAt({ 10: { cody: 4, marcus: 5 } }) }), mp(), matchPlay);
    expect(run.standings.headline).toBe('Cody 1 up thru 1');
    expect(run.standings.subline).toBe('Cody vs Marcus · hole 11 next');
    expect(run.standings.progression!.map((c) => c.holeNumber)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('wraps from 18 to 1 and finishes on 9', () => {
    const run = runGame(shotgunRound(10, { players: two, results: resultsAt({ 18: { cody: 4, marcus: 5 } }) }), mp(), matchPlay);
    expect(run.standings.subline).toBe('Cody vs Marcus · hole 1 next');
    const scores: Record<number, { cody: number; marcus: number }> = {};
    for (let n = 1; n <= 18; n++) scores[n] = { cody: 4, marcus: n === 9 ? 5 : 4 };
    const full = runGame(shotgunRound(10, { players: two, results: resultsAt(scores) }), mp(), matchPlay);
    expect(full.standings.headline).toBe('Cody won 1 up');
  });

  it('Nassau plays the back bet first and the front bet second', () => {
    const run = runGame(shotgunRound(10, { players: two, results: nineOf(10, (n) => ({ cody: 4, marcus: n <= 12 ? 5 : 4 })) }), nas(), nassau);
    expect(run.standings.lines.map((l) => l.text)).toEqual(['Front · All square', 'Back · Cody won 3&2', 'Overall · Cody 3 up thru 9']);
  });

  it('the wolf rotation starts with the first hole played', () => {
    const four = [cody, marcus, priya, dan];
    const run = runGame(shotgunRound(10, { players: four, results: resultsAt({ 10: { cody: 4, marcus: 5, priya: 5, dan: 5 } }) }), active('wolf', { points: 1 }, 'gross'), wolf);
    expect(run.standings.subline).toMatch(/^Marcus is the wolf on 11/);
  });

  it('hot seat knows the round is over after hole 9', () => {
    const scores: Record<number, { cody: number; marcus: number }> = {};
    for (let n = 1; n <= 18; n++) scores[n] = { cody: 4, marcus: 5 };
    const run = runGame(shotgunRound(10, { players: two, results: resultsAt(scores) }), active('hot-seat', {}, 'gross'), hotSeat);
    expect(run.standings.headline).toBe('Marcus is in the hot seat');
  });
});

describe('play order: 18-hole front start is unchanged', () => {
  it('every game yields identical standings with and without an explicit start hole of 1', () => {
    const results = resultsFrom({ cody: [5, 4, 4, 5, 5, 3], marcus: [6, 6, 5, 5, 5, 4], priya: [6, 7, 6, 7, 6, 6], dan: [3, 3, 5, 5, 5, 3] });
    for (const mode of GAME_MODES) {
      const cfg = mode.participantCount ? active(mode.id, { stake: 5 }, 'gross', ['cody', 'marcus']) : active(mode.id, { stake: 5 }, 'gross');
      const plain = runGame(makeRound({ results }), cfg, mode);
      const explicit = runGame(shotgunRound(1, { results }), cfg, mode);
      expect(explicit.standings).toEqual(plain.standings);
      expect(explicit.settlement).toEqual(plain.settlement);
    }
  });
});
