'use client';

interface PartySizeFieldsProps {
  partySize: number;
  roomCount: number;
  onChangePartySize: (value: number) => void;
  onChangeRoomCount: (value: number) => void;
}

export default function PartySizeFields({
  partySize,
  roomCount,
  onChangePartySize,
  onChangeRoomCount,
}: PartySizeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[0.75rem] uppercase tracking-wide text-gray-500 font-sans-label mb-1">
          Party size
        </label>
        <select
          value={partySize}
          onChange={e => onChangePartySize(Number(e.target.value))}
          className="w-full rounded-md border border-barn-cardborder px-3 py-2 text-sm font-sans-label focus:outline-none focus:border-barn-green"
        >
          {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>
              {n} guest{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[0.75rem] uppercase tracking-wide text-gray-500 font-sans-label mb-1">
          Number of rooms
        </label>
        <select
          value={roomCount}
          onChange={e => onChangeRoomCount(Number(e.target.value))}
          className="w-full rounded-md border border-barn-cardborder px-3 py-2 text-sm font-sans-label focus:outline-none focus:border-barn-green"
        >
          {Array.from({ length: 4 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>
              {n} room{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
