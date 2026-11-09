import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { USD_RATE } from './constants';

/**
 * Loads the expected rates from the gitignored CSV exports in rates-reference/.
 * No price is hard-coded in the specs: edit the CSVs and the tests follow.
 *
 * If the folder or a file is missing, loading throws, so the rates project fails loudly
 * instead of skipping silently.
 */

export type Period = 'weekday' | 'weekend' | 'peak';

export const ROOMS = {
  twin: 'Twin Garden Room',
  deluxe: 'Deluxe Room with Balcony',
  penthouse: 'Penthouse Loft',
  cottage: 'Cottage (3 bedrooms)',
} as const;
export const COTTAGE_GUESTS = 'Whole cottage, up to 6 guests';

export type MealPlan = 'Half Board' | 'Full Board';

const DAY_COLUMNS: Record<Period, readonly string[]> = {
  weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
  weekend: ['Fri', 'Sat'],
  peak: ['Festive'],
};

const REFERENCE_DIR = resolve(process.cwd(), process.env.RATES_REFERENCE_DIR ?? 'rates-reference');
const FILES = {
  roomOnly: 'direct-rates-room-only.csv',
  withBreakfast: 'direct-rates-with-breakfast.csv',
  websiteOnly: 'website-only-rates.csv',
} as const;

function missing(detail: string): never {
  throw new Error(
    `The rates project cannot run: ${detail}\n` +
      `Expected the gitignored CSV exports in "${REFERENCE_DIR}":\n` +
      Object.values(FILES).map((f) => `  - ${f}`).join('\n') +
      `\nThese files are intentionally not in the repository because they hold commercially sensitive rates. ` +
      `Put them back (or point RATES_REFERENCE_DIR at them) and run again. ` +
      `CI runs only the e2e project, which does not need them.`
  );
}

/** Minimal RFC 4180 style parser: quoted fields may contain commas, quotes ("") and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const endRow = () => {
    row.push(field);
    field = '';
    if (row.some((f) => f !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else field += c;
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

function readTable(file: string): Record<string, string>[] {
  if (!existsSync(REFERENCE_DIR)) missing(`the folder "${REFERENCE_DIR}" does not exist.`);
  const path = resolve(REFERENCE_DIR, file);
  if (!existsSync(path)) missing(`"${file}" is not in the rates folder.`);
  const [header, ...body] = parseCsv(readFileSync(path, 'utf8'));
  if (!header) missing(`"${file}" is empty.`);
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])));
}

type RoomRates = Record<string, number>;
function loadRoomTable(file: string): Map<string, RoomRates> {
  const out = new Map<string, RoomRates>();
  for (const r of readTable(file)) {
    const prices: RoomRates = {};
    for (const col of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Festive']) {
      const n = Number(r[col]);
      if (!Number.isFinite(n)) missing(`"${file}" has a non-numeric ${col} value for ${r.Room} (${r.Guests}).`);
      prices[col] = n;
    }
    out.set(`${r.Room}|${r.Guests}`, prices);
  }
  return out;
}

const roomOnlyTable = loadRoomTable(FILES.roomOnly);
const withBreakfastTable = loadRoomTable(FILES.withBreakfast);
const websiteOnlyTable = readTable(FILES.websiteOnly);

function lookup(table: Map<string, RoomRates>, file: string, room: string, guests: string, period: Period): number {
  const prices = table.get(`${room}|${guests}`);
  if (!prices) throw new Error(`No row for "${room}" / "${guests}" in ${file}.`);
  const values = new Set(DAY_COLUMNS[period].map((col) => prices[col]));
  if (values.size !== 1) {
    throw new Error(
      `${file}: ${room} / ${guests} has different prices across ${DAY_COLUMNS[period].join(', ')}. ` +
        `The website shows one ${period} price, so the tests need updating before this can be checked.`
    );
  }
  return [...values][0];
}

export const roomOnly = (room: string, guests: string, period: Period) => lookup(roomOnlyTable, FILES.roomOnly, room, guests, period);
export const withBreakfast = (room: string, guests: string, period: Period) =>
  lookup(withBreakfastTable, FILES.withBreakfast, room, guests, period);

/** One approved value from website-only-rates.csv. Throws if the row is missing or not approved. */
export function websiteOnly(item: string, unit: string): number {
  const row = websiteOnlyTable.find((r) => r.item === item && r.unit === unit);
  if (!row) throw new Error(`No row "${item}" / "${unit}" in ${FILES.websiteOnly}.`);
  if (row.status !== 'approved') throw new Error(`"${item}" / "${unit}" in ${FILES.websiteOnly} has status "${row.status}", not "approved".`);
  const n = Number(row.value_kes);
  if (!Number.isFinite(n)) throw new Error(`"${item}" / "${unit}" in ${FILES.websiteOnly} has a non-numeric value_kes.`);
  return n;
}

const ADULT_UNIT = 'per adult per night';
const CHILD_UNIT = 'child aged 4 to 11 per night';

export const adultSupplement = (plan: MealPlan) => websiteOnly(`${plan} supplement`, ADULT_UNIT);
export const childSupplement = (plan: MealPlan | 'Breakfast') => websiteOnly(`${plan} supplement`, CHILD_UNIT);

/**
 * Half Board / Full Board total for a Twin or Deluxe room:
 * Room Only price for that room and guest count + (adults x per adult per night supplement).
 */
export function mealPlanTotal(room: string, adults: 1 | 2, plan: MealPlan, period: Period): number {
  return roomOnly(room, adults === 1 ? '1 guest' : '2 guests', period) + adults * adultSupplement(plan);
}

function single<T>(values: T[], what: string): T {
  const unique = [...new Set(values)];
  if (unique.length !== 1) throw new Error(`${what} is not consistent across the CSV rows (${unique.join(', ')}).`);
  return unique[0];
}

/** Adult breakfast per night, derived as (with breakfast) - (room only), per adult. Must agree on every row. */
export function breakfastPerAdult(): number {
  const diffs: number[] = [];
  for (const room of [ROOMS.twin, ROOMS.deluxe]) {
    for (const period of ['weekday', 'weekend', 'peak'] as const) {
      diffs.push(withBreakfast(room, '1 guest', period) - roomOnly(room, '1 guest', period));
      diffs.push((withBreakfast(room, '2 guests', period) - roomOnly(room, '2 guests', period)) / 2);
    }
  }
  return single(diffs, 'The adult breakfast price implied by the room only and with breakfast CSVs');
}

/** Extra adult in the Penthouse Loft, derived as (3 adults) - (2 adults). Must agree in every period. */
export function extraAdultPerNight(): number {
  return single(
    (['weekday', 'weekend', 'peak'] as const).map((p) => roomOnly(ROOMS.penthouse, '3 adults', p) - roomOnly(ROOMS.penthouse, '2 adults', p)),
    'The extra adult price implied by the Penthouse Loft rows'
  );
}

export const fmt = (n: number): string => n.toLocaleString('en-US');
/** Expected USD for an approved KES value: nearest whole dollar, as the page's own figures are. */
export const usdOf = (kes: number): number => Math.round(kes / USD_RATE);
export const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
