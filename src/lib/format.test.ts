import { formatIndex, formatMatchStatus, formatSigned, formatToPar, initials, joinMeta, plural } from './format';

describe('formatToPar', () => {
  it('uses E and a true minus sign', () => {
    expect(formatToPar(0)).toBe('E');
    expect(formatToPar(2)).toBe('+2');
    expect(formatToPar(-1)).toBe('−1');
  });
});

describe('formatSigned / formatIndex', () => {
  it('formats handicaps', () => {
    expect(formatSigned(9)).toBe('9');
    expect(formatSigned(-1)).toBe('−1');
    expect(formatIndex(8.2)).toBe('8.2');
    expect(formatIndex(-1.8)).toBe('+1.8');
    expect(formatIndex(undefined)).toBe('—');
  });
});

describe('formatMatchStatus', () => {
  it('speaks match-play vocabulary', () => {
    expect(formatMatchStatus({ leaderName: 'Cody', lead: 2, thru: 6, holesRemaining: 12, closed: false })).toBe('Cody 2 up thru 6');
    expect(formatMatchStatus({ lead: 0, thru: 6, holesRemaining: 12, closed: false })).toBe('All square thru 6');
    expect(formatMatchStatus({ lead: 0, thru: 0, holesRemaining: 18, closed: false })).toBe('All square');
    expect(formatMatchStatus({ leaderName: 'Cody', lead: 3, thru: 16, holesRemaining: 2, closed: true })).toBe('Cody won 3&2');
    expect(formatMatchStatus({ leaderName: 'Cody', lead: 1, thru: 18, holesRemaining: 0, closed: true })).toBe('Cody won 1 up');
    expect(formatMatchStatus({ lead: 0, thru: 18, holesRemaining: 0, closed: true, leaderName: 'Cody' })).toBe('Halved');
  });
});

describe('small helpers', () => {
  it('pluralises, joins meta and makes initials', () => {
    expect(plural(1, 'skin')).toBe('1 skin');
    expect(plural(3, 'skin')).toBe('3 skins');
    expect(joinMeta(['Blue tees', null, '4 players', '', '3 games'])).toBe('Blue tees · 4 players · 3 games');
    expect(initials('Cody Brohman')).toBe('CB');
    expect(initials('Priya')).toBe('P');
    expect(initials('  marcus  reyes  jr ')).toBe('MR');
  });
});
