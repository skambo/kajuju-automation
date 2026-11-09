/**
 * Shared switches for the rates project. No price values live in this file.
 */

/**
 * The workbook is the source of truth and the website is being updated to match it.
 * While this is true, every test listed in PENDING is skipped.
 * Set it to false once the website is live with the updated prices, run `npm run test:rates`
 * and fix any remaining real failures.
 */
export const WEBSITE_UPDATE_PENDING = true;

export const PENDING_REASON = 'Unskip once the website is live with the updated prices.';
export const PENDING_TAG = '[pending website update]';

/** Exchange rate used to compute the expected USD figures from the approved KES values. */
export const USD_RATE = 131;

/**
 * Keys of the tests that currently fail only because the website is behind the workbook.
 * Each key is the first argument of `pendingTitle()` in the spec that owns the test.
 */
export const PENDING: ReadonlySet<string> = new Set<string>([
  'christmas:meals-note',
  'christmas:table:Deluxe Room with Balcony:Full Board',
  'christmas:table:Deluxe Room with Balcony:Half Board',
  'christmas:table:Twin Garden Room:Full Board',
  'christmas:table:Twin Garden Room:Half Board',
  'supplements:cafe-menu-headings',
  'supplements:child-meals',
  'supplements:enquiry-form-options',
  'supplements:self-catering-note',
  'toggled:Deluxe Room with Balcony:peak:fb',
  'toggled:Deluxe Room with Balcony:peak:hb',
  'toggled:Deluxe Room with Balcony:restore-weekday',
  'toggled:Deluxe Room with Balcony:weekday:bb',
  'toggled:Deluxe Room with Balcony:weekday:fb',
  'toggled:Deluxe Room with Balcony:weekday:hb',
  'toggled:Deluxe Room with Balcony:weekend:fb',
  'toggled:Deluxe Room with Balcony:weekend:hb',
  'toggled:Twin Garden Room:peak:fb',
  'toggled:Twin Garden Room:peak:hb',
  'toggled:Twin Garden Room:weekday:fb',
  'toggled:Twin Garden Room:weekday:hb',
  'toggled:Twin Garden Room:weekend:fb',
  'toggled:Twin Garden Room:weekend:hb',
  'usd:conversion-rule',
  'usd:disclaimer-rate',
]);

export const isPending = (key: string): boolean => PENDING.has(key);

/** Title prefix that makes pending tests findable with one search. */
export const pendingTitle = (key: string, title: string): string => (isPending(key) ? `${PENDING_TAG} ${title}` : title);
