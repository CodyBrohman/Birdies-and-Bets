import { dayLabel, formatSlot, formatTeeTime, parseTeeTime, suggestedTeeTime, teeDays, teeTimeFromDate, teeTimeToDate, teeTimeValue } from './teeTime';

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

describe('tee time as a date', () => {
  it('converts both ways and suggests the next ten minutes an hour out', () => {
    expect(teeTimeFromDate(new Date(2026, 9, 3, 8, 5))).toBe('2026-10-03T08:05');
    expect(teeTimeToDate('2026-10-03T08:05')?.getTime()).toBe(new Date(2026, 9, 3, 8, 5).getTime());
    expect(teeTimeToDate('garbage')).toBeNull();
    expect(suggestedTeeTime(new Date(2026, 9, 3, 8, 3))).toBe('2026-10-03T09:10');
    expect(suggestedTeeTime(new Date(2026, 9, 3, 23, 30))).toBe('2026-10-04T00:30');
  });

  it('reads as a day and a time', () => {
    const now = new Date(2026, 9, 3, 7, 0);
    expect(formatTeeTime('2026-10-03T08:30', now)).toBe('Today, 8:30 AM');
    expect(formatTeeTime('2026-10-04T13:10', now)).toBe('Tomorrow, 1:10 PM');
    expect(formatTeeTime(undefined, now)).toBeNull();
  });
});
