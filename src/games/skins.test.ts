import { runGame } from './engine';
import { skins } from './skins';
import { active, makeRound, resultsFrom } from './__fixtures__/round';
import { cody, dan, marcus } from '../lib/__fixtures__/cedarRidge';

describe('Skins', () => {
  it('matches the brief through six holes (net, carryover)', () => {
    const run = runGame(makeRound(), active('skins', { stake: 5, carryover: true }), skins);
    // Net: h1 Dan wins; h2–h4 tie and carry; h5 Marcus takes 4; h6 Cody takes 1.
    expect(run.standings.headline).toBe('Marcus 4 skins · Cody 1 skin · Dan 1 skin');
    expect(run.standings.subline).toBe('Hole 7 is worth 1 skin · 5 pts from each player');
    const strip = run.standings.progression!.map((c) => c.label ?? '');
    expect(strip.slice(0, 6)).toEqual(['D', '↷', '↷', '↷', 'M×4', 'C']);
    expect(run.standings.progression![6]!.tone).toBe('none');
  });

  it('reports what the next hole is worth while carrying', () => {
    const round = makeRound({ results: makeRound().holeResults.slice(0, 4) });
    const run = runGame(round, active('skins', { stake: 5 }), skins);
    expect(run.standings.headline).toBe('Dan 1 skin · 3 carrying');
    expect(run.standings.subline).toBe('Hole 5 is worth 4 skins · 20 pts from each player');
  });

  it('with carryover off, a tie is simply nobody', () => {
    const round = makeRound({ results: makeRound().holeResults.slice(0, 5) });
    const run = runGame(round, active('skins', { stake: 5, carryover: false }), skins);
    expect(run.standings.headline).toBe('Marcus 1 skin · Dan 1 skin');
  });

  it('settles each skin against every other player', () => {
    const run = runGame(makeRound(), active('skins', { stake: 5 }), skins);
    const entries = run.settlement!.entries;
    // Marcus 4 skins × 5 = 20 from each of three others; Cody and Dan 1 skin × 5 from each other.
    expect(entries.filter((e) => e.to === 'marcus').map((e) => e.amount)).toEqual([20, 20, 20]);
    expect(entries.filter((e) => e.to === 'cody' && e.from === 'marcus')[0]?.amount).toBe(5);
    expect(entries).toHaveLength(3 + 3 + 3);
  });

  it('excludes a pick-up from the hole and voids a hole nobody finished', () => {
    const results = resultsFrom({ cody: [4, null], dan: [null, null] });
    const run = runGame(makeRound({ players: [cody, dan], results }), active('skins', { stake: 1 }, 'gross'), skins);
    expect(run.standings.lines.find((l) => l.playerId === 'cody')?.value).toBe(1);
    expect(run.standings.headline).toBe('Cody 1 skin · 1 carrying');
  });

  it('validation: a skin is lost when the winner fails to tie low on the next hole', () => {
    const results = resultsFrom({ cody: [3, 6, 4], dan: [4, 4, 4] });
    const run = runGame(makeRound({ players: [cody, dan], results }), active('skins', { stake: 1, validation: true }, 'gross'), skins);
    // h1 Cody wins (pending); h2 Dan low, Cody not → Cody's skin rolls into h2 pot (2) → Dan wins 2 (pending); h3 tie → validated.
    expect(run.standings.headline).toBe('Dan 2 skins · 1 carrying');
  });

  it('validation: the last hole validates itself', () => {
    const results = resultsFrom({ cody: Array(9).fill(4), dan: [...Array(8).fill(4), 3] });
    const run = runGame(makeRound({ players: [cody, dan], results, holeCount: 9 }), active('skins', { stake: 1, validation: true }, 'gross'), skins);
    expect(run.standings.headline).toBe('Dan 9 skins');
  });

  it('is fully recomputed when an earlier hole is edited', () => {
    const base = makeRound();
    const edited = { ...base, holeResults: base.holeResults.map((r) => (r.holeNumber === 2 ? { ...r, scores: { ...r.scores, marcus: 4 } } : r)) };
    // Marcus 4 gross on h2 = net 3, beating Cody/Dan's 3? Tie at 3 → still carries. Make it a 3 gross → net 2 wins.
    const edited2 = { ...base, holeResults: base.holeResults.map((r) => (r.holeNumber === 2 ? { ...r, scores: { ...r.scores, marcus: 3 } } : r)) };
    expect(runGame(edited, active('skins', { stake: 5 }), skins).standings.headline).toBe('Marcus 4 skins · Cody 1 skin · Dan 1 skin');
    expect(runGame(edited2, active('skins', { stake: 5 }), skins).standings.headline).toBe('Marcus 4 skins · Cody 1 skin · Dan 1 skin');
    // Same totals, different path: Marcus won h2 outright (1 skin), then h5 was worth 3.
    expect(runGame(edited2, active('skins', { stake: 5 }), skins).standings.progression!.slice(0, 6).map((c) => c.label)).toEqual(['D', 'M', '↷', '↷', 'M×3', 'C']);
  });

  void marcus;
});
