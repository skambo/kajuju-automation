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

    for (const [roomName, roomId] of Object.entries(ROOMS)) {
      const roomBookings = data.bookings
        .filter((b: any) => b.apartment.id === roomId)
        .sort((a: any, b: any) => a.arrival.localeCompare(b.arrival));

      for (let i = 0; i < roomBookings.length - 1; i++) {
        const current = roomBookings[i];
        const next = roomBookings[i + 1];
        const currentDeparts = new Date(current.departure);
        const nextArrives = new Date(next.arrival);
        const overlap = currentDeparts > nextArrives;
        if (overlap) {
          console.log(`⚠️ OVERLAP in ${roomName}: ${current.arrival}-${current.departure} overlaps ${next.arrival}-${next.departure}`);
        }
        expect(overlap).toBeFalsy();
      }
    }
    console.log('✅ No overlapping bookings found');
  });

});
