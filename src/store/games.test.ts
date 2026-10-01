import { participantCountOf, sidesLabel } from './games';
import { matchPlay } from '../games/matchPlay';
import { skins } from '../games/skins';
import { foursome } from '../lib/__fixtures__/cedarRidge';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('participantCountOf', () => {
  it('follows the format for head-to-head games and everyone for the rest', () => {
    expect(participantCountOf(matchPlay, { config: {} })).toBe(2);
    expect(participantCountOf(matchPlay, { config: { format: 'teams' } })).toBeUndefined();
    expect(participantCountOf(skins, { config: {} })).toBeUndefined();
  });
});

describe('sidesLabel', () => {
  it('names singles, teams, or asks for the teams', () => {
    expect(sidesLabel(matchPlay, { gameId: 'match-play', config: {}, basis: 'gross', playerIds: ['cody', 'marcus'] }, foursome)).toBe('Cody vs Marcus');
    expect(sidesLabel(matchPlay, { gameId: 'match-play', config: { format: 'teams', teams: ['cody', 'dan'] }, basis: 'gross' }, foursome)).toBe('Cody & Dan vs Marcus & Priya');
    expect(sidesLabel(matchPlay, { gameId: 'match-play', config: { format: 'teams', teams: [] }, basis: 'gross' }, foursome)).toBe('Pick the teams');
    expect(sidesLabel(skins, { gameId: 'skins', config: {}, basis: 'gross' }, foursome)).toBeNull();
  });
});
