import { pointsBreakdown, resultHeadline, resultRows, summarizeRound, stakeUnit } from './history';
import { computeAllHandicaps, holesInPlay } from './handicap';
import { netSettlements } from './settlement';
import { cedarRidge, cody, marcus, scratchTheo } from './__fixtures__/cedarRidge';
import { makeRound, resultsFrom } from '../games/__fixtures__/round';
import type { Standings } from '../types';

const full = (a: number[], b: number[]) => resultsFrom({ cody: a, marcus: b });
const eighteen = (n: number) => Array.from({ length: 18 }, () => n);

describe('summarizeRound', () => {
  const round = makeRound({ players: [cody, marcus], results: full(eighteen(4), eighteen(5)) });
  const holes = holesInPlay(cedarRidge, 18);
  const handicaps = computeAllHandicaps(round.players, cedarRidge, round.settings);

  it('records gross, net and strokes per player and features the net leader', () => {
    const s = summarizeRound({ round, holes, handicaps, standings: [], gameNames: ['Nassau'], netted: netSettlements([], ['cody', 'marcus']), completedAt: '2026-09-22T00:00:00Z' });
    expect(s.courseName).toBe('Cedar Ridge Golf Club');
    expect(s.teeName).toBe('Blue');
    expect(s.gameNames).toEqual(['Nassau']);
    expect(s.players[0]).toMatchObject({ id: 'cody', gross: 72, playingHandicap: handicaps.cody!.playingHandicap });
    expect(s.players[0]!.net).toBe(72 - handicaps.cody!.playingHandicap);
    expect(s.leaderId).toBe('cody');
    expect(s.completedAt).toBe('2026-09-22T00:00:00Z');
  });

  it('labels the leader with the netted stake when there is one', () => {
    const netted = netSettlements([{ gameId: 'nassau', entries: [{ from: 'marcus', to: 'cody', amount: 12, reason: 'overall' }] }], ['cody', 'marcus']);
    const s = summarizeRound({ round, holes, handicaps, standings: [], gameNames: ['Nassau'], netted });
    expect(s.resultLabel).toBe('+12 pts');
  });

  it('falls back to a social game points value, then to-par', () => {
    const standings: Standings[] = [{ gameId: 'stableford', basis: 'net', headline: '', lines: [{ playerId: 'cody', text: 'Cody · 38 pts', value: 38 }] }];
    const s = summarizeRound({ round, holes, handicaps, standings, gameNames: ['Stableford'], netted: netSettlements([], ['cody', 'marcus']) });
    expect(s.resultLabel).toBe('38 pts');
    const plain = summarizeRound({ round, holes, handicaps, standings: [], gameNames: [], netted: netSettlements([], ['cody', 'marcus']) });
    expect(plain.resultLabel).toBe('E');
  });

  it('features the gross leader when nobody has strokes', () => {
    const scratchRound = makeRound({ players: [scratchTheo, { ...marcus, handicapIndex: undefined }], results: resultsFrom({ theo: eighteen(5), marcus: eighteen(4) }) });
    const hcp = computeAllHandicaps(scratchRound.players, cedarRidge, scratchRound.settings);
    const s = summarizeRound({ round: scratchRound, holes, handicaps: hcp, standings: [], gameNames: [], netted: netSettlements([], ['theo', 'marcus']) });
    expect(s.leaderId).toBe('marcus');
    expect(s.resultLabel).toBe('E');
  });

  it('names a winner only with someone to beat and no tie at the top, and counts holes scored', () => {
    const scratch = { ...marcus, handicapIndex: undefined };
    const two = makeRound({ players: [scratchTheo, scratch], results: resultsFrom({ theo: eighteen(5), marcus: eighteen(4) }) });
    const hcp = computeAllHandicaps(two.players, cedarRidge, two.settings);
    const s = summarizeRound({ round: two, holes, handicaps: hcp, standings: [], gameNames: [], netted: netSettlements([], ['theo', 'marcus']) });
    expect(s.winnerId).toBe('marcus');
    expect(s.holesScored).toBe(18);

    const tied = makeRound({ players: [scratchTheo, scratch], results: resultsFrom({ theo: eighteen(4), marcus: eighteen(4) }) });
    expect(summarizeRound({ round: tied, holes, handicaps: hcp, standings: [], gameNames: [], netted: netSettlements([], ['theo', 'marcus']) }).winnerId).toBeUndefined();

    const solo = makeRound({ players: [scratchTheo], results: resultsFrom({ theo: [4, 4, 4] }) });
    const soloSummary = summarizeRound({ round: solo, holes, handicaps: computeAllHandicaps(solo.players, cedarRidge, solo.settings), standings: [], gameNames: [], netted: netSettlements([], ['theo']) });
    expect(soloSummary.winnerId).toBeUndefined();
    expect(soloSummary.holesScored).toBe(3);
  });

  it('ranks an unfinished card by score to par over the holes played, not raw strokes', () => {
    // Theo shot 4s on all 18 (E), Marcus 3s on only 9 holes (27 strokes but −9): Marcus leads.
    const scratch = { ...marcus, handicapIndex: undefined };
    const partial = makeRound({ players: [scratchTheo, scratch], results: resultsFrom({ theo: eighteen(4), marcus: [3, 4, 3, 3, 3, 2, 3, 4, 2] }) });
    const hcp = computeAllHandicaps(partial.players, cedarRidge, partial.settings);
    const s = summarizeRound({ round: partial, holes, handicaps: hcp, standings: [], gameNames: [], netted: netSettlements([], ['theo', 'marcus']) });
    expect(s.leaderId).toBe('marcus');
  });

  it('uses the configured stake label', () => {
    expect(stakeUnit('points')).toBe('pts');
    expect(stakeUnit('$')).toBe('$');
  });
});

