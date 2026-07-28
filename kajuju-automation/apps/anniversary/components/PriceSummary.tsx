import { formatKES } from '@/lib/pricing';

interface PriceSummaryProps {
  roomName: string;
  nights: number;
  roomSubtotal: number;
  addBreakfast: boolean;
  breakfastAddonPerNight: number;
  roomTotal: number;
  mealsAllowance: number;
  breakfastIncluded: boolean;
}

export default function PriceSummary({
  roomName,
  nights,
  roomSubtotal,
  addBreakfast,
  breakfastAddonPerNight,
  roomTotal,
  mealsAllowance,
  breakfastIncluded,
}: PriceSummaryProps) {
  const displayRoomName = roomName || 'Select a room';

  return (
    <div className="rounded-[10px] border border-barn-cardborder bg-white p-5">
      <p className="text-[0.72rem] uppercase tracking-wide text-gray-400 font-sans-label mb-3 border-b border-gray-100 pb-2">
        Price summary
      </p>

      {nights > 0 ? (
        <div className="space-y-2 text-[0.87rem] font-sans-label">
          <div className="flex justify-between text-gray-700">
            <span>
              {displayRoomName} &times; {nights} night{nights > 1 ? 's' : ''}
            </span>
            <span>{formatKES(roomSubtotal)}</span>
          </div>
          {addBreakfast && (
            <div className="flex justify-between text-gray-700">
              <span>Breakfast add-on &times; {nights} night{nights > 1 ? 's' : ''}</span>
              <span>{formatKES(breakfastAddonPerNight * nights)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-barn-ink pt-2 border-t border-gray-100">
            <span>Total Room Price</span>
            <span>{formatKES(roomTotal)}</span>
          </div>
        </div>
      ) : (
        <p className="text-[0.85rem] text-gray-400 font-sans-label">
          Select a room and your dates to see pricing.
        </p>
      )}

      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-[0.72rem] uppercase tracking-wide text-gray-400 font-sans-label mb-2">
          Included with your stay
        </p>
        <ul className="space-y-1 text-[0.85rem] text-barn-ink font-sans-label">
          {breakfastIncluded && <li>Breakfast</li>}
          <li>We&apos;ve set aside {formatKES(mealsAllowance)} towards your meals &amp; drinks.</li>
        </ul>
        <p className="text-[0.72rem] text-gray-400 font-sans-label mt-2">
          This is separate from your room total above.
        </p>
      </div>
    </div>
  );
}
