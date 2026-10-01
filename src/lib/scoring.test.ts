import { computeAllHandicaps } from './handicap';
import { scoreOptions } from './scoring';
import {
  backNine,
  frontNine,
  grossOn,
  highest,
  holeScores,
  holePosition,
  holesPlayed,
  holesThrough,
  lowest,
  nextHoleNumber,
  playOrder,
  playedResults,
  prevHoleNumber,
  relationToPar,
  scoreOn,
  totals,
} from './scoring';
import { cedarRidge, foursome, throughSix } from './__fixtures__/cedarRidge';
import type { HoleResult } from '../types/round';

const handicaps = computeAllHandicaps(foursome, cedarRidge, { holeCount: 18, allowance: 100 });
const holes = cedarRidge.holes;

describe('relationToPar', () => {
  it('names every relation', () => {
    expect(relationToPar(-3)).toBe('albatross');
    expect(relationToPar(-2)).toBe('eagle');
    expect(relationToPar(-1)).toBe('birdie');
    expect(relationToPar(0)).toBe('par');
    expect(relationToPar(1)).toBe('bogey');
    expect(relationToPar(2)).toBe('double');
    expect(relationToPar(3)).toBe('triple-plus');
    expect(relationToPar(6)).toBe('triple-plus');
  });
});

describe('score lookup', () => {
  it('distinguishes unentered, picked up and scored', () => {
    const results: HoleResult[] = [{ holeNumber: 1, scores: { cody: 5, marcus: null } }];
    expect(grossOn(results, 'cody', 1)).toBe(5);
    expect(grossOn(results, 'marcus', 1)).toBeNull();
    expect(grossOn(results, 'priya', 1)).toBeUndefined();
    expect(grossOn(results, 'cody', 2)).toBeUndefined();
  });

  it('applies handicap strokes for net', () => {
    // Hole 2 is SI 1: everyone but Dan gets a stroke; Priya gets two.
    expect(scoreOn(throughSix, 'cody', 2, 'gross', handicaps.cody)).toBe(4);
    expect(scoreOn(throughSix, 'cody', 2, 'net', handicaps.cody)).toBe(3);
    expect(scoreOn(throughSix, 'priya', 2, 'net', handicaps.priya)).toBe(5);
    expect(scoreOn(throughSix, 'dan', 2, 'net', handicaps.dan)).toBe(3);
  });
});

describe('totals', () => {
  it('matches the brief through six holes, gross', () => {
    expect(totals(throughSix, holes, 'cody', 'gross')).toMatchObject({ strokes: 26, par: 24, toPar: 2, holesScored: 6 });
    expect(totals(throughSix, holes, 'marcus', 'gross')).toMatchObject({ strokes: 31, toPar: 7 });
    expect(totals(throughSix, holes, 'priya', 'gross')).toMatchObject({ strokes: 38, toPar: 14 });
    expect(totals(throughSix, holes, 'dan', 'gross')).toMatchObject({ strokes: 24, toPar: 0 });
  });

  it('computes net totals from allocated strokes', () => {
    // Cody strokes on holes 1,2,4 (SI 7,1,5) through six → 3 strokes
    expect(totals(throughSix, holes, 'cody', 'net', handicaps.cody)).toMatchObject({ strokes: 23, toPar: -1 });
    // Dan gives one back on hole 6 (SI 17) → net 25
    expect(totals(throughSix, holes, 'dan', 'net', handicaps.dan)).toMatchObject({ strokes: 25, toPar: 1 });
  });

  it('excludes picked-up holes from strokes and par, and reports completion', () => {
    const results: HoleResult[] = [
      { holeNumber: 1, scores: { cody: 5 } },
      { holeNumber: 2, scores: { cody: null } },
    ];
    const t = totals(results, holes.slice(0, 2), 'cody', 'gross');
    expect(t).toEqual({ strokes: 5, par: 4, toPar: 1, holesScored: 1, holesPickedUp: 1, complete: true });
    expect(totals(results, holes.slice(0, 3), 'cody', 'gross').complete).toBe(false);
  });

  it('splits front and back nine', () => {
    expect(frontNine(holes).map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(backNine(holes).map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(totals(throughSix, backNine(holes), 'cody', 'gross').holesScored).toBe(0);
  });
});

describe('progress', () => {
  it('reports holes through and ordered played results', () => {
    expect(holesThrough(throughSix)).toBe(6);
    expect(holesThrough([])).toBe(0);
    const shuffled = [throughSix[3]!, throughSix[0]!, { holeNumber: 9, scores: {} }, throughSix[1]!];
    expect(playedResults(shuffled).map((r) => r.holeNumber)).toEqual([1, 2, 4]);
  });
});

describe('holeScores / lowest / highest', () => {
  const ids = foursome.map((p) => p.id);

  it('returns net scores for a hole and finds the winner', () => {
    // Hole 1 (SI 7): gross Cody 5, Marcus 6, Priya 6, Dan 3. Strokes: Cody 1, Marcus 1, Priya 1, Dan 0.
    const s = holeScores(throughSix[0]!, ids, 'net', handicaps);
    expect(s).toEqual([
      { playerId: 'cody', score: 4 },
      { playerId: 'marcus', score: 5 },
      { playerId: 'priya', score: 5 },
      { playerId: 'dan', score: 3 },
    ]);
    expect(lowest(s).map((x) => x.playerId)).toEqual(['dan']);
    expect(highest(s).map((x) => x.playerId)).toEqual(['marcus', 'priya']);
  });

  it('skips pick-ups and missing players', () => {
    const r: HoleResult = { holeNumber: 3, scores: { cody: 4, marcus: null } };
    expect(holeScores(r, ids, 'gross', handicaps)).toEqual([{ playerId: 'cody', score: 4 }]);
    expect(lowest([])).toEqual([]);
    expect(highest([])).toEqual([]);
  });
});

describe('scoreOptions', () => {
  it('offers two under through five over, never below one', () => {
    expect(scoreOptions(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(scoreOptions(4)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(scoreOptions(5)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('play order', () => {
  const holes = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));
  it('rotates to the start hole and wraps', () => {
    const order = playOrder(holes, 10);
    expect(order.map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(holePosition(order, 10)).toBe(1);
    expect(holePosition(order, 9)).toBe(18);
    expect(nextHoleNumber(order, 18)).toBe(1);
    expect(nextHoleNumber(order, 9)).toBeNull();
    expect(prevHoleNumber(order, 10)).toBeNull();
    expect(prevHoleNumber(order, 1)).toBe(18);
  });
  it('leaves the order alone for hole 1 or an unknown start', () => {
    expect(playOrder(holes, 1)).toBe(holes);
    expect(playOrder(holes, 42)).toBe(holes);
    expect(playOrder(holes)).toBe(holes);
    expect(holePosition(holes, 99)).toBe(0);
  });
  it('counts played holes regardless of number', () => {
    const order = playOrder(holes, 10);
    expect(holesPlayed([{ holeNumber: 10, scores: { a: 4 } }, { holeNumber: 1, scores: {} }, { holeNumber: 3, scores: { a: 5 } }], order)).toBe(2);
  });
});
