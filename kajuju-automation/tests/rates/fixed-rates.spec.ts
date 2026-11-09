import { Page } from '@playwright/test';
import { test, expect } from '../e2e/fixtures';
import { PENDING_REASON, WEBSITE_UPDATE_PENDING, isPending, pendingTitle } from './constants';
import { COTTAGE_GUESTS, Period, ROOMS, escapeRe, extraAdultPerNight, fmt, roomOnly } from './rates-data';

/**
 * Penthouse Loft and Cottage (not governed by the period toggle), the extra adult line,
 * Expected values come from rates-reference/. USD figures are checked in usd.spec.ts.
 */

const PERIODS: Period[] = ['weekday', 'weekend', 'peak'];
const PERIOD_NAME: Record<Period, string> = { weekday: 'Sun–Thu', weekend: 'Fri–Sat', peak: 'Festive' };

// Row labels exactly as the page prints them.
const PENTHOUSE_LABELS: Record<Period, [single: string, double: string]> = {
  weekday: ['Single — off-peak weekday', 'Double — off-peak weekday'],
  weekend: ['Single — weekend', 'Double — weekend'],
  peak: ['Single — peak', 'Double — peak'],
};
const COTTAGE_LABELS: Record<Period, string> = {
  weekday: 'Off-peak weekday',
  weekend: 'Weekend (Fri–Sat)',
  peak: 'Peak (Dec 19 – Jan 3)',
};

const roomCard = (page: Page, heading: string | RegExp) =>
  page.locator('.room-card').filter({ has: page.getByRole('heading', { level: 3, name: heading }) });
const penthouse = (page: Page) => roomCard(page, ROOMS.penthouse);
const cottage = (page: Page) => roomCard(page, /^Cottage/);

test.describe('Rates: Penthouse Loft, Cottage and extras', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  for (const period of PERIODS) {
    const phKey = `penthouse:${period}:kes`;
    test(pendingTitle(phKey, `Penthouse Loft, ${PERIOD_NAME[period]}: 1 and 2 adult rates match the workbook`), async ({ page }) => {
      test.skip(isPending(phKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
      for (const [i, label] of PENTHOUSE_LABELS[period].entries()) {
        const expected = roomOnly(ROOMS.penthouse, `${i + 1} adult${i ? 's' : ''}`, period);
        const row = penthouse(page).locator('.rate-item').filter({ has: page.locator('.label', { hasText: label }) });
        await expect(row.locator('.amount'), label).toHaveText(new RegExp(`^Ksh ${escapeRe(fmt(expected))}\\s`));
      }
    });

    const cotRow = (page: Page) => cottage(page).locator('.cottage-period').filter({ has: page.locator('.cottage-period-label', { hasText: COTTAGE_LABELS[period] }) });

    const cotKey = `cottage:${period}:kes`;
    test(pendingTitle(cotKey, `Cottage, ${PERIOD_NAME[period]}: whole cottage rate matches the workbook`), async ({ page }) => {
      test.skip(isPending(cotKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
      await expect(cotRow(page).locator('.cottage-period-price')).toHaveText(`Ksh ${fmt(roomOnly(ROOMS.cottage, COTTAGE_GUESTS, period))}`);
    });
  }

  const extraKey = 'penthouse:extra-adult';
  test(pendingTitle(extraKey, 'Penthouse Loft: the extra adult charge matches the workbook (3 adults minus 2 adults)'), async ({ page }) => {
    test.skip(isPending(extraKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    const policy = page.locator('.policy-item').filter({ hasText: /additional guests/i });
    await expect(policy).toHaveCount(1);
    await expect(policy).toContainText(`Ksh ${fmt(extraAdultPerNight())} per adult per night in Penthouse (up to 3)`);
  });
});
