'use client';

import { useMemo, useState } from 'react';
import { isDateUnavailable } from '@/lib/availability';
import { WEEKDAY_TOPUP, isWeekdayCheckIn } from '@/lib/pricing';

interface CalendarProps {
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  minDate: Date;
  maxDate: Date;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isBetween(d: Date, a: Date, b: Date): boolean {
  const t = startOfDay(d).getTime();
  return t > startOfDay(a).getTime() && t < startOfDay(b).getTime();
}

function hasUnavailableBetween(a: Date, b: Date): boolean {
  const cursor = new Date(a);
  cursor.setDate(cursor.getDate() + 1);
  while (startOfDay(cursor).getTime() < startOfDay(b).getTime()) {
    if (isDateUnavailable(cursor)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

export default function Calendar({
  checkIn,
  checkOut,
  onChange,
  minDate,
  maxDate,
}: CalendarProps) {
  const [viewMonth, setViewMonth] = useState<Date>(
    new Date((checkIn ?? minDate).getFullYear(), (checkIn ?? minDate).getMonth(), 1)
  );
  const [rangeError, setRangeError] = useState<string | null>(null);

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
  const leadingBlanks = monthStart.getDay();

  const days = useMemo(() => {
    const list: Date[] = [];
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      list.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    return list;
  }, [viewMonth, monthEnd]);

  const canGoPrev =
    new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 0) >= startOfDay(minDate);
  const canGoNext =
    new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1) <= startOfDay(maxDate);

  function handlePick(day: Date) {
    setRangeError(null);
    if (!checkIn || (checkIn && checkOut)) {
      onChange(day, null);
      return;
    }
    // checkIn set, checkOut not yet set
    if (startOfDay(day).getTime() <= startOfDay(checkIn).getTime()) {
      onChange(day, null);
      return;
    }
    if (hasUnavailableBetween(checkIn, day)) {
      setRangeError('That range crosses a date that is already booked. Pick a shorter range or different dates.');
      return;
    }
    onChange(checkIn, day);
  }

  return (
    <div className="rounded-[10px] border border-barn-cardborder bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoPrev}
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="px-2 py-1 rounded text-barn-green disabled:opacity-30 disabled:cursor-not-allowed font-sans-label text-sm"
        >
          &larr;
        </button>
        <p className="font-serif text-sm text-barn-ink">
          {viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoNext}
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="px-2 py-1 rounded text-barn-green disabled:opacity-30 disabled:cursor-not-allowed font-sans-label text-sm"
        >
          &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1 font-sans-label">
        {WEEKDAY_LABELS.map(w => (
          <div key={w} className="text-center text-[0.65rem] uppercase tracking-wide text-gray-400 py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map(day => {
          const disabled =
            startOfDay(day) < startOfDay(minDate) ||
            startOfDay(day) > startOfDay(maxDate) ||
            isDateUnavailable(day);
          const isCheckIn = sameDay(day, checkIn);
          const isCheckOut = sameDay(day, checkOut);
          const inRange = checkIn && checkOut && isBetween(day, checkIn, checkOut);
          const showWeekdayBadge = !disabled && isWeekdayCheckIn(day);

          const base =
            'relative flex flex-col items-center justify-center rounded-md h-12 sm:h-14 text-xs font-sans-label transition-colors';
          const state = disabled
            ? 'text-gray-300 cursor-not-allowed line-through'
            : isCheckIn || isCheckOut
            ? 'bg-barn-green text-white cursor-pointer'
            : inRange
            ? 'bg-barn-greenlight text-barn-green cursor-pointer'
            : 'hover:bg-barn-greenlight text-barn-ink cursor-pointer';

          return (
            <button
              type="button"
              key={day.toISOString()}
              disabled={disabled}
              onClick={() => handlePick(day)}
              aria-label={
                disabled
                  ? `${day.toDateString()}, unavailable`
                  : showWeekdayBadge
                  ? `${day.toDateString()}, additional KES ${WEEKDAY_TOPUP} set aside for meals & drinks`
                  : day.toDateString()
              }
              className={`${base} ${state}`}
            >
              <span className="leading-none">{day.getDate()}</span>
              {showWeekdayBadge && (
                <span
                  className={`mt-0.5 leading-none text-[0.55rem] font-bold ${
                    isCheckIn || isCheckOut ? 'text-white' : 'text-barn-greenmid'
                  }`}
                >
                  +KES{WEEKDAY_TOPUP}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[0.72rem] text-gray-500 font-sans-label leading-relaxed">
        <span className="font-bold text-barn-greenmid">Sun&ndash;Thu</span> check-ins have an
        additional KES {WEEKDAY_TOPUP} set aside for meals &amp; drinks. Greyed-out dates are already booked.
      </p>

      {rangeError && (
        <p className="mt-2 text-[0.78rem] text-red-600 font-sans-label">{rangeError}</p>
      )}

      <div className="mt-3 flex gap-4 text-[0.75rem] font-sans-label text-gray-600">
        <span>
          <strong className="text-barn-ink">Check-in:</strong>{' '}
          {checkIn ? checkIn.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select a date'}
        </span>
        <span>
          <strong className="text-barn-ink">Check-out:</strong>{' '}
          {checkOut ? checkOut.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select a date'}
        </span>
      </div>
    </div>
  );
}
