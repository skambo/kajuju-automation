/**
 * Anniversary meals-and-drinks allowance. No financial-instrument naming
 * anywhere in user-facing copy — an earlier version named this concept as a
 * standalone product, which still read as a coupon-style mechanic. This
 * version drops the named-product framing entirely: guests are told a plain
 * amount "has been set aside" for them, as part of the invitation.
 */
export const ANNIVERSARY_MEALS_BASE_STANDARD = 1500; // 1 room, 1-2 guests
export const ANNIVERSARY_MEALS_BASE_GROUP = 3000; // 2+ rooms or 3+ guests
export const WEEKDAY_TOPUP = 500; // flat add-on when check-in falls Sun-Thu

export interface MealsAllowanceInput {
  roomCount: number;
  partySize: number;
  /** Check-in date, if selected yet. */
  checkInDate: Date | null;
}

/** Sunday = 0 ... Saturday = 6. Sun-Thu inclusive is the "weekday" band. */
export function isWeekdayCheckIn(date: Date): boolean {
  const day = date.getDay();
  return day >= 0 && day <= 4;
}

export function calculateMealsAllowance({
  roomCount,
  partySize,
  checkInDate,
}: MealsAllowanceInput): number {
  const isGroup = roomCount >= 2 || partySize >= 3;
  const base = isGroup
    ? ANNIVERSARY_MEALS_BASE_GROUP
    : ANNIVERSARY_MEALS_BASE_STANDARD;
  const topup = checkInDate && isWeekdayCheckIn(checkInDate) ? WEEKDAY_TOPUP : 0;
  return base + topup;
}

/**
 * Plain-text breakdown of how the total was reached, e.g.
 * "KES 3,000 family stay + KES 500 weekday arrival" — shown inline on each
 * room card so the amount is never an unexplained number. Empty string when
 * the amount is just the plain base (nothing to explain).
 */
export function describeMealsAllowanceBreakdown({
  roomCount,
  partySize,
  checkInDate,
}: MealsAllowanceInput): string {
  const isGroup = roomCount >= 2 || partySize >= 3;
  const hasTopup = Boolean(checkInDate && isWeekdayCheckIn(checkInDate));
  if (!isGroup && !hasTopup) return '';
  const parts: string[] = [
    isGroup
      ? `${formatKES(ANNIVERSARY_MEALS_BASE_GROUP)} family stay`
      : `${formatKES(ANNIVERSARY_MEALS_BASE_STANDARD)} base`,
  ];
  if (hasTopup) parts.push(`${formatKES(WEEKDAY_TOPUP)} weekday arrival`);
  return parts.join(' + ');
}

/**
 * Room rates are priced weekday (Sun-Thu) vs weekend (Fri-Sat), per the
 * published rate card on rates.idanbarnsuites.com. This is distinct from
 * the meals allowance's Sun-Thu check-in top-up above — two separate
 * systems that happen to both care about day-of-week.
 */
export function isWeekendNight(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6; // Fri, Sat
}

export interface RoomSubtotalInput {
  weekdayRate: number;
  weekendRate: number;
  checkIn: Date | null;
  checkOut: Date | null;
}

/** Sums the correct per-night rate across a stay that may span both weekday and weekend nights. */
export function calculateRoomSubtotal({
  weekdayRate,
  weekendRate,
  checkIn,
  checkOut,
}: RoomSubtotalInput): number {
  if (!checkIn || !checkOut) return 0;
  let total = 0;
  const cursor = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const end = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  while (cursor < end) {
    total += isWeekendNight(cursor) ? weekendRate : weekdayRate;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

export interface RoomTotalInput {
  roomSubtotal: number;
  nights: number;
  breakfastAddonPerNight: number;
  addBreakfast: boolean;
}

export function calculateRoomTotal({
  roomSubtotal,
  nights,
  breakfastAddonPerNight,
  addBreakfast,
}: RoomTotalInput): number {
  if (nights <= 0) return 0;
  return roomSubtotal + (addBreakfast ? breakfastAddonPerNight * nights : 0);
}

export function nightsBetween(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const ms = checkOut.getTime() - checkIn.getTime();
  const nights = Math.round(ms / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
}

export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

/**
 * BUG HISTORY: an earlier single-screen layout let guests change party size
 * while a room was already selected, computing one `mealsAllowance` number
 * from shared form state and passing that same resolved value as a prop to
 * every room card — so changing party size while looking at one room
 * silently changed the amount shown on every other room too.
 *
 * Dates, party size, and room count are now captured once on Screen 1 and
 * locked (read-only) before Screen 2's room cards ever render. Because
 * `calculateMealsAllowance` never depends on which room is chosen, that one
 * number is correct for every card by construction — compute it once per
 * render and pass the same plain number everywhere. Do not add a per-room
 * override or let room selection feed back into this calculation.
 */
