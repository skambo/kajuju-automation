'use client';

import { useState } from 'react';
import Image from 'next/image';
import { RoomType, BREAKFAST_ADDON_PRICE } from '@/lib/rooms';
import { formatKES } from '@/lib/pricing';

interface RoomCardProps {
  room: RoomType;
  selected: boolean;
  mealsAllowance: number;
  mealsAllowanceBreakdown: string;
  roomTotal: number;
  nights: number;
  addBreakfast: boolean;
  priority: boolean;
  onSelect: (roomId: string) => void;
  onToggleBreakfast: (checked: boolean) => void;
}

export default function RoomCard({
  room,
  selected,
  mealsAllowance,
  mealsAllowanceBreakdown,
  roomTotal,
  nights,
  addBreakfast,
  priority,
  onSelect,
  onToggleBreakfast,
}: RoomCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={`rounded-[10px] bg-white p-5 border ${
        selected ? 'border-[1.5px] border-barn-green' : 'border-barn-cardborder'
      }`}
    >
      <div className="relative w-full h-40 rounded-md overflow-hidden mb-3 bg-gray-100">
        <Image
          src={room.image}
          alt={room.name}
          fill
          sizes="(max-width: 640px) 100vw, 420px"
          className="object-cover"
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
        />
      </div>

      <h3 className="text-base text-barn-ink mb-1">
        {room.name || 'Room'}
        {room.alias && (
          <span className="ml-2 text-[0.72rem] font-normal text-gray-400 font-sans-label">
            ({room.alias})
          </span>
        )}
      </h3>

      <p className="text-[0.87rem] text-gray-600 leading-relaxed mb-1">
        {room.shortDescription || room.description}
      </p>

      <button
        type="button"
        onClick={() => setDetailsOpen(o => !o)}
        aria-expanded={detailsOpen}
        className="text-[0.78rem] text-barn-green font-sans-label mb-2 underline decoration-dotted underline-offset-2"
      >
        {detailsOpen ? 'Hide details' : 'More details'}
      </button>

      {detailsOpen && (
        <p className="text-[0.85rem] text-gray-600 leading-relaxed mb-3 border-l-2 border-barn-cardborder pl-3">
          {room.description}
        </p>
      )}

      <p className="text-lg font-bold text-barn-green mb-3">{formatKES(roomTotal)}</p>

      <div className="mb-3">
        <p className="text-[0.68rem] uppercase tracking-wide text-gray-400 font-sans-label mb-1.5">
          Included with your stay
        </p>
        <ul className="space-y-1 text-[0.85rem] text-barn-ink font-sans-label">
          <li className="flex gap-2">
            <span className="text-barn-accentdark font-bold">&#10003;</span>
            <span>
              {room.breakfast_included
                ? 'Breakfast'
                : 'Self-catering — fully equipped kitchen, no meals included'}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-barn-accentdark font-bold">&#10003;</span>
            <span>
              We&apos;ve set aside {formatKES(mealsAllowance)} towards your meals &amp; drinks
              {mealsAllowanceBreakdown && (
                <span className="text-gray-400"> ({mealsAllowanceBreakdown})</span>
              )}
            </span>
          </li>
        </ul>
      </div>

      {!room.breakfast_included && (
        <label className="flex items-center gap-2 text-[0.85rem] text-gray-700 mb-3 font-sans-label cursor-pointer">
          <input
            type="checkbox"
            checked={addBreakfast}
            onChange={e => onToggleBreakfast(e.target.checked)}
            disabled={!selected}
            className="h-4 w-4 accent-[#2d5a27]"
          />
          + Add breakfast ({formatKES(BREAKFAST_ADDON_PRICE)}/day)
        </label>
      )}

      <button
        type="button"
        onClick={() => onSelect(room.id)}
        className={`w-full rounded-full py-2 text-sm font-bold font-sans-label transition-colors ${
          selected
            ? 'bg-barn-green text-white'
            : 'bg-white text-barn-green border-[1.5px] border-barn-green hover:bg-barn-greenlight'
        }`}
      >
        {selected ? 'Selected' : 'Choose Room'}
      </button>
    </div>
  );
}
