'use client';

import Header from './Header';
import SummaryStrip from './SummaryStrip';
import BookingForm, { ContactFormValues } from './BookingForm';
import PriceSummary from './PriceSummary';
import PaymentStep from './PaymentStep';
import StepCTABar from './StepCTABar';
import Footer from './Footer';
import { RoomType, BREAKFAST_ADDON_PRICE } from '@/lib/rooms';
import { nightsBetween, calculateRoomSubtotal, calculateRoomTotal, formatKES } from '@/lib/pricing';

interface Screen3PayProps {
  checkIn: Date | null;
  checkOut: Date | null;
  partySize: number;
  roomCount: number;
  selectedRoom: RoomType | null;
  addBreakfast: boolean;
  mealsAllowance: number;
  contact: ContactFormValues;
  onChangeContact: (values: ContactFormValues) => void;
  touched: { phone: boolean; email: boolean };
  onBlurField: (field: 'phone' | 'email') => void;
  paymentOption: 'deposit' | 'full';
  onChangePaymentOption: (option: 'deposit' | 'full') => void;
  submitting: boolean;
  submitted: boolean;
  submitError: string | null;
  onEditStart: () => void;
  onEditRoom: () => void;
  onSubmit: () => void;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Screen3Pay({
  checkIn,
  checkOut,
  partySize,
  roomCount,
  selectedRoom,
  addBreakfast,
  mealsAllowance,
  contact,
  onChangeContact,
  touched,
  onBlurField,
  paymentOption,
  onChangePaymentOption,
  submitting,
  submitted,
  submitError,
  onEditStart,
  onEditRoom,
  onSubmit,
}: Screen3PayProps) {
  const nights = nightsBetween(checkIn, checkOut);
  const effectiveAddBreakfast = Boolean(selectedRoom && !selectedRoom.breakfast_included && addBreakfast);
  const roomSubtotal = selectedRoom
    ? calculateRoomSubtotal({
        weekdayRate: selectedRoom.weekdayRate,
        weekendRate: selectedRoom.weekendRate,
        checkIn,
        checkOut,
      })
    : 0;
  const roomTotal = calculateRoomTotal({
    roomSubtotal,
    nights,
    breakfastAddonPerNight: BREAKFAST_ADDON_PRICE,
    addBreakfast: effectiveAddBreakfast,
  });
  const dueNow = paymentOption === 'deposit' ? Math.round(roomTotal / 2) : roomTotal;

  const dateLabel =
    checkIn && checkOut ? `${formatShort(checkIn)} – ${formatShort(checkOut)}` : 'Dates not set';
  const partyLabel = `${partySize} guest${partySize > 1 ? 's' : ''} · ${roomCount} room${
    roomCount > 1 ? 's' : ''
  }`;

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pb-24">
        <div className="max-w-[860px] mx-auto px-5 py-8 space-y-6">
          <div>
            <button
              type="button"
              onClick={onEditRoom}
              className="text-[0.8rem] text-barn-green font-sans-label mb-3 hover:underline"
            >
              &larr; Back
            </button>
            <p className="text-[0.72rem] uppercase tracking-[1.5px] text-gray-400 font-sans-label mb-1">
              Step 3 of 3
            </p>
            <h2 className="font-serif text-xl text-barn-ink mb-3">Confirm &amp; Pay</h2>
            <SummaryStrip
              items={[
                { label: dateLabel, onEdit: onEditStart },
                { label: partyLabel, onEdit: onEditStart },
                { label: selectedRoom?.name ?? 'No room selected', onEdit: onEditRoom },
              ]}
            />
          </div>

          <BookingForm
            values={contact}
            onChange={onChangeContact}
            touched={touched}
            onBlurField={onBlurField}
          />

          <PriceSummary
            roomName={selectedRoom?.name ?? ''}
            nights={nights}
            roomSubtotal={roomSubtotal}
            addBreakfast={effectiveAddBreakfast}
            breakfastAddonPerNight={BREAKFAST_ADDON_PRICE}
            roomTotal={roomTotal}
            mealsAllowance={mealsAllowance}
            breakfastIncluded={Boolean(selectedRoom?.breakfast_included)}
          />

          <PaymentStep
            paymentOption={paymentOption}
            onChangeOption={onChangePaymentOption}
            submitted={submitted}
            submitError={submitError}
          />
        </div>
        <Footer />
      </div>

      {!submitted && (
        <StepCTABar
          label="Complete Booking"
          subtext={selectedRoom ? `${selectedRoom.name} · ${formatKES(dueNow)} due now` : undefined}
          onClick={onSubmit}
          loading={submitting}
          variant="accent"
        />
      )}
    </main>
  );
}
