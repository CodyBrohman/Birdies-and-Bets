import {
  allocateStrokes,
  applyAllowance,
  applyMatchDifferential,
  computeAllHandicaps,
  computePlayerRoundState,
  courseHandicap,
  describeStrokes,
  holesInPlay,
  netScore,
  parFor,
  playingHandicap,
  rankedHoles,
  roundHalfAwayFromZero,
  strokesForHole,
} from './handicap';
import { cedarRidge, cody, dan, foursome, marcus, priya, scratchTheo } from './__fixtures__/cedarRidge';

const blue = cedarRidge.teeBoxes[0]!;
const PAR = 72;
const eighteen = { holeCount: 18 as const, allowance: 100 };
const nine = { holeCount: 9 as const, allowance: 100 };

describe('rounding', () => {
  it('rounds half away from zero in both directions', () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
    expect(roundHalfAwayFromZero(-2.4)).toBe(-2);
    expect(roundHalfAwayFromZero(0)).toBe(0);
  });
});

describe('courseHandicap', () => {
  it('matches the spec formula on Cedar Ridge Blue (71.4 / 128, par 72)', () => {
    expect(parFor(cedarRidge.holes)).toBe(PAR);
    expect(courseHandicap(8.2, blue, PAR)).toBe(9); // 9.29 − 0.6 = 8.69
    expect(courseHandicap(13.6, blue, PAR)).toBe(15); // 15.41 − 0.6 = 14.81
    expect(courseHandicap(21.4, blue, PAR)).toBe(24); // 24.24 − 0.6 = 23.64
    expect(courseHandicap(-1.8, blue, PAR)).toBe(-3); // −2.04 − 0.6 = −2.64
  });

  it('treats no index as scratch', () => {
    expect(courseHandicap(undefined, blue, PAR)).toBe(0);
  });

  it('degrades to scratch when the tee lacks rating or slope', () => {
    expect(courseHandicap(12.0, { slope: undefined, rating: undefined }, PAR)).toBe(0);
    expect(courseHandicap(12.0, { slope: 120, rating: undefined }, PAR)).toBe(0);
  });

  it('handles a plus handicap that stays plus', () => {
    // +4.0 on an easy tee: −4 × (110/113) + (68.0 − 72) = −3.89 − 4 = −7.89 → −8
    expect(courseHandicap(-4.0, { slope: 110, rating: 68.0 }, PAR)).toBe(-8);
  });
});

describe('strokesForHole (18 holes)', () => {
  it('a 22 gets a stroke everywhere and a second on SI 1–4', () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesForHole(22, si)).toBe(si <= 4 ? 2 : 1);
    }
  });

  it('a 9 gets one stroke on SI 1–9 only', () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesForHole(9, si)).toBe(si <= 9 ? 1 : 0);
    }
  });

  it('a plus-2 gives one back on SI 18 and 17', () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesForHole(-2, si)).toBe(si >= 17 ? -1 : 0);
    }
  });

  it('a scratch gets nothing anywhere', () => {
    for (let si = 1; si <= 18; si++) expect(strokesForHole(0, si)).toBe(0);
  });

  it('an 18 gets exactly one stroke on every hole', () => {
    for (let si = 1; si <= 18; si++) expect(strokesForHole(18, si)).toBe(1);
  });

  it('a 36 gets two on every hole', () => {
    for (let si = 1; si <= 18; si++) expect(strokesForHole(36, si)).toBe(2);
  });

  it('a plus-20 gives two back on SI 17–18 and one on the rest', () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesForHole(-20, si)).toBe(si >= 17 ? -2 : -1);
    }
  });

  it('total strokes always equals the handicap', () => {
    for (const h of [-20, -3, -1, 0, 1, 9, 17, 18, 19, 22, 36, 45]) {
      let sum = 0;
      for (let si = 1; si <= 18; si++) sum += strokesForHole(h, si);
      expect(sum).toBe(h);
    }
  });
});

describe('allocateStrokes on the real course', () => {
  it('Cody (9) gets strokes on the nine hardest holes', () => {
    const s = allocateStrokes(9, cedarRidge.holes);
    const holesWithStroke = Object.entries(s)
      .filter(([, v]) => v === 1)
      .map(([n]) => Number(n))
      .sort((a, b) => a - b);
    // SI 1–9 are holes 2, 10, 7, 17, 4, 12, 1, 14, 8
    expect(holesWithStroke).toEqual([1, 2, 4, 7, 8, 10, 12, 14, 17]);
    expect(s[7]).toBe(1); // SI 3
    expect(s[3]).toBe(0); // SI 11
  });

  it('Dan (−3) gives one back on SI 18, 17, 16 = holes 15, 6, 11', () => {
    const s = allocateStrokes(-3, cedarRidge.holes);
    expect(s[15]).toBe(-1);
    expect(s[6]).toBe(-1);
    expect(s[11]).toBe(-1);
    expect(s[7]).toBe(0); // SI 3: no give-back on a hard hole
    expect(Object.values(s).reduce((a, b) => a + b, 0)).toBe(-3);
  });
});

describe('allowance', () => {
  it('defaults to 100%', () => {
    expect(applyAllowance(15)).toBe(15);
  });
  it('applies a percentage and rounds', () => {
    expect(applyAllowance(15, 90)).toBe(14); // 13.5 → 14
    expect(applyAllowance(9, 90)).toBe(8); // 8.1 → 8
    expect(applyAllowance(-3, 90)).toBe(-3); // −2.7 → −3
  });
});

