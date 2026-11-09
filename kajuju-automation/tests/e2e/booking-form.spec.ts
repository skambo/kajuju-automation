import type { Page, Request, Route } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * Enquiry form (/book). Guests send the dates they are interested in and the hotel replies by email,
 * so this is an enquiry form, not a booking engine. Whether enquiries reach the inbox is verified by
 * hand; no automated test can or should check it.
 *
 * Nothing here ever reaches Formspree: tests/e2e/fixtures.ts blocks it for every test, and the
 * submission tests register their own controlled mock. All dates are computed relative to today.
 *
 * Two known application problems are encoded as `test.fail()` so they stay visible without
 * turning the suite red. When the page is fixed those tests start passing, `test.fail` then
 * reports "expected to fail but passed", and the marker must be removed.
 */

const SCRIPT_DEFECT =
  'Known defect: /book script error. The submit-validation listener uses `form` before ' +
  '`const form` is declared, so the page script throws a ReferenceError (temporal dead zone) at load ' +
  'and everything registered after the blur validators never runs. The form still delivers enquiries ' +
  'through the native post, so impact is limited to missing client side validation, date helpers and ' +
  'the on page thank you state. Remove this marker once the page is fixed.';

const MIN_STAY_CONFLICT =
  'Enquiry form conflicts with workbook minimum stay: the workbook says 1 night on normal dates and ' +
  '2 nights on festive dates (19 Dec to 3 Jan), but the form forces 2 nights. Dates on an enquiry are ' +
  'only a request, so this is a content conflict, flagged and not changed. This test is written to the ' +
  'workbook rule. ' + SCRIPT_DEFECT;

const PHONE_MESSAGE = 'Please enter a valid phone number (e.g. +254 7xx xxx xxx or +44 791x xxxxxx)';
const EMAIL_BLUR_MESSAGE = 'Please enter a valid email address (e.g. name@example.com)';
const EMAIL_SUBMIT_MESSAGE = 'Please enter a valid email address';

// ---------- dates, always relative to today (UTC, matching how the page computes "today") ----------

const DAY_MS = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
// Festive nights run 19 Dec to 3 Jan inclusive, every year (direct-booking-rules).
function isFestiveNight(d: Date): boolean {
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (month === 12 && day >= 19) || (month === 1 && day <= 3);
}
/** First check-in about a month out whose next three nights are all non-festive. */
function normalCheckIn(): Date {
  let d = addDays(today(), 30);
  while ([0, 1, 2].some((i) => isFestiveNight(addDays(d, i)))) d = addDays(d, 1);
  return d;
}
/** The next 19 December that is still in the future. */
function festiveCheckIn(): Date {
  const t = today();
  const thisYear = new Date(Date.UTC(t.getUTCFullYear(), 11, 19));
  return thisYear > t ? thisYear : new Date(Date.UTC(t.getUTCFullYear() + 1, 11, 19));
}

// ---------- locators ----------

const field = (page: Page, testId: string) => page.getByTestId(testId);
/** The validation message belonging to one specific field (the page appends it inside the field's group). */
const fieldError = (page: Page, testId: string) =>
  page.locator('.form-group').filter({ has: page.getByTestId(testId) }).locator('.field-error');
const submitButton = (page: Page) => page.getByTestId('submit-btn');

// ---------- Formspree mock ----------

const FORMSPREE = 'https://formspree.io/f/**';
const replyOk = (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });

/** Routes Formspree to `reply` and returns every request it receives. */
async function mockFormspree(page: Page, reply: (route: Route) => Promise<void> | void): Promise<Request[]> {
  const received: Request[] = [];
  await page.route(FORMSPREE, async (route) => {
    received.push(route.request());
    await reply(route);
  });
  return received;
}

function formFields(request: Request): Record<string, string> {
  const body = request.postData() ?? '';
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g)) out[m[1]] = m[2];
  return out;
}

function deferred() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  return { gate, release };
}

const GUEST = { name: 'Test Guest', phone: '+254 700 000 000', email: 'guest@example.com', room: 'Twin Garden Room — B&B', guests: '2 guests' };

