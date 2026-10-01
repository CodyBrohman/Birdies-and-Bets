import { describeHoleRow, describeProgression, describeScore, describeStandingsLine, describeTotalsRow, formatIndex, formatMatchStatus, formatShortDate, formatSigned, formatStake, formatToPar, initials, isSymbolLabel, joinMeta, plural, scoreChipLabel } from './format';

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

describe('scoreChipLabel', () => {
  it('names each score relative to par', () => {
    expect(scoreChipLabel(-2)).toBe('Eagle');
    expect(scoreChipLabel(-1)).toBe('Birdie');
    expect(scoreChipLabel(0)).toBe('Par');
    expect(scoreChipLabel(1)).toBe('Bogey');
    expect(scoreChipLabel(2)).toBe('Double');
    expect(scoreChipLabel(3)).toBe('Triple');
    expect(scoreChipLabel(4)).toBe('+4');
    expect(scoreChipLabel(5)).toBe('+5');
  });
});

describe('formatShortDate', () => {
  it('renders month and day', () => {
    expect(formatShortDate('2026-08-30T12:00:00')).toBe('Aug 30');
    expect(formatShortDate('garbage')).toBe('');
  });
});

describe('formatStake', () => {
  it('puts symbols in front and words behind', () => {
    expect(formatStake(5, 'points')).toBe('5 pts');
    expect(formatStake(5, '$')).toBe('$5');
    expect(formatStake('+12', '$')).toBe('+$12');
    expect(formatStake('−3', '€')).toBe('−€3');
    expect(formatStake(2, 'beers')).toBe('2 beers');
    expect(isSymbolLabel('$')).toBe(true);
    expect(isSymbolLabel('pts')).toBe(false);
  });
});

describe('VoiceOver descriptions', () => {
  it('describes a cell', () => {
    expect(describeScore(undefined)).toBe('not entered');
    expect(describeScore(null)).toBe('picked up');
    expect(describeScore(5, 'bogey', 1)).toBe('5, bogey, 1 stroke');
    expect(describeScore(7, 'triple-plus', 2)).toBe('7, triple or worse, 2 strokes');
    expect(describeScore(3, 'birdie', -1)).toBe('3, birdie, gives one back');
  });
  it('describes a hole row and totals', () => {
    expect(describeHoleRow({ number: 5, par: 4, strokeIndex: 12 }, [{ name: 'Cody', text: '4, par' }, { name: 'Marcus', text: 'not entered' }], true)).toBe('Hole 5, current hole, par 4, stroke index 12. Cody 4, par. Marcus not entered.');
    expect(describeTotalsRow('Out', 36, [{ name: 'Cody', strokes: 38 }, { name: 'Marcus', strokes: null }])).toBe('Out, par 36. Cody 38. Marcus not scored.');
    expect(describeTotalsRow('Total', null, [{ name: 'Cody', strokes: 76, toPar: 4 }, { name: 'Dan', strokes: 70, toPar: -2 }, { name: 'Pat', strokes: 72, toPar: 0 }])).toBe('Total. Cody 76, 4 over. Dan 70, 2 under. Pat 72, even.');
  });
  it('describes standings lines and the match strip', () => {
    expect(describeStandingsLine('Marcus · 9 skins', 'Marcus', true)).toBe('Marcus, 9 skins, leading');
    expect(describeStandingsLine('Front · Cody 2 up thru 6')).toBe('Front, Cody 2 up thru 6');
    expect(describeStandingsLine('Cody & Dan · 3 holes won', 'Cody')).toBe('Cody & Dan, 3 holes won');
    expect(describeProgression([{ holeNumber: 1, tone: 'a' }, { holeNumber: 2, tone: 'half' }, { holeNumber: 3, tone: 'b' }, { holeNumber: 4, tone: 'none' }], 'Cody', 'Marcus')).toBe('Holes: 1 Cody, 2 halved, 3 Marcus');
    expect(describeProgression([{ holeNumber: 1, tone: 'win' }], 'Cody', 'Marcus')).toBeNull();
  });
});
