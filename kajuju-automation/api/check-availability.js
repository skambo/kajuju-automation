// api/check-availability.js
// Vercel serverless function — proxies availability check to Smoobu API.
// Keeps the Smoobu API key server-side, never exposed to the browser.

const SMOOBU_API = 'https://login.smoobu.com/api';

// Maps room dropdown values (from the booking form) to Smoobu apartment IDs.
// Update these IDs if rooms are added or renamed in Smoobu.
const ROOM_ID_MAP = {
  'Twin Garden Room — B&B':                          process.env.SMOOBU_CORAL_ROOM_ID,
  'Deluxe Room with Balcony — B&B':                  process.env.SMOOBU_JADE_ROOM_ID,
  'Penthouse Loft — Self Catering':                  process.env.SMOOBU_PENTHOUSE_ID,
  'Cottage (3 bed, up to 6 guests) — Self Catering': process.env.SMOOBU_COTTAGE_ID,
  'Workation — Deluxe Room with Balcony (H/B)':      process.env.SMOOBU_JADE_ROOM_ID,
  'Workation — Twin Garden Room (H/B)':              process.env.SMOOBU_CORAL_ROOM_ID,
  'Workation — Penthouse Loft':                      process.env.SMOOBU_PENTHOUSE_ID,
  'Workation — Team Cottage':                        process.env.SMOOBU_COTTAGE_ID,
  'Not sure yet — please advise':                    null,
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { room, checkIn, checkOut } = req.body;

  // If guest selected "Not sure yet", skip the check and let the form through
  if (!room || room === 'Not sure yet — please advise') {
    return res.status(200).json({ available: true, skipped: true });
  }

  // Validate we have dates
  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: 'Check-in and check-out dates are required' });
  }

  // Look up the Smoobu room ID for the selected room
  const apartmentId = ROOM_ID_MAP[room];
  if (!apartmentId) {
    // Unknown room name — let it through and Sandra will handle manually
    console.warn(`No Smoobu ID mapped for room: ${room}`);
    return res.status(200).json({ available: true, skipped: true });
  }

  try {
    const response = await fetch(`${SMOOBU_API}/reservations?pageSize=100&apartmentId=${apartmentId}`, {
      headers: {
        'Api-Key': process.env.SMOOBU_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Smoobu API error: ${response.status}`);
      // If Smoobu is unreachable, fail open — let the booking through
      // Sandra will catch conflicts manually. Better than blocking guests.
      return res.status(200).json({ available: true, skipped: true, reason: 'smoobu_unreachable' });
    }

    const data = await response.json();
    const bookings = data.bookings || [];

    // Check for overlaps using string comparison (YYYY-MM-DD).
    // Back-to-back is fine: existing checkout == requested checkin = no conflict.
    // Overlap only when an existing booking's departure is strictly after our arrival
    // AND an existing booking's arrival is strictly before our departure.
    const hasConflict = bookings.some((booking) => {
      const existingArrival   = booking.arrival;
      const existingDeparture = booking.departure;

      return existingArrival < checkOut && existingDeparture > checkIn;
    });

    return res.status(200).json({ available: !hasConflict });

  } catch (err) {
    console.error('Availability check failed:', err);
    // Network error — fail open so guests aren't blocked by our infra problems
    return res.status(200).json({ available: true, skipped: true, reason: 'network_error' });
  }
}
