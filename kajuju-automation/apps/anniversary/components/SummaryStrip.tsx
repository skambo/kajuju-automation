'use client';

interface SummaryStripItem {
  label: string;
  onEdit: () => void;
}

interface SummaryStripProps {
  items: SummaryStripItem[];
}

/**
 * Collapsed recap of answers from earlier screens. Editing an earlier
 * answer navigates back via step query param — it never clears state for
 * later screens, since all screen state lives in the single
 * AnniversaryClient instance that stays mounted across steps.
 */
export default function SummaryStrip({ items }: SummaryStripProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-gray-50 border border-barn-cardborder px-4 py-2.5 mb-5 text-[0.8rem] font-sans-label text-gray-600">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-gray-300">&middot;</span>}
          <span>{item.label}</span>
          <button
            type="button"
            onClick={item.onEdit}
            className="text-barn-green underline decoration-dotted underline-offset-2 text-[0.75rem]"
          >
            Edit
          </button>
        </span>
      ))}
    </div>
  );
}
