import { buildContext, runGame } from './engine';
import { wolf, wolfFor } from './wolf';
import { active, makeRound, resultsFrom } from './__fixtures__/round';
import type { HoleResult } from '../types';
import { cody, marcus, priya } from '../lib/__fixtures__/cedarRidge';

const withInputs = (results: HoleResult[], inputs: Record<number, Record<string, string>>): HoleResult[] =>
  results.map((r) => (inputs[r.holeNumber] ? { ...r, gameInputs: { wolf: inputs[r.holeNumber]! } } : r));

describe('Wolf', () => {
  it('rotates the wolf through the group', () => {
    expect(wolfFor(['a', 'b', 'c', 'd'], 1)).toBe('a');
    expect(wolfFor(['a', 'b', 'c', 'd'], 4)).toBe('d');
    expect(wolfFor(['a', 'b', 'c', 'd'], 5)).toBe('a');
  });

  it('a partner is picked by id, so two players with the same name never get mixed up', () => {
    const samA = { ...priya, id: 'sam-a', name: 'Sam' };
    const samB = { ...priya, id: 'sam-b', name: 'Sam' };
    // Order: cody, marcus, sam-a, sam-b. Hole 1 wolf Cody takes the second Sam (by id); they win with a 3.
    const results = resultsFrom({ cody: [5], marcus: [5], 'sam-a': [6], 'sam-b': [3] });
    const round = makeRound({ players: [cody, marcus, samA, samB], results: withInputs(results, { 1: { mode: 'With a partner', partner: 'sam-b' } }) });
    const pts = Object.fromEntries(runGame(round, active('wolf', {}, 'gross'), wolf).standings.lines.map((l) => [l.playerId, l.value]));
    expect(pts).toEqual({ cody: 1, marcus: 0, 'sam-a': 0, 'sam-b': 1 });
  });

  it('scores partners, lone wolf wins and losses, and ties (gross)', () => {
    // Order: cody, marcus, priya, dan. h1 wolf Cody, h2 Marcus, h3 Priya, h4 Dan.
    const results = resultsFrom({
      cody: [4, 5, 4, 5],
      marcus: [5, 3, 4, 5],
      priya: [5, 5, 6, 5],
      dan: [6, 5, 4, 5],
    });
    const round = makeRound({
      results: withInputs(results, {
        1: { mode: 'With a partner', partner: 'Dan' }, // Cody+Dan best 4 vs Marcus+Priya best 5 → wolf side wins: Cody 1, Dan 1
        2: { mode: 'Alone' }, // Marcus 3 vs pack best 5 → lone wolf wins: Marcus 3
        3: { mode: 'Alone' }, // Priya 6 vs pack best 4 → pack wins: Cody, Marcus, Dan +1
        4: { mode: 'With a partner', partner: 'Cody' }, // all 5s → tie
      }),
    });
    const run = runGame(round, active('wolf', {}, 'gross'), wolf);
    const pts = Object.fromEntries(run.standings.lines.map((l) => [l.playerId, l.value]));
    expect(pts).toEqual({ cody: 2, marcus: 4, priya: 0, dan: 2 });
    expect(run.standings.headline).toBe('Marcus leads with 4 points');
    expect(run.standings.lines.map((l) => [l.playerId, l.value])).toEqual([['marcus', 4], ['cody', 2], ['dan', 2], ['priya', 0]]);
    expect(run.standings.subline).toBe('Cody is the wolf on 5');
    expect(run.settlement).toBeNull();
  });

  it('a hole without an answer is pending and scores nothing', () => {
    const results = resultsFrom({ cody: [4], marcus: [5], priya: [5], dan: [6] });
    const run = runGame(makeRound({ results }), active('wolf', {}, 'gross'), wolf);
    expect(run.standings.subline).toBe('Marcus is the wolf on 2 · 1 hole waiting on who the wolf took');
    expect(run.standings.lines.every((l) => l.value === 0)).toBe(true);
  });

  it('lone-wolf doubles (opt-in) doubles a lone hole, won or lost; partners are unaffected', () => {
    // h1 Cody alone wins: 3 × 2 = 6. h2 Marcus alone loses: the pack +2 each. h3 Priya takes Cody and wins: +1 each.
    const results = withInputs(resultsFrom({ cody: [3, 4, 3], marcus: [5, 6, 5], priya: [5, 5, 3], dan: [6, 5, 6] }), {
      1: { mode: 'Alone' },
      2: { mode: 'Alone' },
      3: { mode: 'With a partner', partner: 'cody' },
    });
    const doubled = runGame(makeRound({ results }), active('wolf', { loneDoubles: true }, 'gross'), wolf);
    const pts = Object.fromEntries(doubled.standings.lines.map((l) => [l.playerId, l.value]));
    expect(pts).toEqual({ cody: 6 + 2 + 1, marcus: 0, priya: 2 + 1, dan: 2 });
    // Off by default: the same holes score as before.
    const plain = Object.fromEntries(runGame(makeRound({ results }), active('wolf', {}, 'gross'), wolf).standings.lines.map((l) => [l.playerId, l.value]));
    expect(plain).toEqual({ cody: 3 + 1 + 1, marcus: 0, priya: 1 + 1, dan: 1 });
  });

  it('names the wolf on each hole for the prompt and leaves them out of the partners, in play order', () => {
    // Order: cody, marcus, priya, dan.
    const round = makeRound();
    const ctx = buildContext(round, active('wolf'), wolf);
    expect(wolf.holePrompt!(ctx, 1)).toEqual({ note: 'Cody is the wolf', exclude: ['cody'] });
    expect(wolf.holePrompt!(ctx, 2)).toEqual({ note: 'Marcus is the wolf', exclude: ['marcus'] });
    expect(wolf.holePrompt!(ctx, 5)).toEqual({ note: 'Cody is the wolf', exclude: ['cody'] });
    // Shotgun start on 10: hole 10 is played first (Cody); hole 1 is the tenth hole played (Marcus).
    const shotgun = buildContext({ ...round, settings: { ...round.settings, startHole: 10 } }, active('wolf'), wolf);
    expect(wolf.holePrompt!(shotgun, 10).note).toBe('Cody is the wolf');
    expect(wolf.holePrompt!(shotgun, 1).note).toBe('Marcus is the wolf');
  });

  it('applies the points multiplier', () => {
    const results = withInputs(resultsFrom({ cody: [3], marcus: [5], priya: [5], dan: [6] }), { 1: { mode: 'Alone' } });
    const run = runGame(makeRound({ results }), active('wolf', { points: 2 }, 'gross'), wolf);
    expect(run.standings.lines.find((l) => l.playerId === 'cody')?.value).toBe(6);
  });
});

