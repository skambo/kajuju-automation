'use client';

interface StepCTABarProps {
  label: string;
  subtext?: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  /**
   * The gold accent is scoped to the Screen 1 inclusions checklist and the
   * final "Complete Booking" button only (see tailwind.config.js). Screens 1-2 use the standard
   * brand green so the page keeps reading as the same property throughout.
   */
  variant?: 'accent' | 'primary';
}

/**
 * Fixed-position bar so each screen's one primary action stays reachable
 * without scrolling, regardless of how much content the screen holds above
 * it (hero copy, room cards, forms, etc.).
 */
export default function StepCTABar({
  label,
  subtext,
  onClick,
  disabled,
  loading,
  variant = 'primary',
}: StepCTABarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-barn-cardborder shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="max-w-[860px] mx-auto px-5 py-3 flex items-center justify-between gap-3">
        {subtext ? (
          <p className="text-[0.7rem] text-gray-400 font-sans-label truncate">{subtext}</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || loading}
          className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-bold font-sans-label text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 ${
            variant === 'accent' ? 'bg-barn-accentdark' : 'bg-barn-green'
          }`}
        >
          {loading ? 'Sending...' : label}
        </button>
      </div>
    </div>
  );
}
