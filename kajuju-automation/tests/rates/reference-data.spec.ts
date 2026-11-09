import { test, expect } from '@playwright/test';
import {
  ROOMS,
  adultSupplement,
  breakfastPerAdult,
  childSupplement,
  extraAdultPerNight,
  parseCsv,
  roomOnly,
  usdOf,
  websiteOnly,
} from './rates-data';

/**
 * Checks on the reference data itself. They need no browser and no website, so a bad edit to the
 * CSVs is caught here before it shows up as confusing page failures.
 */

test.describe('Rates reference data', () => {
  test('CSV parser keeps a quoted comma inside one field (cottage row)', () => {
    const [header, row] = parseCsv('Room,Guests,Price type\nCottage (3 bedrooms),"Whole cottage, up to 6 guests",Room Only\n');
    expect(header).toEqual(['Room', 'Guests', 'Price type']);
    expect(row).toEqual(['Cottage (3 bedrooms)', 'Whole cottage, up to 6 guests', 'Room Only']);
  });

  test('CSV parser handles escaped quotes and CRLF line endings', () => {
    expect(parseCsv('a,b\r\n"say ""hi""",2\r\n')).toEqual([['a', 'b'], ['say "hi"', '2']]);
  });

  test('the cottage row loads with its whole-cottage guest label', () => {
    expect(roomOnly(ROOMS.cottage, 'Whole cottage, up to 6 guests', 'weekday')).toBeGreaterThan(0);
  });

  test('weekday prices are the same on every day Sunday to Thursday (the site shows one weekday price)', () => {
    for (const room of [ROOMS.twin, ROOMS.deluxe]) expect(() => roomOnly(room, '1 guest', 'weekday')).not.toThrow();
  });

  test('derived values are consistent: adult breakfast and extra adult agree on every row', () => {
    expect(breakfastPerAdult()).toBeGreaterThan(0);
    expect(extraAdultPerNight()).toBeGreaterThan(0);
  });

  test('every approved supplement is present and positive', () => {
    for (const plan of ['Half Board', 'Full Board'] as const) {
      expect(adultSupplement(plan)).toBeGreaterThan(0);
      expect(childSupplement(plan)).toBeGreaterThan(0);
    }
    expect(childSupplement('Breakfast')).toBeGreaterThan(0);
  });

  test('a supplement row that is not approved is rejected', () => {
    expect(() => websiteOnly('Nonexistent supplement', 'per adult per night')).toThrow(/No row/);
  });

  test('USD is the KES value divided by the stated rate, to the nearest dollar', () => {
    expect(usdOf(0)).toBe(0);
    expect(usdOf(131)).toBe(1);
    expect(usdOf(196)).toBe(1); // 1.496
    expect(usdOf(197)).toBe(2); // 1.504
  });
});
