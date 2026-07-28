'use client';

import Header from './Header';
import TrustRow from './TrustRow';
import HeroImage from './HeroImage';
import InclusionsList from './InclusionsList';
import DatePickerField from './DatePickerField';
import PartySizeFields from './PartySizeFields';
import StepCTABar from './StepCTABar';
import Footer from './Footer';
import { STAY_BY_DATE } from '@/lib/availability';

interface Screen1StartProps {
  promoCode: string;
  checkIn: Date | null;
  checkOut: Date | null;
  onChangeDates: (checkIn: Date | null, checkOut: Date | null) => void;
  partySize: number;
  roomCount: number;
  onChangePartySize: (value: number) => void;
  onChangeRoomCount: (value: number) => void;
  onContinue: () => void;
}

export default function Screen1Start({
  promoCode,
  checkIn,
  checkOut,
  onChangeDates,
  partySize,
  roomCount,
  onChangePartySize,
  onChangeRoomCount,
  onContinue,
}: Screen1StartProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const canContinue = Boolean(checkIn && checkOut);

  return (
    <main className="min-h-screen">
      <Header />
      <TrustRow promoCode={promoCode} />
      <HeroImage />

      <div className="pb-24">
        <div className="max-w-[860px] mx-auto px-5 py-8 space-y-8">
          <section className="text-center max-w-[560px] mx-auto">
            <h1 className="font-serif text-2xl sm:text-3xl text-barn-ink mb-4">Welcome back.</h1>
            <p className="text-[0.95rem] text-gray-600 leading-relaxed">
              You helped make our first year special, and we&apos;d love to host you again.
            </p>
            <p className="text-[0.95rem] text-gray-600 leading-relaxed mt-2">
              As we celebrate our first anniversary, we&apos;ve put together something just for
              guests who stayed with us during our first year.
            </p>
          </section>

          <hr className="border-barn-cardborder" />

          <InclusionsList partySize={partySize} roomCount={roomCount} checkInDate={checkIn} />

          <hr className="border-barn-cardborder" />

          <section className="text-center max-w-[560px] mx-auto">
            <h2 className="font-serif text-xl text-barn-ink mb-3">Remember why you came?</h2>
            <p className="text-[0.95rem] text-gray-600 leading-relaxed">
              Slow mornings. Fresh mountain air. The fireplace. Good food. The views you remember.
            </p>
            <p className="text-[0.95rem] text-gray-600 leading-relaxed mt-2">
              We&apos;ve added a little something to welcome you back.
            </p>
          </section>

          <hr className="border-barn-cardborder" />

          <section className="space-y-4">
            <DatePickerField
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={onChangeDates}
              minDate={today}
              maxDate={STAY_BY_DATE}
            />
            <PartySizeFields
              partySize={partySize}
              roomCount={roomCount}
              onChangePartySize={onChangePartySize}
              onChangeRoomCount={onChangeRoomCount}
            />
          </section>
        </div>
        <Footer />
      </div>

      <StepCTABar
        label="See Available Rooms"
        subtext={canContinue ? undefined : 'Select your check-in and check-out dates first'}
        onClick={onContinue}
        disabled={!canContinue}
      />
    </main>
  );
}
