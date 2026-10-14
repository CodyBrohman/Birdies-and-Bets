import { GAME_MODES, getGame } from './registry';
import { defaultConfig } from './types';
import { runGame } from './engine';
import { makeRound } from './__fixtures__/round';

describe('registry', () => {
  it('registers unique ids and the phase-4 catalog', () => {
    const ids = GAME_MODES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['skins', 'match-play', 'nassau', 'stroke-play', 'vegas', 'bingo-bango-bongo', 'hot-seat', 'stableford', 'wolf']);
    expect(getGame('skins')?.name).toBe('Skins');
    expect(getGame('nope')).toBeUndefined();
  });

  it('every game runs with default config on an empty round without throwing', () => {
    const round = makeRound({ results: [] });
    for (const mode of GAME_MODES) {
      const playerIds = mode.participantCount ? round.players.slice(0, mode.participantCount).map((p) => p.id) : undefined;
      const run = runGame(round, { gameId: mode.id, config: defaultConfig(mode.configFields), basis: mode.defaultBasis, playerIds }, mode);
      expect(typeof run.standings.headline).toBe('string');
      expect(run.standings.lines.length).toBeGreaterThan(0);
    }
  });

  it('game state is serialisable', () => {
    const round = makeRound();
    for (const mode of GAME_MODES) {
      const playerIds = mode.participantCount ? ['cody', 'marcus'] : undefined;
      const run = runGame(round, { gameId: mode.id, config: defaultConfig(mode.configFields), basis: 'net', playerIds }, mode);
      expect(JSON.parse(JSON.stringify(run.state))).toEqual(run.state);
    }
  });

  it('game copy talks about points, never paying, owing or betting', () => {
    const banned = /\b(pay|pays|paid|owe|owes|owed|wager|settle|settles|bet|bets)\b/i;
    for (const g of GAME_MODES) {
      const texts = [g.blurb, g.rules, ...g.configFields.flatMap((f) => [f.label, f.help ?? '', 'unit' in f ? (f.unit ?? '') : ''])];
      for (const t of texts) expect(`${g.id}: ${t}`).not.toMatch(banned);
    }
  });
});
