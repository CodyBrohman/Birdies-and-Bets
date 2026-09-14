import { runGame } from './engine';
import { matchPlay } from './matchPlay';
import { active, makeRound, resultsFrom } from './__fixtures__/round';
import { cody, marcus } from '../lib/__fixtures__/cedarRidge';

const cvm = (config = {}) => active('match-play', { stake: 5, playOffLow: true, ...config }, 'net', ['cody', 'marcus']);

describe('Match Play', () => {
  it('plays off the low handicap: Cody 3 up thru 6', () => {
    const run = runGame(makeRound(), cvm(), matchPlay);
    // Marcus plays off 6: strokes on h2 (SI1) and h4 (SI5) in the first six.
    expect(run.standings.headline).toBe('Cody 3 up thru 6');
    expect(run.standings.subline).toBe('Cody vs Marcus · hole 7 next');
    expect(run.standings.progression!.slice(0, 6).map((c) => c.tone)).toEqual(['a', 'a', 'a', 'b', 'half', 'a']);
    expect(run.settlement).toBeNull();
  });

  it('without play-off-low, Marcus gets his full 15 strokes', () => {
    const run = runGame(makeRound(), cvm({ playOffLow: false }), matchPlay);
    // h1 C4 v M5 a; h2 C3 v M5 a; h3 C4 v M4 half; h4 C4 v M4 half; h5 C5 v M4 b; h6 C3 v M4 a → 2 up
    expect(run.standings.progression!.slice(0, 6).map((c) => c.tone)).toEqual(['a', 'a', 'half', 'half', 'b', 'a']);
    expect(run.standings.headline).toBe('Cody 2 up thru 6');
  });

  it('closes out when the lead exceeds holes remaining and settles once', () => {
    const results = resultsFrom({ cody: Array(16).fill(4), marcus: [...Array(3).fill(5), ...Array(13).fill(4)] });
    const round = makeRound({ players: [cody, marcus], results });
    const run = runGame(round, active('match-play', { stake: 5 }, 'gross', ['cody', 'marcus']), matchPlay);
    expect(run.standings.closed).toBe(true);
    expect(run.standings.headline).toBe('Cody won 3&2');
    expect(run.settlement?.entries).toEqual([{ from: 'marcus', to: 'cody', amount: 5, reason: 'Match Play · Cody won 3&2 = 5' }]);
  });

  it('keeps the result once closed even if later holes are scored', () => {
    const results = resultsFrom({ cody: Array(18).fill(4), marcus: [...Array(3).fill(5), ...Array(15).fill(3)] });
    const run = runGame(makeRound({ players: [cody, marcus], results }), active('match-play', { stake: 5 }, 'gross', ['cody', 'marcus']), matchPlay);
    // Cody 3 up after 3; Marcus wins every hole from 4. Lead 7 with 5 to play after hole 13 → 7&5; holes after stay unplayed in the strip.
    expect(run.standings.headline).toBe('Marcus won 7&5');
    expect(run.standings.progression![13]!.tone).toBe('none');
  });

  it('a pick-up loses the hole; both picking up skips it', () => {
    const results = resultsFrom({ cody: [null, null], marcus: [4, null] });
    const run = runGame(makeRound({ players: [cody, marcus], results }), active('match-play', {}, 'gross', ['cody', 'marcus']), matchPlay);
    expect(run.standings.headline).toBe('Marcus 1 up thru 2');
  });

  it('a match that ends all square is halved with no settlement', () => {
    const results = resultsFrom({ cody: Array(9).fill(4), marcus: Array(9).fill(4) });
    const run = runGame(makeRound({ players: [cody, marcus], results, holeCount: 9 }), active('match-play', { stake: 5 }, 'gross', ['cody', 'marcus']), matchPlay);
    expect(run.standings.headline).toBe('Halved');
    expect(run.settlement).toBeNull();
  });
});
