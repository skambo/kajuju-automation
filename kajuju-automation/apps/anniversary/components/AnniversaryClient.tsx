'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Screen1Start from './Screen1Start';
import Screen2Rooms from './Screen2Rooms';
import Screen3Pay from './Screen3Pay';
import { ContactFormValues } from './BookingForm';
import { ROOM_TYPES, BREAKFAST_ADDON_PRICE } from '@/lib/rooms';
import {
  calculateMealsAllowance,
  describeMealsAllowanceBreakdown,
  calculateRoomSubtotal,
  calculateRoomTotal,
  nightsBetween,
} from '@/lib/pricing';
import { isStayStillAvailable } from '@/lib/availability';
import { submitBooking } from '@/lib/submitBooking';

type Step = 'start' | 'rooms' | 'pay';
const STEPS: Step[] = ['start', 'rooms', 'pay'];

const DEFAULT_CONTACT: ContactFormValues = {
  name: '',
  phone: '',
  email: '',
  promoCode: '',
};

export default function AnniversaryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawStep = searchParams.get('step');
  const step: Step = STEPS.includes(rawStep as Step) ? (rawStep as Step) : 'start';

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [roomCount, setRoomCount] = useState(1);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [addBreakfast, setAddBreakfast] = useState(false);

  const [contact, setContact] = useState<ContactFormValues>(DEFAULT_CONTACT);
  const [touched, setTouched] = useState({ phone: false, email: false });
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('deposit');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const codeFromUrl = searchParams.get('c');
    if (codeFromUrl) {
      setContact(c => ({ ...c, promoCode: codeFromUrl }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToStep(next: Step, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', next);
    const url = `${pathname}?${params.toString()}`;
    if (replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // Dates + party size are captured once on Screen 1 and locked from then on.
  // A guest can't reach Screen 2 without dates, or Screen 3 without a room —
  // correct any URL edited directly to skip ahead of what's actually set.
  useEffect(() => {
    const hasDates = Boolean(checkIn && checkOut);
    if (step === 'rooms' && !hasDates) {
      goToStep('start', true);
    } else if (step === 'pay' && !selectedRoomId) {
      goToStep(hasDates ? 'rooms' : 'start', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, checkIn, checkOut, selectedRoomId]);

  const selectedRoom = ROOM_TYPES.find(r => r.id === selectedRoomId) ?? null;
  const nights = nightsBetween(checkIn, checkOut);

  // See BUG HISTORY in lib/pricing.ts: this number never depends on which
  // room is selected, so it's computed once here and passed identically to
  // every room card and the price summary — never per-card state.
  const mealsAllowance = calculateMealsAllowance({ roomCount, partySize, checkInDate: checkIn });
  const mealsAllowanceBreakdown = describeMealsAllowanceBreakdown({
    roomCount,
    partySize,
    checkInDate: checkIn,
  });

  const effectiveAddBreakfast = Boolean(
    selectedRoom && !selectedRoom.breakfast_included && addBreakfast
  );
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

  function handleSelectRoom(roomId: string) {
    setSelectedRoomId(roomId);
    const room = ROOM_TYPES.find(r => r.id === roomId);
    if (room?.breakfast_included) {
      setAddBreakfast(false);
    }
  }

  function validate(): string | null {
    if (!contact.name.trim()) return 'Please enter your name.';
    if (!selectedRoom) return 'Please select a room.';
    if (!checkIn || !checkOut) return 'Please select your check-in and check-out dates.';
    // No inventory hold exists between Screen 1 and payment (channel sync is
    // delayed), so availability is only ever confirmed here, right before pay.
    if (!isStayStillAvailable(checkIn, checkOut)) {
      return 'Sorry, one of your selected dates was just booked by someone else. Please go back and pick different dates.';
    }
    return null;
  }

  async function handleSubmit() {
    setTouched({ phone: true, email: true });
    const error = validate();
    if (error) {
      setSubmitError(error);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    const result = await submitBooking({
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      email: contact.email.trim(),
      partySize,
      roomCount,
      roomId: selectedRoom!.id,
      roomName: selectedRoom!.name,
      promoCode: contact.promoCode.trim(),
      checkIn: checkIn!.toISOString(),
      checkOut: checkOut!.toISOString(),
      addBreakfast: effectiveAddBreakfast,
      paymentOption,
      roomTotal,
      mealsAllowance,
    });
    setSubmitting(false);
    if (result.ok) {
      setSubmitted(true);
    } else {
      setSubmitError(result.error ?? 'Something went wrong. Please try again.');
    }
  }

  if (step === 'rooms') {
    return (
      <Screen2Rooms
        checkIn={checkIn}
        checkOut={checkOut}
        partySize={partySize}
        roomCount={roomCount}
        mealsAllowance={mealsAllowance}
        mealsAllowanceBreakdown={mealsAllowanceBreakdown}
        selectedRoomId={selectedRoomId}
        addBreakfast={addBreakfast}
        onSelectRoom={handleSelectRoom}
        onToggleBreakfast={setAddBreakfast}
        onEditStart={() => goToStep('start')}
        onContinue={() => goToStep('pay')}
      />
    );
  }

  if (step === 'pay') {
    return (
      <Screen3Pay
        checkIn={checkIn}
        checkOut={checkOut}
        partySize={partySize}
        roomCount={roomCount}
        selectedRoom={selectedRoom}
        addBreakfast={addBreakfast}
        mealsAllowance={mealsAllowance}
        contact={contact}
        onChangeContact={setContact}
        touched={touched}
        onBlurField={field => setTouched(t => ({ ...t, [field]: true }))}
        paymentOption={paymentOption}
        onChangePaymentOption={setPaymentOption}
        submitting={submitting}
        submitted={submitted}
        submitError={submitError}
        onEditStart={() => goToStep('start')}
        onEditRoom={() => goToStep('rooms')}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Screen1Start
      promoCode={contact.promoCode}
      checkIn={checkIn}
      checkOut={checkOut}
      onChangeDates={(inDate, outDate) => {
        setCheckIn(inDate);
        setCheckOut(outDate);
      }}
      partySize={partySize}
      roomCount={roomCount}
      onChangePartySize={setPartySize}
      onChangeRoomCount={setRoomCount}
      onContinue={() => goToStep('rooms')}
    />
  );
}
