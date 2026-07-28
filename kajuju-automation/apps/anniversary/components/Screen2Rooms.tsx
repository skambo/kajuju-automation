'use client';

import Header from './Header';
import RoomCard from './RoomCard';
import SummaryStrip from './SummaryStrip';
import StepCTABar from './StepCTABar';
import { ROOM_TYPES, BREAKFAST_ADDON_PRICE } from '@/lib/rooms';
import { calculateRoomSubtotal, calculateRoomTotal, nightsBetween } from '@/lib/pricing';

interface Screen2RoomsProps {
  checkIn: Date | null;
  checkOut: Date | null;
  partySize: number;
  roomCount: number;
  mealsAllowance: number;
  mealsAllowanceBreakdown: string;
  selectedRoomId: string | null;
  addBreakfast: boolean;
  onSelectRoom: (roomId: string) => void;
  onToggleBreakfast: (checked: boolean) => void;
  onEditStart: () => void;
  onContinue: () => void;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Screen2Rooms({
  checkIn,
  checkOut,
  partySize,
  roomCount,
  mealsAllowance,
  mealsAllowanceBreakdown,
  selectedRoomId,
  addBreakfast,
  onSelectRoom,
  onToggleBreakfast,
  onEditStart,
  onContinue,
}: Screen2RoomsProps) {
  const selectedRoom = ROOM_TYPES.find(r => r.id === selectedRoomId) ?? null;
  const nights = nightsBetween(checkIn, checkOut);
  const dateLabel =
    checkIn && checkOut ? `${formatShort(checkIn)} – ${formatShort(checkOut)}` : 'Dates not set';
  const partyLabel = `${partySize} guest${partySize > 1 ? 's' : ''} · ${roomCount} room${
    roomCount > 1 ? 's' : ''
  }`;

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pb-24">
        <div className="max-w-[860px] mx-auto px-5 py-8">
          <button
            type="button"
            onClick={onEditStart}
            className="text-[0.8rem] text-barn-green font-sans-label mb-3 hover:underline"
          >
            &larr; Back
          </button>
          <p className="text-[0.72rem] uppercase tracking-[1.5px] text-gray-400 font-sans-label mb-1">
            Step 2 of 3
          </p>
          <h2 className="font-serif text-xl text-barn-ink mb-3">Choose Your Stay</h2>
          <SummaryStrip
            items={[
              { label: dateLabel, onEdit: onEditStart },
              { label: partyLabel, onEdit: onEditStart },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROOM_TYPES.map((room, index) => {
              const cardAddBreakfast = selectedRoomId === room.id ? addBreakfast : false;
              const roomSubtotal = calculateRoomSubtotal({
                weekdayRate: room.weekdayRate,
                weekendRate: room.weekendRate,
                checkIn,
                checkOut,
              });
              const roomTotal = calculateRoomTotal({
                roomSubtotal,
                nights,
                breakfastAddonPerNight: BREAKFAST_ADDON_PRICE,
                addBreakfast: cardAddBreakfast && !room.breakfast_included,
              });
              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  selected={selectedRoomId === room.id}
                  mealsAllowance={mealsAllowance}
                  mealsAllowanceBreakdown={mealsAllowanceBreakdown}
                  roomTotal={roomTotal}
                  nights={nights}
                  addBreakfast={cardAddBreakfast}
                  priority={index === 0}
                  onSelect={onSelectRoom}
                  onToggleBreakfast={onToggleBreakfast}
                />
              );
            })}
          </div>
        </div>
      </div>

      <StepCTABar
        label={selectedRoom ? `Continue with ${selectedRoom.name}` : 'Select a room to continue'}
        onClick={onContinue}
        disabled={!selectedRoom}
      />
    </main>
  );
}