describe('results', () => {
  const holes = holesInPlay(cedarRidge, 18);
  const rowsFor = (round: ReturnType<typeof makeRound>, netted = netSettlements([], round.players.map((p) => p.id))) =>
    resultRows(round, holes, computeAllHandicaps(round.players, cedarRidge, round.settings), netted);

  it('rows carry gross, net, course handicap and the points tally', () => {
    const round = makeRound({ players: [cody, marcus], results: full(eighteen(4), eighteen(5)) });
    const netted = netSettlements([{ gameId: 'skins', entries: [{ from: 'marcus', to: 'cody', amount: 15, reason: 'Skins · Cody 3 × 5 = 15' }] }], ['cody', 'marcus']);
    const [c, m] = rowsFor(round, netted);
    expect(c).toMatchObject({ id: 'cody', gross: 72, grossToPar: 0, holesScored: 18, points: 15 });
    expect(m).toMatchObject({ gross: 90, grossToPar: 18, points: -15 });
    expect(c!.net).toBe(72 - c!.playingHandicap);
    expect(c!.courseHandicap).toBeGreaterThan(0);
  });

  it('names a winner, a tie, or a lone golfer', () => {
    const won = rowsFor(makeRound({ players: [cody, marcus], results: full(eighteen(4), eighteen(5)) }));
    expect(resultHeadline(won, false)).toEqual({ title: 'Cody won', detail: '72 (E)' });
    expect(resultHeadline(won, true).title).toBe('Cody won');
    expect(resultHeadline(won, true).detail).toMatch(/^Net \d+ \(.+\) · Gross 72$/);

    const tied = rowsFor(makeRound({ players: [cody, scratchTheo], results: resultsFrom({ cody: eighteen(4), theo: eighteen(4) }) }));
    expect(resultHeadline(tied, false)).toEqual({ title: 'Cody and Theo tied', detail: 'E' });

    const solo = rowsFor(makeRound({ players: [cody], results: resultsFrom({ cody: [5, 5, 4] }) }));
    expect(resultHeadline(solo, false)).toEqual({ title: 'Cody shot 14', detail: '+1 over 3 holes' });
    expect(resultHeadline(rowsFor(makeRound({ players: [cody], results: [] })), false)).toEqual({ title: 'No scores entered', detail: null });
  });

  it('breaks points down without saying anyone owes anything', () => {
    const netted = netSettlements(
      [
        { gameId: 'skins', entries: [{ from: 'marcus', to: 'cody', amount: 15, reason: 'Skins · Cody 3 × 5 = 15' }] },
        { gameId: 'wolf', entries: [{ from: 'cody', to: 'marcus', amount: 5, reason: 'Wolf · Marcus 5 pts up on Cody × 1 pt = 5' }] },
      ],
      ['cody', 'marcus'],
    );
    const names: Record<string, string> = { cody: 'Cody', marcus: 'Marcus' };
    const b = pointsBreakdown(netted.pairs[0]!, (id) => names[id]!, 'points');
    expect(b.line).toBe('Cody +10 pts vs Marcus');
    expect(b.parts).toEqual(['Skins · Cody 3 × 5 = 15', 'Wolf · Marcus 5 pts up on Cody × 1 pt = 5 (to Marcus)']);
    expect([b.line, ...b.parts].join(' ')).not.toMatch(/owe|pay|settle/i);
  });
});