async function fillValidRequest(page: Page, stay = { checkIn: normalCheckIn(), nights: 2 }) {
  await field(page, 'input-name').fill(GUEST.name);
  await field(page, 'input-phone').fill(GUEST.phone);
  await field(page, 'input-email').fill(GUEST.email);
  await field(page, 'select-room').selectOption(GUEST.room);
  await field(page, 'select-guests').selectOption(GUEST.guests);
  await field(page, 'input-checkin').fill(iso(stay.checkIn));
  await field(page, 'input-checkout').fill(iso(addDays(stay.checkIn, stay.nights)));
  return { checkIn: iso(stay.checkIn), checkOut: iso(addDays(stay.checkIn, stay.nights)) };
}

// ---------------------------------------------------------------------------------------------

test.describe('Enquiry form: script health', () => {
  test('the page script loads without runtime errors', async ({ page }) => {
    test.fail(true, SCRIPT_DEFECT);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto('/book');
    await expect(submitButton(page)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Enquiry form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/book');
  });

  test.describe('fields', () => {
    const FIELDS: Array<[testId: string, type: string | null, required: boolean]> = [
      ['input-name', 'text', true],
      ['input-phone', 'tel', true],
      ['input-email', 'email', true],
      ['select-room', null, true],
      ['select-guests', null, true],
      ['input-checkin', 'date', true],
      ['input-checkout', 'date', true],
      ['select-meal', null, false],
      ['input-special', null, false],
    ];
    for (const [testId, type, required] of FIELDS) {
      test(`${testId} is ${required ? 'required' : 'optional'}${type ? ` and of type ${type}` : ''}`, async ({ page }) => {
        const el = field(page, testId);
        await expect(el).toBeVisible();
        if (type) await expect(el).toHaveAttribute('type', type);
        if (required) await expect(el).toHaveAttribute('required', '');
        else await expect(el).not.toHaveAttribute('required');
      });
    }

    test('the room list offers each accommodation type on the rate card', async ({ page }) => {
      const values = await field(page, 'select-room').locator('option').evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
      for (const room of ['Twin Garden Room — B&B', 'Deluxe Room with Balcony — B&B', 'Penthouse Loft — Self Catering']) {
        expect(values, room).toContain(room);
      }
      expect(values.some((v) => v.startsWith('Cottage'))).toBe(true);
    });

    test('the form posts over https to a Formspree endpoint', async ({ page }) => {
      const form = page.locator('form').filter({ has: field(page, 'input-name') });
      await expect(form).toHaveAttribute('method', /^post$/i);
      const action = await form.getAttribute('action');
      expect(action, 'form action attribute').toBeTruthy();
      const url = new URL(action as string);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('formspree.io');
    });

    test('the submit button is enabled and labelled before submitting', async ({ page }) => {
      await expect(submitButton(page)).toBeEnabled();
      await expect(submitButton(page)).toHaveText(/Send Booking Request/);
    });
  });

  test.describe('phone validation (on blur)', () => {
    const REJECTED = ['123', '123456', '1234567890123456', 'abcdefghij'];
    const ACCEPTED = ['+254 700 000 000', '+44 7911 123456', '0700000000', '(020) 123-4567', '1234567', '123456789012345'];

    for (const value of REJECTED) {
      test(`rejects "${value}" with the phone message and no other error`, async ({ page }) => {
        await field(page, 'input-phone').fill(value);
        await field(page, 'input-phone').blur();
        await expect(fieldError(page, 'input-phone')).toHaveText(PHONE_MESSAGE);
        await expect(page.locator('.field-error')).toHaveCount(1);
      });
    }
    for (const value of ACCEPTED) {
      test(`accepts "${value}"`, async ({ page }) => {
        await field(page, 'input-phone').fill(value);
        await field(page, 'input-phone').blur();
        await expect(page.locator('.field-error')).toHaveCount(0);
      });
    }
    test('an untouched empty phone field shows no error on blur', async ({ page }) => {
      await field(page, 'input-phone').focus();
      await field(page, 'input-phone').blur();
      await expect(page.locator('.field-error')).toHaveCount(0);
    });
  });

  test.describe('email validation (on blur)', () => {
    const REJECTED = ['notanemail', 'guest@', '@example.com', 'guest@example', 'guest@example.c', 'guest example@x.com'];
    const ACCEPTED = ['guest@example.com', 'first.last+tag@sub.example.co.ke'];

    for (const value of REJECTED) {
      test(`rejects "${value}" with the email message and no other error`, async ({ page }) => {
        await field(page, 'input-email').fill(value);
        await field(page, 'input-email').blur();
        await expect(fieldError(page, 'input-email')).toHaveText(EMAIL_BLUR_MESSAGE);
        await expect(page.locator('.field-error')).toHaveCount(1);
      });
    }
    for (const value of ACCEPTED) {
      test(`accepts "${value}"`, async ({ page }) => {
        await field(page, 'input-email').fill(value);
        await field(page, 'input-email').blur();
        await expect(page.locator('.field-error')).toHaveCount(0);
      });
    }
  });

  test.describe('validation message lifecycle', () => {
    test('an error disappears once the value is corrected', async ({ page }) => {
      const phone = field(page, 'input-phone');
      await phone.fill('123');
      await phone.blur();
      await expect(fieldError(page, 'input-phone')).toHaveText(PHONE_MESSAGE);
      await phone.fill(GUEST.phone);
      await phone.blur();
      await expect(fieldError(page, 'input-phone')).toHaveCount(0);
    });

    test('repeated invalid blurs show one message, not a stack', async ({ page }) => {
      const email = field(page, 'input-email');
      for (const bad of ['nope', 'still@nope']) {
        await email.fill(bad);
        await email.blur();
      }
      await expect(fieldError(page, 'input-email')).toHaveCount(1);
    });
  });

  test.describe('dates (relative to today)', () => {
    test('check-in and checkout cannot be earlier than today', async ({ page }) => {
      test.fail(true, SCRIPT_DEFECT);
      await expect(field(page, 'input-checkin')).toHaveAttribute('min', iso(today()));
      await expect(field(page, 'input-checkout')).toHaveAttribute('min', iso(today()));
    });

    test('normal dates: choosing check-in defaults checkout to one night later (workbook minimum stay)', async ({ page }) => {
      test.fail(true, MIN_STAY_CONFLICT);
      const checkIn = normalCheckIn();
      await field(page, 'input-checkin').fill(iso(checkIn));
      await expect(field(page, 'input-checkout')).toHaveValue(iso(addDays(checkIn, 1)));
    });

    test('normal dates: a one-night stay is accepted (workbook minimum stay)', async ({ page }) => {
      test.fail(true, MIN_STAY_CONFLICT);
      const checkIn = normalCheckIn();
      await field(page, 'input-checkin').fill(iso(checkIn));
      // The page must actively allow the earliest legal checkout. Without this, the test would pass
      // trivially while the page script is broken and no minimum is applied at all.
      await expect(field(page, 'input-checkout')).toHaveAttribute('min', iso(addDays(checkIn, 1)));
      await field(page, 'input-checkout').fill(iso(addDays(checkIn, 1)));
      await expect(page.locator('[data-testid="input-checkout"]:invalid')).toHaveCount(0);
    });

    test('festive dates: choosing check-in defaults checkout to two nights later (workbook minimum stay)', async ({ page }) => {
      test.fail(true, SCRIPT_DEFECT);
      const checkIn = festiveCheckIn();
      await field(page, 'input-checkin').fill(iso(checkIn));
      await expect(field(page, 'input-checkout')).toHaveValue(iso(addDays(checkIn, 2)));
    });

    test('checkout on the check-in date is rejected', async ({ page }) => {
      test.fail(true, SCRIPT_DEFECT);
      const checkIn = normalCheckIn();
      await field(page, 'input-checkin').fill(iso(checkIn));
      await field(page, 'input-checkout').fill(iso(checkIn));
      await expect(page.locator('[data-testid="input-checkout"]:invalid')).toHaveCount(1);
    });
  });

  test.describe('submission (Formspree mocked)', () => {
    test('an empty form is stopped by the browser: first required field is focused and nothing is sent', async ({ page }) => {
      const sent = await mockFormspree(page, replyOk);
      await submitButton(page).click();
      await expect(field(page, 'input-name')).toBeFocused();
      // Seven required fields, all empty.
      await expect(page.locator('form :invalid')).toHaveCount(7);
      expect(sent).toHaveLength(0);
    });

    test('invalid phone and email on an otherwise complete form block the request and name each field', async ({ page }) => {
      test.fail(true, SCRIPT_DEFECT);
      const sent = await mockFormspree(page, replyOk);
      await fillValidRequest(page);
      await field(page, 'input-phone').fill('123');
      // "guest@example" passes the browser's own email check, so only the page's validation can stop it.
      await field(page, 'input-email').fill('guest@example');
      await submitButton(page).click();
      await expect(fieldError(page, 'input-phone')).toHaveText(PHONE_MESSAGE);
      await expect(fieldError(page, 'input-email')).toHaveText(EMAIL_SUBMIT_MESSAGE);
      expect(sent).toHaveLength(0);
    });

    test('a successful submit posts once and shows the thank-you state on the same page without navigating away', async ({ page }) => {
      test.fail(true, SCRIPT_DEFECT);
      const sent = await mockFormspree(page, replyOk);
      const stay = await fillValidRequest(page);
      // A marker on the current document: it only survives if the page did not navigate.
      await page.evaluate(() => ((window as unknown as { sameDocument?: boolean }).sameDocument = true));
      const urlBefore = page.url();
      await submitButton(page).click();

      await expect(page.locator('#thankyou')).toBeVisible();
      await expect(page.locator('#form-container')).toBeHidden();
      expect(page.url()).toBe(urlBefore);
      expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);
      expect(sent).toHaveLength(1);
      expect(sent[0].method()).toBe('POST');
      expect(await sent[0].headerValue('accept')).toContain('application/json');
      expect(formFields(sent[0])).toMatchObject({
        name: GUEST.name,
        phone: GUEST.phone,
        email: GUEST.email,
        room: GUEST.room,
        guests: GUEST.guests,
        check_in: stay.checkIn,
        check_out: stay.checkOut,
      });
    });

    test('a double click and an Enter key press while pending still send exactly one request', async ({ page }) => {
      test.fail(true, SCRIPT_DEFECT);
      const held = deferred();
      const sent = await mockFormspree(page, async (route) => {
        await held.gate;
        await replyOk(route);
      });
      await fillValidRequest(page);

      await submitButton(page).dblclick();
      await expect(submitButton(page)).toBeDisabled();
      await expect(submitButton(page)).toHaveText('Sending...');
      await field(page, 'input-name').press('Enter');
      expect(sent).toHaveLength(1);

      held.release();
      await expect(page.locator('#thankyou')).toBeVisible();
      expect(sent).toHaveLength(1);
    });

    test('a server error shows the failure alert, re-enables the button and keeps the guest\'s input', async ({ page }) => {
      test.fail(true, SCRIPT_DEFECT);
      let alertText = '';
      page.once('dialog', (d) => {
        alertText = d.message();
        void d.accept();
      });
      await mockFormspree(page, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));
      await fillValidRequest(page);
      await submitButton(page).click();

      await expect.poll(() => alertText).toContain('Something went wrong');
      await expect(submitButton(page)).toBeEnabled();
      await expect(submitButton(page)).toHaveText('Send Booking Request →');
      await expect(page.locator('#thankyou')).toBeHidden();
      await expect(field(page, 'input-name')).toHaveValue(GUEST.name);
      await expect(field(page, 'input-email')).toHaveValue(GUEST.email);
    });

    test('a network failure shows the failure alert and lets the guest try again', async ({ page }) => {
      test.fail(true, SCRIPT_DEFECT);
      let alertText = '';
      page.once('dialog', (d) => {
        alertText = d.message();
        void d.accept();
      });
      await mockFormspree(page, (route) => route.abort('connectionfailed'));
      await fillValidRequest(page);
      await submitButton(page).click();

      await expect.poll(() => alertText).toContain('Something went wrong');
      await expect(submitButton(page)).toBeEnabled();
      await expect(page.locator('#thankyou')).toBeHidden();
      await expect(field(page, 'input-phone')).toHaveValue(GUEST.phone);
    });
  });
});