describe('Wolf with three players and a stake', () => {
  const trio = [cody, marcus, priya];
  it('rotates through three, pays a lone wolf two, and settles every pair on the points difference', () => {
    // h1 wolf Cody alone and wins (+2). h2 wolf Marcus alone and loses: Cody, Priya +1. h3 wolf Priya takes Cody: side wins, +1 each.
    const results = withInputs(resultsFrom({ cody: [3, 4, 4], marcus: [5, 6, 5], priya: [5, 5, 5] }), {
      1: { mode: 'Alone' },
      2: { mode: 'Alone' },
      3: { mode: 'With a partner', partner: 'Cody' },
    });
    const run = runGame(makeRound({ players: trio, results }), active('wolf', { stake: 2 }, 'gross'), wolf);
    const pts = Object.fromEntries(run.standings.lines.map((l) => [l.playerId, l.value]));
    expect(pts).toEqual({ cody: 4, marcus: 0, priya: 2 });
    expect(run.standings.subline).toBe('Cody is the wolf on 4');
    expect(run.settlement?.entries.map((e) => `${e.from}>${e.to}:${e.amount}`)).toEqual(['marcus>cody:8', 'priya>cody:4', 'marcus>priya:4']);
    expect(run.settlement?.entries[0]?.reason).toBe('Wolf · Cody 4 pts up on Marcus × 2 pts = 8');
  });

  it('a stake of zero means points only', () => {
    const results = withInputs(resultsFrom({ cody: [3], marcus: [5], priya: [5] }), { 1: { mode: 'Alone' } });
    const run = runGame(makeRound({ players: trio, results }), active('wolf', { stake: 0 }, 'gross'), wolf);
    expect(run.settlement).toBeNull();
  });
});
