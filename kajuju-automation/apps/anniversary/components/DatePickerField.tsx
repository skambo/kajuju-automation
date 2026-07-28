'use client';

import { useEffect, useRef, useState } from 'react';
import Calendar from './Calendar';

interface DatePickerFieldProps {
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  minDate: Date;
  maxDate: Date;
}

function formatShort(d: Date | null): string {
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export default function DatePickerField({
  checkIn,
  checkOut,
  onChange,
  minDate,
  maxDate,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleCalendarChange(nextIn: Date | null, nextOut: Date | null) {
    onChange(nextIn, nextOut);
    if (nextIn && nextOut) {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="rounded-md border border-barn-cardborder bg-white px-3 py-2.5 text-left font-sans-label hover:border-barn-green transition-colors"
        >
          <span className="block text-[0.68rem] uppercase tracking-wide text-gray-400">Check-in</span>
          <span className="block text-sm text-barn-ink">{formatShort(checkIn) || 'Select date'}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="rounded-md border border-barn-cardborder bg-white px-3 py-2.5 text-left font-sans-label hover:border-barn-green transition-colors"
        >
          <span className="block text-[0.68rem] uppercase tracking-wide text-gray-400">Check-out</span>
          <span className="block text-sm text-barn-ink">{formatShort(checkOut) || 'Select date'}</span>
        </button>
      </div>

      {open && (
        <div className="absolute z-30 mt-2 w-full sm:max-w-[420px]">
          <Calendar
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={handleCalendarChange}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      )}
    </div>
  );
}
