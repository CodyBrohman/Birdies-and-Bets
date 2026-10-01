import { summarizeRound, stakeUnit } from './history';
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

  it('uses the configured stake label', () => {
    expect(stakeUnit('points')).toBe('pts');
    expect(stakeUnit('$')).toBe('$');
  });
});
