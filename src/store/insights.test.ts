import { insightFor } from './insights';
import { makeRound } from '../games/__fixtures__/round';
import { cody, marcus } from '../lib/__fixtures__/cedarRidge';
import type { HistoryEntry } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('insightFor', () => {
  it('reruns games to get net points and counts holes per player', () => {
    const round = makeRound({ players: [{ ...cody, profileId: 'pr_cody' }, marcus], games: [{ gameId: 'match-play', config: { stake: 5 }, basis: 'gross', playerIds: ['cody', 'marcus'] }] });
    // Cody wins every hole through six → not closed yet; extend: 12 holes of Cody 4 / Marcus 5 closes 7&5 → 5 pts.
    const results = Array.from({ length: 12 }, (_, i) => ({ holeNumber: i + 1, scores: { cody: 4, marcus: 5 } }));
    const entry: HistoryEntry = { summary: { id: 'r', completedAt: 't', courseName: 'C', holeCount: 18, gameNames: ['Match Play'], players: [], leaderId: 'cody', resultLabel: '' }, round: { ...round, holeResults: results } };
    const i = insightFor(entry);
    expect(i.netByPlayer).toEqual({ cody: 5, marcus: -5 });
    expect(i.profileIds.cody).toBe('pr_cody');
    expect(i.counts.cody?.par).toBeGreaterThan(0);
    expect(i.stakeLabel).toBe('points');
  });
  it('degrades to empty maps without the full round', () => {
    const i = insightFor({ summary: { id: 'r', completedAt: 't', courseName: 'C', holeCount: 18, gameNames: [], players: [], leaderId: '', resultLabel: '' } });
    expect(i.netByPlayer).toEqual({});
  });
});
