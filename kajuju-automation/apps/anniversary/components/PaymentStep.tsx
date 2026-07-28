'use client';

interface PaymentStepProps {
  paymentOption: 'deposit' | 'full';
  onChangeOption: (option: 'deposit' | 'full') => void;
  submitted: boolean;
  submitError: string | null;
}

export default function PaymentStep({
  paymentOption,
  onChangeOption,
  submitted,
  submitError,
}: PaymentStepProps) {
  if (submitted) {
    return (
      <div className="rounded-[10px] border border-barn-green bg-barn-greenlight p-5 text-center">
        <p className="text-barn-green font-bold font-sans-label">
          Thank you! Your request has been sent.
        </p>
        <p className="text-[0.85rem] text-barn-greenmid font-sans-label mt-1">
          We&apos;ll confirm your booking details by phone or email shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-barn-cardborder bg-white p-5">
      <p className="text-[0.72rem] uppercase tracking-wide text-gray-400 font-sans-label mb-3 border-b border-gray-100 pb-2">
        Payment
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={() => onChangeOption('deposit')}
          className={`rounded-md border px-3 py-3 text-left font-sans-label transition-colors ${
            paymentOption === 'deposit'
              ? 'border-[1.5px] border-barn-green bg-barn-greenlight'
              : 'border-barn-cardborder hover:bg-gray-50'
          }`}
        >
          <span className="block text-sm font-bold text-barn-ink">Pay 50% deposit now</span>
          <span className="block text-[0.75rem] text-gray-500 mt-0.5">Balance due on arrival</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeOption('full')}
          className={`rounded-md border px-3 py-3 text-left font-sans-label transition-colors ${
            paymentOption === 'full'
              ? 'border-[1.5px] border-barn-green bg-barn-greenlight'
              : 'border-barn-cardborder hover:bg-gray-50'
          }`}
        >
          <span className="block text-sm font-bold text-barn-ink">Pay in full</span>
          <span className="block text-[0.75rem] text-gray-500 mt-0.5">Settle everything now</span>
        </button>
      </div>

      {submitError && (
        <p className="text-[0.8rem] text-red-600 font-sans-label mb-1">{submitError}</p>
      )}

      <p className="text-[0.7rem] text-gray-400 font-sans-label text-center">
        Payment is a placeholder for now &mdash; tapping Complete Booking below sends your request
        to our team.
      </p>
    </div>
  );
}
