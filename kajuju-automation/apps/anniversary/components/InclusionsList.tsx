import {
  ANNIVERSARY_MEALS_BASE_STANDARD,
  ANNIVERSARY_MEALS_BASE_GROUP,
  WEEKDAY_TOPUP,
  formatKES,
} from '@/lib/pricing';

interface InclusionsListProps {
  partySize: number;
  roomCount: number;
  checkInDate: Date | null;
}

/**
 * Plain checklist, not a badge — the line that currently applies (given
 * party size / room count, and check-in day once picked) is bolded so it
 * reads as live, not just informational. No background/border color: the
 * only accent-colored elements on this screen are these checkmarks and the
 * primary CTA.
 */
export default function InclusionsList({ partySize, roomCount, checkInDate }: InclusionsListProps) {
  const isGroup = roomCount >= 2 || partySize >= 3;
  const hasTopup = Boolean(checkInDate && checkInDate.getDay() >= 0 && checkInDate.getDay() <= 4);

  return (
    <div className="font-sans-label">
      <h2 className="font-serif text-xl text-barn-ink mb-3">Included with your stay</h2>
      <ul className="space-y-2 text-[0.9rem] text-barn-ink leading-relaxed">
        <li className="flex gap-2">
          <span className="text-barn-accentdark font-bold">&#10003;</span>
          <span>Breakfast</span>
        </li>
        <li className={`flex gap-2 ${!isGroup ? 'font-bold' : ''}`}>
          <span className="text-barn-accentdark font-bold">&#10003;</span>
          <span>
            We&apos;ve set aside {formatKES(ANNIVERSARY_MEALS_BASE_STANDARD)} towards your meals
            &amp; drinks during your stay
          </span>
        </li>
        <li className={`flex gap-2 ${isGroup ? 'font-bold' : ''}`}>
          <span className="text-barn-accentdark font-bold">&#10003;</span>
          <span>Families &amp; groups of 4+ enjoy {formatKES(ANNIVERSARY_MEALS_BASE_GROUP)} instead</span>
        </li>
        <li className={`flex gap-2 ${hasTopup ? 'font-bold' : ''}`}>
          <span className="text-barn-accentdark font-bold">&#10003;</span>
          <span>Sunday&ndash;Thursday arrivals receive an additional {formatKES(WEEKDAY_TOPUP)}</span>
        </li>
      </ul>
    </div>
  );
}
