import { runGame } from './engine';
import { bingoBangoBongo } from './bingoBangoBongo';
import { active, makeRound, resultsFrom } from './__fixtures__/round';
import { cody, dan, marcus } from '../lib/__fixtures__/cedarRidge';
import type { HoleResult } from '../types';

describe('Bingo Bango Bongo', () => {
  it('awards three points a hole from the answers and settles pairwise', () => {
    const results: HoleResult[] = resultsFrom({ cody: [4, 4], marcus: [5, 5], dan: [4, 4] }).map((r, i) => ({
      ...r,
      gameInputs: { 'bingo-bango-bongo': i === 0 ? { bingo: 'Cody', bango: 'Cody', bongo: 'Dan' } : { bingo: 'Marcus', bango: 'Dan', bongo: 'Dan' } },
    }));
    const run = runGame(makeRound({ players: [cody, marcus, dan], results }), active('bingo-bango-bongo', { stake: 2 }, 'gross'), bingoBangoBongo);
    expect(run.standings.headline).toBe('Dan 3 · Cody 2 · Marcus 1');
    expect(run.standings.subline).toBe('Points thru 2 · 3 a hole');
    expect(run.settlement?.entries).toEqual([
      { from: 'marcus', to: 'cody', amount: 2, reason: 'Bingo Bango Bongo · Cody 1 pts up on Marcus × 2' },
      { from: 'cody', to: 'dan', amount: 2, reason: 'Bingo Bango Bongo · Dan 1 pts up on Cody × 2' },
      { from: 'marcus', to: 'dan', amount: 4, reason: 'Bingo Bango Bongo · Dan 2 pts up on Marcus × 2' },
    ]);
  });

  it('flags holes with missing answers', () => {
    const results: HoleResult[] = resultsFrom({ cody: [4], dan: [4] }).map((r) => ({ ...r, gameInputs: { 'bingo-bango-bongo': { bingo: 'Cody' } } }));
    const run = runGame(makeRound({ players: [cody, dan], results }), active('bingo-bango-bongo', { stake: 1 }, 'gross'), bingoBangoBongo);
    expect(run.standings.subline).toBe('Points thru 1 · hole 1 missing answers');
    expect(run.standings.lines.find((l) => l.playerId === 'cody')?.value).toBe(1);
  });
});
