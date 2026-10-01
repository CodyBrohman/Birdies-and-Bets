import { aggregateStats, countChips, findMe, formatNet, recentHoles, relationCounts, type RoundInsight } from './stats';
import { cedarRidge, foursome, throughSix } from './__fixtures__/cedarRidge';

const holes = cedarRidge.holes;

describe('relationCounts / countChips', () => {
  it('counts against par and pick-ups', () => {
    // Cody through six: 5 (bogey on p4), 4 (birdie p5), 4 (par), 5 (bogey), 5 (bogey), 3 (par p3)
    const c = relationCounts({ holeResults: throughSix }, holes.slice(0, 6), 'cody');
    expect([c.birdie, c.par, c.bogey, c.pickups]).toEqual([1, 2, 3, 0]);
    expect(countChips(c)).toEqual(['1 birdie', '2 pars']);
    const p = relationCounts({ holeResults: [{ holeNumber: 1, scores: { cody: null } }] }, holes.slice(0, 1), 'cody');
    expect(p.pickups).toBe(1);
  });
});

const insight = (id: string, players: { id: string; name: string; gross: number }[], leaderId: string, net: Record<string, number> = {}, profileIds: Record<string, string | undefined> = {}): RoundInsight => ({
  summary: { id, completedAt: `2026-09-0${id}T00:00:00Z`, courseName: 'Cedar Ridge', holeCount: 18, gameNames: ['Skins'], players: players.map((p) => ({ ...p, net: p.gross, grossToPar: p.gross - 72, playingHandicap: 0, holesPickedUp: 0 })), leaderId, resultLabel: '' },
  stakeLabel: 'points',
  profileIds,
  netByPlayer: net,
  counts: {},
});

describe('aggregateStats', () => {
  const rounds = [
    insight('1', [{ id: 'a', name: 'Cody', gross: 78 }, { id: 'b', name: 'Marcus', gross: 82 }], 'a', { a: 40, b: -40 }, { a: 'pr_cody' }),
    insight('2', [{ id: 'x', name: 'cody', gross: 74 }, { id: 'y', name: 'Dan', gross: 70 }], 'y', { x: -20, y: 20 }),
  ];
  it('is personal when me is found by profile id or name', () => {
    const s = aggregateStats(rounds, { id: 'pr_cody', name: 'Cody' });
    expect(s).toEqual({ kind: 'personal', name: 'Cody', rounds: 2, avgGross: 76, bestGross: 74, netPoints: 20, wins: 1 });
  });
  it('falls back to phone-wide when me is unset or absent', () => {
    expect(aggregateStats(rounds)).toEqual({ kind: 'phone', rounds: 2, courses: 1, games: 2, players: 3 });
    expect(aggregateStats(rounds, { id: 'nope', name: 'Priya' }).kind).toBe('phone');
  });
  it('findMe prefers the profile link over the name', () => {
    expect(findMe(rounds[0]!, { id: 'pr_cody', name: 'Someone else' })?.id).toBe('a');
  });
});

describe('formatNet', () => {
  it('signs with a true minus', () => {
    expect([formatNet(40), formatNet(-20), formatNet(0)]).toEqual(['+40', '−20', 'Even']);
  });
});

describe('recentHoles', () => {
  it('lists the last played holes with the group best, then the current hole', () => {
    const cells = recentHoles({ holeResults: throughSix, players: foursome }, holes, 7, 3);
    expect(cells.map((c) => c.holeNumber)).toEqual([4, 5, 6, 7]);
    // Hole 6 par 3: best is 3 (Cody, Dan) → par. Hole 4 par 4: best 5 → bogey.
    expect(cells[0]).toMatchObject({ best: 5, relation: 'bogey', current: false });
    expect(cells[2]).toMatchObject({ best: 3, relation: 'par' });
    expect(cells[3]).toMatchObject({ holeNumber: 7, best: undefined, current: true });
  });
});
