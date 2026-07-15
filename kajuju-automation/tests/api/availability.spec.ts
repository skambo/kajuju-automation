import { test, expect, APIRequestContext } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

// Channel-manager contract & integration tests, run against the Channex
// staging sandbox (https://staging.channex.io) — a free developer sandbox,
// not a live paid connection. See README "Channel Manager Testing" for why
// a sandbox is the deliberate choice here.
const CHANNEX_API = 'https://staging.channex.io/api/v1';
const PROPERTY_TITLE = 'Kajuju';

const headers = {
  'user-api-key': process.env.CHANNEX_API_KEY!,
  'Content-Type': 'application/json',
};

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function fetchAvailability(
  request: APIRequestContext,
  propertyId: string,
  from: string,
  to: string
) {
  const res = await request.get(`${CHANNEX_API}/availability`, {
    headers,
    params: {
      'filter[property_id]': propertyId,
      'filter[date][gte]': from,
      'filter[date][lte]': to,
    },
  });
  expect(res.ok(), `GET /availability failed: ${res.status()}`).toBeTruthy();
  return res.json();
}

// Availability updates are processed asynchronously (POST returns a queued
// "task", not the applied state) — poll until the read side converges
// instead of asserting immediately after the write.
async function pollAvailability(
  request: APIRequestContext,
  propertyId: string,
  roomTypeId: string,
  from: string,
  to: string,
  predicate: (nights: Record<string, number>) => boolean,
  attempts = 6,
  delayMs = 1500
): Promise<Record<string, number>> {
  let last: Record<string, number> | undefined;
  for (let i = 0; i < attempts; i++) {
    const body = await fetchAvailability(request, propertyId, from, to);
    last = body.data?.[roomTypeId];
    if (last && predicate(last)) return last;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(
    `Availability did not converge after ${attempts} polls. Last seen: ${JSON.stringify(last)}`
  );
}

// Same conflict rule as api/check-availability.js's hasConflict(): a stay
// consumes every night from check-in up to (not including) check-out, so
// back-to-back stays (one guest's checkout == next guest's check-in) are
// never flagged as a conflict.
function hasConflict(
  nightlyAvailability: Record<string, number>,
  checkIn: string,
  checkOut: string
): boolean {
  return Object.entries(nightlyAvailability).some(
    ([date, count]) => date >= checkIn && date < checkOut && count <= 0
  );
}

test.describe.configure({ mode: 'serial' });

test.describe('Channex Sandbox — Channel Manager Contract & Integration', () => {
  let propertyId: string;
  let roomTypeId: string;
  let ratePlanId: string;

  test.beforeAll(async ({ request }) => {
    if (!process.env.CHANNEX_API_KEY) {
      throw new Error('CHANNEX_API_KEY is not set — add it to .env (or CI secrets) before running this suite.');
    }

    const propsRes = await request.get(`${CHANNEX_API}/properties`, { headers });
    expect(propsRes.ok(), `GET /properties failed: ${propsRes.status()}`).toBeTruthy();
    const props = await propsRes.json();
    const property = props.data.find((p: any) => p.attributes.title === PROPERTY_TITLE);
    if (!property) {
      throw new Error(`No Channex sandbox property titled "${PROPERTY_TITLE}" found on this account.`);
    }
    propertyId = property.id;

    const roomTypesRes = await request.get(`${CHANNEX_API}/room_types`, {
      headers,
      params: { 'filter[property_id]': propertyId },
    });
    expect(roomTypesRes.ok(), `GET /room_types failed: ${roomTypesRes.status()}`).toBeTruthy();
    const roomTypes = await roomTypesRes.json();
    roomTypeId = roomTypes.data[0]?.id;
    if (!roomTypeId) throw new Error(`Property "${PROPERTY_TITLE}" has no room types configured in the sandbox.`);

    const ratePlansRes = await request.get(`${CHANNEX_API}/rate_plans`, {
      headers,
      params: { 'filter[property_id]': propertyId },
    });
    expect(ratePlansRes.ok(), `GET /rate_plans failed: ${ratePlansRes.status()}`).toBeTruthy();
    const ratePlans = await ratePlansRes.json();
    ratePlanId = ratePlans.data[0]?.id;
    if (!ratePlanId) throw new Error(`Property "${PROPERTY_TITLE}" has no rate plans configured in the sandbox.`);
  });

  test('sandbox property "Kajuju" is reachable and fully configured', async () => {
    expect(propertyId, 'property id').toBeTruthy();
    expect(roomTypeId, 'room type id').toBeTruthy();
    expect(ratePlanId, 'rate plan id').toBeTruthy();
  });

  test('can push rates and availability for a date range (ARI write)', async ({ request }) => {
    const from = futureDate(30);
    const to = futureDate(33);

    const ratePush = await request.post(`${CHANNEX_API}/restrictions`, {
      headers,
      data: { values: [{ property_id: propertyId, rate_plan_id: ratePlanId, date_from: from, date_to: to, rate: 15000 }] },
    });
    expect(ratePush.ok(), `POST /restrictions failed: ${ratePush.status()}`).toBeTruthy();
    const rateBody = await ratePush.json();
    expect(rateBody.meta?.message).toBe('Success');

    const availPush = await request.post(`${CHANNEX_API}/availability`, {
      headers,
      data: { values: [{ property_id: propertyId, room_type_id: roomTypeId, date_from: from, date_to: to, availability: 3 }] },
    });
    expect(availPush.ok(), `POST /availability failed: ${availPush.status()}`).toBeTruthy();
    const availBody = await availPush.json();
    expect(availBody.meta?.message).toBe('Success');
  });

  test('pushed availability is correctly read back by the API', async ({ request }) => {
    const from = futureDate(40);
    const to = futureDate(42);

    await request.post(`${CHANNEX_API}/availability`, {
      headers,
      data: { values: [{ property_id: propertyId, room_type_id: roomTypeId, date_from: from, date_to: to, availability: 5 }] },
    });

    const nights = await pollAvailability(request, propertyId, roomTypeId, from, to, (n) =>
      Object.values(n).every((count) => count === 5)
    );
    expect(Object.keys(nights).length).toBeGreaterThan(0);
  });

  test('a simulated sell-out is correctly flagged as unavailable by the double-booking-prevention logic', async ({ request }) => {
    const from = futureDate(50);
    const to = futureDate(52);

    // Simulate an external channel selling out this room for these nights —
    // exactly what a real double-booking looks like from the PMS side.
    await request.post(`${CHANNEX_API}/availability`, {
      headers,
      data: { values: [{ property_id: propertyId, room_type_id: roomTypeId, date_from: from, date_to: to, availability: 0 }] },
    });

    const nights = await pollAvailability(request, propertyId, roomTypeId, from, to, (n) =>
      Object.values(n).every((count) => count === 0)
    );

    expect(hasConflict(nights, from, to)).toBe(true);
  });

  test('a back-to-back request (checkout day re-opened) is not falsely flagged as a conflict', async ({ request }) => {
    const soldOutFrom = futureDate(60);
    const nextGuestCheckIn = futureDate(62); // == checkout day of the sold-out stay
    const nextGuestCheckOut = futureDate(64);

    await request.post(`${CHANNEX_API}/availability`, {
      headers,
      data: { values: [{ property_id: propertyId, room_type_id: roomTypeId, date_from: soldOutFrom, date_to: nextGuestCheckIn, availability: 0 }] },
    });
    // Checkout morning re-lets the room for the next guest's stay.
    await request.post(`${CHANNEX_API}/availability`, {
      headers,
      data: { values: [{ property_id: propertyId, room_type_id: roomTypeId, date_from: nextGuestCheckIn, date_to: nextGuestCheckOut, availability: 4 }] },
    });

    const nights = await pollAvailability(
      request,
      propertyId,
      roomTypeId,
      nextGuestCheckIn,
      nextGuestCheckOut,
      (n) => n[nextGuestCheckIn] === 4
    );

    expect(hasConflict(nights, nextGuestCheckIn, nextGuestCheckOut)).toBe(false);
  });
});
