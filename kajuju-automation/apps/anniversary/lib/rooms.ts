export interface RoomType {
  id: string;
  name: string;
  alias?: string;
  /** One-line, experience-led summary shown on the card by default. */
  shortDescription: string;
  /** Full paragraph, shown only inside the collapsed "Details" toggle. */
  description: string;
  /** Off-peak weekday (Sun-Thu) nightly rate in KES, double occupancy. */
  weekdayRate: number;
  /** Weekend (Fri-Sat) nightly rate in KES, double occupancy. */
  weekendRate: number;
  breakfast_included: boolean;
  /** Local path under /public for the room's placeholder hero photo. */
  image: string;
}

/** Flat per-day breakfast add-on for self-catering rooms, KES per adult per night. */
export const BREAKFAST_ADDON_PRICE = 1200;

/**
 * Rates below are the real "Double, off-peak" tier pulled directly from the
 * published rate card on rates.idanbarnsuites.com (apps/landing-pages/index.html,
 * both the visible rate table and its JSON-LD). The anniversary flow only
 * asks for a total party size, not a per-room single/double split, so
 * "double occupancy" is used as the representative per-room rate throughout.
 * The campaign's booking window (25 Jul - 30 Sep 2026) never touches the
 * festive "Peak" tier, so peak rates are intentionally not modelled here.
 */
export const ROOM_TYPES: RoomType[] = [
  {
    id: 'twin-garden',
    name: 'Twin Garden Room',
    alias: 'Pebble Room',
    shortDescription: 'Quiet twin room with garden views — simple, comfortable, built for one or two.',
    description:
      'A well-appointed twin room with garden views and direct access to the outdoor grounds. Comfortable for solo travellers and couples, with a calm, natural setting. En-suite bathroom, quality linens, and that quiet you came for.',
    weekdayRate: 10500,
    weekendRate: 11500,
    breakfast_included: true,
    image: '/images/room-placeholder.jpg',
  },
  {
    id: 'deluxe-balcony',
    name: 'Deluxe Room with Balcony',
    alias: 'Jade / Coral Room',
    shortDescription: 'Our most-loved room — private balcony, Mt Kenya views, made for slowing down.',
    description:
      'Our most popular room. A spacious deluxe room with a private balcony overlooking the property, one of the best seats in the house for Mt Kenya views on a clear morning. Ideal for couples who want a bit more space.',
    weekdayRate: 11500,
    weekendRate: 13000,
    breakfast_included: true,
    image: '/images/room-placeholder.jpg',
  },
  {
    id: 'penthouse',
    name: 'Penthouse Loft',
    shortDescription: 'Your own loft with a fireplace and kitchen — private, self-sufficient, all to yourselves.',
    description:
      'A private, elevated loft unit with its own self-catering kitchen, living space, and bedroom. Features a cosy fireplace, perfect for cool Mt Kenya evenings. Up to 3 adults. Guests may also order à la carte from the restaurant.',
    weekdayRate: 13500,
    weekendRate: 15000,
    breakfast_included: false,
    image: '/images/room-placeholder.jpg',
  },
  {
    id: 'cottage',
    name: 'Cottage — 3 Bedrooms',
    shortDescription: 'A 3-bedroom self-catering cottage with a fireplace — space for the whole family.',
    description:
      'Our self-contained 3-bedroom cottage sleeps up to 6 guests, ideal for families and groups. Fireplace in the living area, a fully equipped self-catering kitchen, and a private outdoor space. Guests may also order à la carte from the restaurant.',
    weekdayRate: 10000,
    weekendRate: 12000,
    breakfast_included: false,
    image: '/images/room-placeholder.jpg',
  },
];
