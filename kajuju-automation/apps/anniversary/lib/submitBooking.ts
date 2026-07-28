export interface BookingSubmission {
  name: string;
  phone: string;
  email: string;
  partySize: number;
  roomCount: number;
  roomId: string;
  roomName: string;
  promoCode: string;
  checkIn: string;
  checkOut: string;
  addBreakfast: boolean;
  paymentOption: 'deposit' | 'full';
  roomTotal: number;
  mealsAllowance: number;
}

/**
 * Formspree endpoint ID. Swap this constant once real credentials arrive.
 */
export const FORMSPREE_FORM_ID = 'FORMSPREE_FORM_ID_PLACEHOLDER';

/**
 * Single isolated submit function. This is the only place that knows the
 * booking currently lands in Formspree rather than a real backend — replace
 * the body of this function to call a real API and nothing else needs to
 * change.
 */
export async function submitBooking(
  data: BookingSubmission
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return { ok: false, error: 'Submission failed. Please try again or WhatsApp us directly.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again or WhatsApp us directly.' };
  }
}
