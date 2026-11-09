import { test, expect } from '../e2e/fixtures';
import { PENDING_REASON, WEBSITE_UPDATE_PENDING, isPending, pendingTitle } from './constants';
import { COTTAGE_GUESTS, ROOMS, adultSupplement, breakfastPerAdult, fmt, mealPlanTotal, roomOnly, withBreakfast } from './rates-data';

/**
 * Christmas page (/christmas-2026/): every price on it is a festive price.
 * Expected values come from rates-reference/ (the Festive column).
 */

const PATH = '/christmas-2026/';

test.describe('Rates: Christmas page (festive)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  for (const room of [ROOMS.twin, ROOMS.deluxe]) {
    for (const plan of ['Bed & Breakfast', 'Half Board', 'Full Board'] as const) {
      const key = `christmas:table:${room}:${plan}`;
      test(pendingTitle(key, `${room}: festive ${plan} single and double rates match the workbook`), async ({ page }) => {
        test.skip(isPending(key) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
        const card = page.locator('#rates .room-card').filter({ has: page.getByRole('heading', { level: 3, name: room, exact: true }) });
        const row = card.locator('.rate-table tbody tr').filter({ has: page.getByRole('cell', { name: plan, exact: true }) });
        const total = (adults: 1 | 2) =>
          plan === 'Bed & Breakfast' ? withBreakfast(room, adults === 1 ? '1 guest' : '2 guests', 'peak') : mealPlanTotal(room, adults, plan, 'peak');
        await expect(row.getByRole('cell').nth(1), `${plan} single`).toHaveText(fmt(total(1)));
        await expect(row.getByRole('cell').nth(2), `${plan} double`).toHaveText(fmt(total(2)));
      });
    }
  }

  const standaloneKey = 'christmas:standalone';
  test(pendingTitle(standaloneKey, 'Penthouse Loft (1 and 2 adults) and Cottage show their festive per night rate from the workbook'), async ({ page }) => {
    test.skip(isPending(standaloneKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    const card = (name: string | RegExp) => page.locator('#rates .room-card').filter({ has: page.getByRole('heading', { level: 3, name }) });
    const penthouse = card(ROOMS.penthouse);
    await expect(penthouse.locator('.rate-row').filter({ hasText: 'Single' }).locator('span:last-child')).toHaveText(
      `KES ${fmt(roomOnly(ROOMS.penthouse, '1 adult', 'peak'))} per night`
    );
    await expect(penthouse.locator('.rate-row').filter({ hasText: 'Double' }).locator('span:last-child')).toHaveText(
      `KES ${fmt(roomOnly(ROOMS.penthouse, '2 adults', 'peak'))} per night`
    );
    await expect(card(ROOMS.cottage).locator('.price-only')).toHaveText(`KES ${fmt(roomOnly(ROOMS.cottage, COTTAGE_GUESTS, 'peak'))} per night`);
  });

  const mealsKey = 'christmas:meals-note';
  test(pendingTitle(mealsKey, 'meal supplements for Penthouse and Cottage guests match the CSVs'), async ({ page }) => {
    test.skip(isPending(mealsKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    const meals = (await page.locator('.meals-note .rate-row').allInnerTexts()).map((m) => m.replace(/\s+/g, ' '));
    expect(meals).toEqual([
      `Breakfast KES ${fmt(breakfastPerAdult())}`,
      `Half Board KES ${fmt(adultSupplement('Half Board'))}`,
      `Full Board KES ${fmt(adultSupplement('Full Board'))}`,
    ]);
  });
});