describe('nine-hole rounds', () => {
  it('halves the course handicap', () => {
    expect(playingHandicap(9, 9)).toBe(5); // 4.5 → 5
    expect(playingHandicap(15, 9)).toBe(8); // 7.5 → 8
    expect(playingHandicap(-3, 9)).toBe(-2); // −1.5 → −2
    expect(playingHandicap(24, 9)).toBe(12);
  });

  it('re-ranks stroke indexes among the nine holes in play', () => {
    const front = holesInPlay(cedarRidge, 9);
    expect(front).toHaveLength(9);
    const ranks = Object.fromEntries(rankedHoles(front).map(({ hole, rank }) => [hole.number, rank]));
    // Front-nine SIs: 7 1 11 5 13 17 3 9 15 → ranks: hole2=1, hole7=2, hole4=3, hole1=4, hole8=5, hole3=6, hole5=7, hole9=8, hole6=9
    expect(ranks).toEqual({ 1: 4, 2: 1, 3: 6, 4: 3, 5: 7, 6: 9, 7: 2, 8: 5, 9: 8 });
  });

  it('allocates a 5 over the front nine by re-ranked SI', () => {
    const s = allocateStrokes(5, holesInPlay(cedarRidge, 9));
    expect(s).toEqual({ 1: 1, 2: 1, 3: 0, 4: 1, 5: 0, 6: 0, 7: 1, 8: 1, 9: 0 });
  });

  it('computes a full nine-hole player state', () => {
    const state = computePlayerRoundState(cody, cedarRidge, nine);
    expect(state.courseHandicap).toBe(9);
    expect(state.playingHandicap).toBe(5);
    expect(Object.keys(state.strokesByHole)).toHaveLength(9);
  });
});

describe('computePlayerRoundState', () => {
  it('builds the brief foursome', () => {
    const all = computeAllHandicaps(foursome, cedarRidge, eighteen);
    expect(all.cody?.courseHandicap).toBe(9);
    expect(all.marcus?.courseHandicap).toBe(15);
    expect(all.priya?.courseHandicap).toBe(24);
    expect(all.dan?.courseHandicap).toBe(-3);
    // Hole 7, SI 3: Cody 1, Marcus 1, Priya 2, Dan 0
    expect(all.cody?.strokesByHole[7]).toBe(1);
    expect(all.marcus?.strokesByHole[7]).toBe(1);
    expect(all.priya?.strokesByHole[7]).toBe(2);
    expect(all.dan?.strokesByHole[7]).toBe(0);
  });

  it('a player with no index plays gross', () => {
    const state = computePlayerRoundState(scratchTheo, cedarRidge, eighteen);
    expect(state.courseHandicap).toBe(0);
    expect(Object.values(state.strokesByHole).every((v) => v === 0)).toBe(true);
  });

  it('falls back to the first tee box when the player tee is unknown', () => {
    const state = computePlayerRoundState({ ...cody, teeBoxId: 'nope' }, cedarRidge, eighteen);
    expect(state.courseHandicap).toBe(9);
  });

  it('degrades to gross for a course without ratings', () => {
    const bare = { ...cedarRidge, teeBoxes: [{ id: 'blue', name: 'Blue' }] };
    const state = computePlayerRoundState(cody, bare, eighteen);
    expect(state.courseHandicap).toBe(0);
  });
});

describe('applyMatchDifferential', () => {
  it('plays the match off the low handicapper', () => {
    const all = computeAllHandicaps(foursome, cedarRidge, eighteen);
    const adjusted = applyMatchDifferential(all, ['cody', 'marcus'], cedarRidge.holes);
    expect(adjusted.cody?.playingHandicap).toBe(0);
    expect(adjusted.marcus?.playingHandicap).toBe(6);
    expect(adjusted.marcus?.strokesByHole[2]).toBe(1); // SI 1
    expect(adjusted.marcus?.strokesByHole[1]).toBe(0); // SI 7
    // Non-participants untouched
    expect(adjusted.priya).toBe(all.priya);
  });

  it('handles a plus handicapper as the low man', () => {
    const all = computeAllHandicaps([dan, priya], cedarRidge, eighteen);
    const adjusted = applyMatchDifferential(all, ['dan', 'priya'], cedarRidge.holes);
    expect(adjusted.dan?.playingHandicap).toBe(0);
    expect(adjusted.priya?.playingHandicap).toBe(27);
  });
});

describe('netScore', () => {
  it('subtracts strokes and preserves a pick-up', () => {
    expect(netScore(5, 1)).toBe(4);
    expect(netScore(4, -1)).toBe(5);
    expect(netScore(null, 1)).toBeNull();
  });
});

describe('describeStrokes', () => {
  const holes = cedarRidge.holes;
  it('describes the brief cases', () => {
    const all = computeAllHandicaps([...foursome, scratchTheo], cedarRidge, eighteen);
    expect(describeStrokes(all.cody!, holes)).toBe('9 strokes · SI 1–9');
    expect(describeStrokes(all.marcus!, holes)).toBe('15 strokes · SI 1–15');
    expect(describeStrokes(all.priya!, holes)).toBe('24 strokes · all 18, second on SI 1–6');
    expect(describeStrokes(all.dan!, holes)).toBe('Gives 3 back · SI 16–18');
    expect(describeStrokes(all.theo!, holes)).toBe('Playing gross — no strokes');
  });
  it('handles the singular give-back and exact multiples', () => {
    expect(describeStrokes({ playerId: 'x', courseHandicap: -1, playingHandicap: -1, strokesByHole: {} }, holes)).toBe('Gives one back · SI 18');
    expect(describeStrokes({ playerId: 'x', courseHandicap: 18, playingHandicap: 18, strokesByHole: {} }, holes)).toBe('18 strokes · all 18');
    expect(describeStrokes({ playerId: 'x', courseHandicap: 1, playingHandicap: 1, strokesByHole: {} }, holes)).toBe('1 stroke · SI 1–1');
  });
});

// Keep the fixture import used even if a case above is removed.
void marcus;
void priya;
