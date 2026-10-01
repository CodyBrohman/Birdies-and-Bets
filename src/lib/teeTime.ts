// Tee-time picking for the round builder: three day pills and a handful of slots. Display only; nothing books.

export interface TeeDay {
  /** Local date, "2026-10-03". */
  key: string;
  /** "Today", "Tomorrow", then the weekday ("Saturday"). */
  label: string;
}

/** 24-hour local times offered as chips. */
export const TEE_SLOTS = ['07:20', '08:30', '09:40', '11:00', '13:10', '15:30'] as const;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today, tomorrow and the day after. */
export function teeDays(now: Date, count = 3): TeeDay[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { key: dateKey(d), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : WEEKDAYS[d.getDay()]! };
  });
}

/** "2026-10-03T08:30". */
export function teeTimeValue(day: string, slot: string): string {
  return `${day}T${slot}`;
}

/** Split a stored tee time back into its day key and slot. */
export function parseTeeTime(value: string | undefined): { day: string; slot: string } | null {
  const m = value ? /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value) : null;
  return m ? { day: m[1]!, slot: m[2]! } : null;
}

/** "8:30 AM", "1:10 PM". */
export function formatSlot(slot: string): string {
  const [h, m] = slot.split(':').map(Number) as [number, number];
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Saturday" / "Today" for the round card; the weekday when the date is outside the pill range. */
export function dayLabel(key: string, now: Date): string {
  const hit = teeDays(now, 7).find((d) => d.key === key);
  if (hit) return hit.label;
  const [y, mo, d] = key.split('-').map(Number) as [number, number, number];
  return WEEKDAYS[new Date(y, mo - 1, d).getDay()]!;
}
