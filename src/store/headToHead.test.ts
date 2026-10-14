import type { HistoryEntry, Round } from '@/types';
import { cedarRidge, cody, marcus } from '@/lib/__fixtures__/cedarRidge';
import { headToHead } from './headToHead';

const round = (id: string, gameIds: string[], codyScore: number, marcusScore: number): HistoryEntry => {
  const holeResults = cedarRidge.holes.map((h) => ({ holeNumber: h.number, scores: { cody: codyScore, marcus: marcusScore } }));
  const r: Round = {
    id,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    status: 'complete',
    course: cedarRidge,
    teeBoxId: 'blue',
    players: [{ ...cody, profileId: 'pr_cody' }, { ...marcus, profileId: 'pr_marcus' }],
    games: gameIds.map((gameId) => ({ gameId, config: { stake: 5, carryover: true, validation: false }, basis: 'gross' as const })),
    settings: { holeCount: 18, allowance: 100, stakeLabel: 'points' },
    holeResults,
    currentHole: 18,
  };
  return { summary: { id, completedAt: '2026-10-01T00:00:00.000Z', courseName: cedarRidge.name, holeCount: 18, gameNames: [], players: [], leaderId: 'cody', resultLabel: '' }, round: r };
};

describe('headToHead', () => {
  it('nets the points between you and each friend across rounds, pair by pair', () => {
    // Gross skins at 5 a skin: Cody wins every hole (18 skins) in the first round, Marcus every hole in the second.
    const h = headToHead([round('a', ['skins'], 4, 5), round('b', ['skins'], 6, 5), round('c', [], 4, 5)], 'pr_cody').get('pr_marcus');
    expect(h).toEqual({ rounds: 3, points: 0, pointsRounds: 2 });
    expect(headToHead([round('a', ['skins'], 4, 5)], 'pr_cody').get('pr_marcus')?.points).toBe(90);
    expect(headToHead([round('a', ['skins'], 4, 5)], 'pr_marcus').get('pr_cody')?.points).toBe(-90);
  });

  it('is empty without you, or when you did not play', () => {
    expect(headToHead([round('a', ['skins'], 4, 5)], undefined).size).toBe(0);
    expect(headToHead([round('a', ['skins'], 4, 5)], 'pr_nobody').size).toBe(0);
  });
});
