'use strict';

// Mocked check_availability tool. Returns deterministic, clearly-labeled mock
// data — no real booking engine integration. The assistant must always call
// this instead of inventing availability or pricing itself.

const ROOM_IDS = ['twin_garden', 'deluxe_balcony', 'penthouse_loft', 'cottage', 'full_lodge_buyout'];

// Standard check-in time (policies.check_in.standard in knowledge.json) — used as the
// "arrival" instant the cancellation window is measured against.
const CHECK_IN_HOUR = 13;

const TOOLS = [
  {
    name: 'check_availability',
    description:
      'Check mock room availability for Kajuju Lodge for a given room type and date range. ' +
      'Always call this before telling a guest whether a room is available — never guess or assume availability. ' +
      'Returns availability, the matched rate tier (weekday/weekend), and a note when peak/festive pricing may apply.',
    input_schema: {
      type: 'object',
      properties: {
        room_id: {
          type: 'string',
          enum: ROOM_IDS,
          description:
            'Which room type to check. twin_garden = Twin Garden/Pebble Room, deluxe_balcony = Deluxe Room with Balcony (Jade/Coral), penthouse_loft = Penthouse Loft, cottage = 3-bedroom Cottage, full_lodge_buyout = whole-property buyout.',
        },
        check_in: {
          type: 'string',
          description: 'Check-in date in YYYY-MM-DD format.',
        },
        check_out: {
          type: 'string',
          description: 'Check-out date in YYYY-MM-DD format.',
        },
        guests: {
          type: 'integer',
          description: 'Number of guests, if known.',
        },
      },
      required: ['room_id', 'check_in'],
    },
  },
  {
    name: 'check_cancellation_window',
    description:
      'Compute, in code, the real number of hours/days between the current server date and time and a given ' +
      'check-in date, and classify that gap against the cancellation policy (full refund at 72+ hours, no refund ' +
      'within 48 hours, unspecified in the 48-72 hour gap). Always call this before telling a guest whether they ' +
      'qualify for a full refund, a partial refund, or no refund for a specific date — never estimate or guess the ' +
      'date gap yourself.',
    input_schema: {
      type: 'object',
      properties: {
        check_in: {
          type: 'string',
          description: 'The booking check-in / arrival date in YYYY-MM-DD format.',
        },
      },
      required: ['check_in'],
    },
  },
];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function isWeekendDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  return day === 5 || day === 6; // Friday or Saturday night
}

function checkAvailability(input) {
  const { room_id: roomId, check_in: checkIn, check_out: checkOut, guests } = input || {};

  if (!roomId || !ROOM_IDS.includes(roomId)) {
    return {
      error: true,
      message: `Unknown room_id "${roomId}". Must be one of: ${ROOM_IDS.join(', ')}.`,
    };
  }
  if (!checkIn || Number.isNaN(new Date(`${checkIn}T00:00:00Z`).getTime())) {
    return {
      error: true,
      message: `Invalid or missing check_in date: "${checkIn}". Expected YYYY-MM-DD.`,
    };
  }

  // Deterministic mock: ~1 in 6 requests come back unavailable, based on a
  // hash of the request so the same query always returns the same mock
  // result (useful for repeatable eval runs).
  const seed = hashString(`${roomId}|${checkIn}|${checkOut || ''}`);
  const available = seed % 6 !== 0;

  const tier = isWeekendDate(checkIn) ? 'weekend' : 'weekday';

  return {
    error: false,
    mock: true,
    room_id: roomId,
    check_in: checkIn,
    check_out: checkOut || null,
    guests: guests || null,
    available,
    rate_tier_guess: tier,
    note:
      'This is MOCKED data from a test double, not a real booking engine. ' +
      'Rate tier is guessed from day-of-week only (Fri/Sat night = weekend); actual peak/festive-season pricing ' +
      'boundaries are not available to this tool and should not be asserted with confidence.',
  };
}

function checkCancellationWindow(input) {
  const { check_in: checkIn } = input || {};

  if (!checkIn || Number.isNaN(new Date(`${checkIn}T00:00:00`).getTime())) {
    return {
      error: true,
      message: `Invalid or missing check_in date: "${checkIn}". Expected YYYY-MM-DD.`,
    };
  }

  const now = new Date();
  const arrival = new Date(`${checkIn}T00:00:00`);
  arrival.setHours(CHECK_IN_HOUR, 0, 0, 0);

  const hoursUntilArrival = (arrival.getTime() - now.getTime()) / (1000 * 60 * 60);

  let policyBucket;
  let note;
  if (hoursUntilArrival >= 72) {
    policyBucket = 'full_refund';
    note = 'Computed from the real current server date/time, not estimated by the model. 72+ hours out: full refund applies.';
  } else if (hoursUntilArrival < 48) {
    policyBucket = 'no_refund';
    note = 'Computed from the real current server date/time, not estimated by the model. Under 48 hours out: no refund applies.';
  } else {
    policyBucket = 'ambiguous_48_to_72';
    note =
      'Computed from the real current server date/time, not estimated by the model. This falls in the 48-72 hour ' +
      'gap, which source material does not specify. Do not state full or no refund for this bucket; tell the guest ' +
      'this needs to be confirmed with the team.';
  }

  return {
    error: false,
    check_in: checkIn,
    hours_until_arrival: Math.round(hoursUntilArrival * 10) / 10,
    days_until_arrival: Math.round((hoursUntilArrival / 24) * 10) / 10,
    policy_bucket: policyBucket,
    note,
  };
}

function getTools() {
  return TOOLS;
}

function executeTool(name, input) {
  if (name === 'check_availability') {
    return checkAvailability(input);
  }
  if (name === 'check_cancellation_window') {
    return checkCancellationWindow(input);
  }
  return { error: true, message: `Unknown tool: ${name}` };
}

module.exports = { getTools, executeTool, ROOM_IDS };
