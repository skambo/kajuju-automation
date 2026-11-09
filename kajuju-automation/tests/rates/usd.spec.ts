import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../e2e/fixtures';
import { RatePeriod, RatesPage } from '../e2e/pages/rates.page';
import { PENDING_REASON, USD_RATE, WEBSITE_UPDATE_PENDING, isPending, pendingTitle } from './constants';
import { COTTAGE_GUESTS, ROOMS, mealPlanTotal, roomOnly, withBreakfast } from './rates-data';

/**
 * USD figures follow one rule: displayed USD = Math.round(approved KES / USD_RATE).
 * It is checked on a small set of representative rows (every room, and every period type), not on
 * every cell, because a wrong rate shows up on any row.
 */

interface Row {
  name: string;
  /** Approved KES value from the CSVs. */
  kes: number;
  /** Moves the page to the state where the row is shown and returns the locator for its USD text. */
  show: (page: Page, rates: RatesPage) => Promise<Locator>;
}

async function toggled(rates: RatesPage, period: RatePeriod, room: string, label: string): Promise<Locator> {
  await rates.periodButton(period).click();
  await expect(rates.panel(period, room)).toHaveClass(/active/);
  return rates.roomRateUsd(period, room, label);
}

const ROWS: Row[] = [
  { name: 'Twin, weekday, Double B&B', kes: withBreakfast(ROOMS.twin, '2 guests', 'weekday'), show: (_p, r) => toggled(r, 'weekday', ROOMS.twin, 'Double B&B') },
  { name: 'Twin, weekend, Single H/B', kes: mealPlanTotal(ROOMS.twin, 1, 'Half Board', 'weekend'), show: (_p, r) => toggled(r, 'weekend', ROOMS.twin, 'Single H/B') },
  { name: 'Twin, festive, Double FB', kes: mealPlanTotal(ROOMS.twin, 2, 'Full Board', 'peak'), show: (_p, r) => toggled(r, 'peak', ROOMS.twin, 'Double FB') },
  { name: 'Deluxe, weekday, Single B&B', kes: withBreakfast(ROOMS.deluxe, '1 guest', 'weekday'), show: (_p, r) => toggled(r, 'weekday', ROOMS.deluxe, 'Single B&B') },
  { name: 'Deluxe, weekend, Double H/B', kes: mealPlanTotal(ROOMS.deluxe, 2, 'Half Board', 'weekend'), show: (_p, r) => toggled(r, 'weekend', ROOMS.deluxe, 'Double H/B') },
  { name: 'Deluxe, festive, Single FB', kes: mealPlanTotal(ROOMS.deluxe, 1, 'Full Board', 'peak'), show: (_p, r) => toggled(r, 'peak', ROOMS.deluxe, 'Single FB') },
  {
    name: 'Penthouse Loft, weekday, 2 adults',
    kes: roomOnly(ROOMS.penthouse, '2 adults', 'weekday'),
    show: async (page) =>
      page
        .locator('.room-card')
        .filter({ has: page.getByRole('heading', { level: 3, name: ROOMS.penthouse, exact: true }) })
        .locator('.rate-item')
        .filter({ has: page.locator('.label', { hasText: 'Double — off-peak weekday' }) })
        .locator('.usd'),
  },
  {
    name: 'Cottage, festive, whole cottage',
    kes: roomOnly(ROOMS.cottage, COTTAGE_GUESTS, 'peak'),
    show: async (page) =>
      page
        .locator('.room-card')
        .filter({ has: page.getByRole('heading', { level: 3, name: /^Cottage/ }) })
        .locator('.cottage-period')
        .filter({ has: page.locator('.cottage-period-label', { hasText: 'Peak (Dec 19 – Jan 3)' }) })
        .locator('.cottage-period-usd'),
  },
];

test.describe('Rates: USD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  const ruleKey = 'usd:conversion-rule';
  test(pendingTitle(ruleKey, 'displayed USD equals the approved KES value divided by the USD rate, rounded, on every representative row'), async ({ page }) => {
    test.skip(isPending(ruleKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    const rates = new RatesPage(page);
    for (const row of ROWS) {
      const usd = await row.show(page, rates);
      // Wait only for a well formed approximate figure ("~" keeps it marked as approximate; Cottage adds " / night").
      await expect(usd, `${row.name} shows an approximate USD figure`).toHaveText(/^~\$\d+( \/ night)?$/);
      const shown = Number(/\d+/.exec((await usd.textContent()) ?? '')?.[0]);
      expect.soft(shown, `${row.name}: displayed USD`).toBe(Math.round(row.kes / USD_RATE));
    }
  });

  const disclaimerKey = 'usd:disclaimer-rate';
  test(pendingTitle(disclaimerKey, 'the USD disclaimer states the rate the expected USD figures use'), async ({ page }) => {
    test.skip(isPending(disclaimerKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    await expect(page.locator('.price-disclaimer')).toHaveText(`All prices in KES. USD shown at KES ${USD_RATE} mid-market rate.`);
  });
});
