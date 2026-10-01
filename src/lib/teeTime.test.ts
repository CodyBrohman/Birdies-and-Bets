import { dayLabel, formatSlot, parseTeeTime, teeDays, teeTimeValue } from './teeTime';

describe('tee time', () => {
  const thu = new Date(2026, 9, 1, 18, 0); // Thursday 1 Oct 2026

  it('offers today, tomorrow and the weekday after', () => {
    expect(teeDays(thu)).toEqual([
      { key: '2026-10-01', label: 'Today' },
      { key: '2026-10-02', label: 'Tomorrow' },
      { key: '2026-10-03', label: 'Saturday' },
    ]);
  });

  it('crosses month ends', () => {
    expect(teeDays(new Date(2026, 9, 31))[1]).toEqual({ key: '2026-11-01', label: 'Tomorrow' });
  });

  it('round-trips a stored value', () => {
    const v = teeTimeValue('2026-10-03', '08:30');
    expect(v).toBe('2026-10-03T08:30');
    expect(parseTeeTime(v)).toEqual({ day: '2026-10-03', slot: '08:30' });
    expect(parseTeeTime('nonsense')).toBeNull();
    expect(parseTeeTime(undefined)).toBeNull();
  });

  it('formats 12-hour slots', () => {
    expect(formatSlot('07:20')).toBe('7:20 AM');
    expect(formatSlot('12:05')).toBe('12:05 PM');
    expect(formatSlot('13:10')).toBe('1:10 PM');
    expect(formatSlot('00:15')).toBe('12:15 AM');
  });

  it('labels days relative to now', () => {
    expect(dayLabel('2026-10-01', thu)).toBe('Today');
    expect(dayLabel('2026-10-03', thu)).toBe('Saturday');
    expect(dayLabel('2026-12-25', thu)).toBe('Friday');
  });
});
