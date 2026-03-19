import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const SMOOBU_API = 'https://login.smoobu.com/api';
const headers = {
  'Api-Key': process.env.SMOOBU_API_KEY!,
  'Content-Type': 'application/json'
};

const ROOMS: Record<string, number> = {
  'Coral Room': 3205850,
  'Jade Room': 3205845,
  'Pebble Room': 3205855,
  'Penthouse Loft': 3205835,
  'The Cottage': 3205840
};

test.describe('Smoobu API — Availability Checks', () => {

  test('can fetch all reservations', async ({ request }) => {
    const response = await request.get(`${SMOOBU_API}/reservations`, {
      headers,
      params: { pageSize: 50 }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.bookings).toBeDefined();
    console.log(`Total reservations: ${data.total_items}`);
    console.log('Bookings:', JSON.stringify(data.bookings.map((b: any) => ({
      id: b.id,
      room: b.apartment.name,
      arrival: b.arrival,
      departure: b.departure,
      channel: b.channel.name,
      type: b.type,
      guest: b['guest-name']
    })), null, 2));
  });

  test('blocked dates exist for each room', async ({ request }) => {
    const response = await request.get(`${SMOOBU_API}/reservations`, {
      headers,
      params: { pageSize: 100 }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();

    for (const [roomName, roomId] of Object.entries(ROOMS)) {
      const roomBookings = data.bookings.filter((b: any) => b.apartment.id === roomId);
      console.log(`\n${roomName}: ${roomBookings.length} reservations`);
      roomBookings.forEach((b: any) => {
        console.log(`  ${b.arrival} → ${b.departure} (${b.channel.name})`);
      });
    }
    expect(data.bookings.length).toBeGreaterThan(0);
  });

  test('no overlapping bookings for same room', async ({ request }) => {
    const response = await request.get(`${SMOOBU_API}/reservations`, {
      headers,
      params: { pageSize: 100 }
    });
    const data = await response.json();

    // Collect ALL overlaps across all rooms before failing
    const allOverlaps: string[] = [];

    for (const [roomName, roomId] of Object.entries(ROOMS)) {
      const roomBookings = data.bookings
        .filter((b: any) => b.apartment.id === roomId)
        .filter((b: any) => b.channel.name !== 'Blocked channel') // exclude manual blocks
        .filter((b: any) => b.type !== 0)                         // exclude cancelled bookings
        .sort((a: any, b: any) => a.arrival.localeCompare(b.arrival));

      for (let i = 0; i < roomBookings.length - 1; i++) {
        const current = roomBookings[i];
        const next = roomBookings[i + 1];

        // Compare date strings directly (YYYY-MM-DD) — avoids UTC midnight
        // timezone false positives from using new Date().
        // Back-to-back is fine: checkout March 14, checkin March 14 = NOT an overlap.
        // Only flag when departure is strictly AFTER next arrival.
        const overlap = current.departure > next.arrival;

        if (overlap) {
          const msg = `⚠️ OVERLAP in ${roomName}: booking #${current.id} (${current.arrival}→${current.departure}) overlaps booking #${next.id} (${next.arrival}→${next.departure}) — guests: "${current['guest-name']}" and "${next['guest-name']}"`;
          console.log(msg);
          allOverlaps.push(msg);
        } else {
          console.log(`✅ ${roomName}: #${current.id} (departs ${current.departure}) → #${next.id} (arrives ${next.arrival}) — OK`);
        }
      }
    }

    if (allOverlaps.length > 0) {
      // Fail once with a full summary — one clear error, not multiple
      throw new Error(
        `${allOverlaps.length} overlap(s) detected:\n\n${allOverlaps.join('\n')}\n\nCheck calendar: https://login.smoobu.com/en/calendar`
      );
    }

    console.log('\n✅ No overlapping bookings found across all rooms');
  });

});
