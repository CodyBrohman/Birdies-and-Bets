import type { Round } from '@/types';
import { cedarRidge, cody, marcus, throughSix } from '@/lib/__fixtures__/cedarRidge';
import { summarizeLive } from './liveRound';

const round = (patch: Partial<Round> = {}): Round => ({
  id: 'r1',
  createdAt: '2026-10-14T08:00:00.000Z',
  updatedAt: '2026-10-14T08:00:00.000Z',
  status: 'in-progress',
  course: cedarRidge,
  teeBoxId: 'blue',
  players: [{ ...cody, profileId: 'me' }, marcus],
  games: [],
  settings: { holeCount: 18, allowance: 100, stakeLabel: 'points' },
  holeResults: [],
  currentHole: 1,
  ...patch,
});

describe('summarizeLive', () => {
  it('says "You" with your score to par when you are playing', () => {
    const holeResults = throughSix.map((r) => ({ holeNumber: r.holeNumber, scores: { cody: r.scores.cody!, marcus: r.scores.marcus! } }));
    const s = summarizeLive(round({ holeResults, currentHole: 7 }), 'me', [{ name: 'Skins', headline: 'Marcus 3 skins' }]);
    expect(s).toMatchObject({ courseName: cedarRidge.name, hole: 7, played: 6, holeCount: 18, gameLine: 'Skins: Marcus 3 skins' });
    expect(s.scoreLine).toBe('You +2 thru 6'); // 26 on the par-24 first six
  });

  it('names the first player when you are only keeping score, and says nothing before the first score', () => {
    expect(summarizeLive(round(), undefined, []).scoreLine).toBeNull();
    const s = summarizeLive(round({ holeResults: [{ holeNumber: 1, scores: { cody: 4 } }] }), 'someone-else', []);
    expect(s.scoreLine).toBe('Cody E thru 1');
    expect(s.gameLine).toBeNull();
  });

  it('a pick-up on every hole so far reads PU, not a score', () => {
    const s = summarizeLive(round({ holeResults: [{ holeNumber: 1, scores: { cody: null } }] }), 'me', []);
    expect(s.scoreLine).toBe('You PU thru 1');
  });
});
