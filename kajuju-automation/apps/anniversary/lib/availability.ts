/**
 * Static mock of unavailable dates so the disabled-date calendar UI can be
 * built and tested. Replace with a live Nobeds feed later — the calendar
 * component only depends on this list being an array of 'YYYY-MM-DD' strings.
 */
export const MOCK_UNAVAILABLE_DATES: string[] = [
  '2026-08-01',
  '2026-08-02',
  '2026-08-08',
  '2026-08-09',
  '2026-08-15',
  '2026-08-16',
  '2026-08-22',
  '2026-08-23',
  '2026-08-29',
  '2026-08-30',
];

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDateUnavailable(date: Date): boolean {
  return MOCK_UNAVAILABLE_DATES.includes(toDateKey(date));
}

/**
 * Re-checks a selected stay against the same mocked feed right before
 * payment, since no live PMS feed is wired up yet (Smoobu is deprecated,
 * eZee isn't confirmed production-ready). This is a placeholder for a real
 * PMS re-check, not a real one — it exists so the "re-check at payment, no
 * earlier hold" structure is already in place once a live feed exists.
 */
export function isStayStillAvailable(checkIn: Date | null, checkOut: Date | null): boolean {
  if (!checkIn || !checkOut) return false;
  const cursor = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const end = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  while (cursor < end) {
    if (isDateUnavailable(cursor)) return false;
    cursor.setDate(cursor.getDate() + 1);
  }
  return true;
}

/** Campaign booking window: bookings must be made within this range. */
export const BOOKING_WINDOW_START = new Date(2026, 6, 25); // 25 Jul 2026
export const BOOKING_WINDOW_END = new Date(2026, 7, 31); // 31 Aug 2026

/** Stay must be taken by this date. */
export const STAY_BY_DATE = new Date(2026, 8, 30); // 30 Sep 2026
