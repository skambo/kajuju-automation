import { test, expect } from '../e2e/fixtures';
import { ALL_PERIODS, RatePeriod, RatesPage } from '../e2e/pages/rates.page';
import { PENDING_REASON, WEBSITE_UPDATE_PENDING, isPending, pendingTitle } from './constants';
import { ROOMS, escapeRe, fmt, mealPlanTotal, withBreakfast, Period } from './rates-data';

/**
 * Twin Garden Room and Deluxe Room with Balcony: prices behind the "travel period" toggle.
 * Every expected value comes from the CSVs in rates-reference/ (see rates-data.ts).
 */

const TOGGLED_ROOMS = [ROOMS.twin, ROOMS.deluxe];
const PERIOD_NAME: Record<RatePeriod, string> = { weekday: 'Sun–Thu', weekend: 'Fri–Sat', peak: 'Festive' };

type PlanRow = { id: string; name: string; labels: [single: string, double: string]; total: (room: string, adults: 1 | 2, period: Period) => number };
const PLANS: PlanRow[] = [
  { id: 'bb', name: 'Bed & Breakfast', labels: ['Single B&B', 'Double B&B'], total: (room, adults, period) => withBreakfast(room, adults === 1 ? '1 guest' : '2 guests', period) },
  { id: 'hb', name: 'Half Board', labels: ['Single H/B', 'Double H/B'], total: (room, adults, period) => mealPlanTotal(room, adults, 'Half Board', period) },
  { id: 'fb', name: 'Full Board', labels: ['Single FB', 'Double FB'], total: (room, adults, period) => mealPlanTotal(room, adults, 'Full Board', period) },
];

const amountStartsWith = (kes: number) => new RegExp(`^Ksh ${escapeRe(fmt(kes))}\\s`);

async function showPeriod(rates: RatesPage, period: RatePeriod, room: string) {
  await rates.periodButton(period).click();
  await expect(rates.periodButton(period)).toHaveAttribute('aria-pressed', 'true');
  await expect(rates.panel(period, room)).toHaveClass(/active/);
}

test.describe('Rates: toggled rooms', () => {
  let rates: RatesPage;
  test.beforeEach(async ({ page }) => {
    rates = new RatesPage(page);
    await page.goto('/');
  });

  for (const room of TOGGLED_ROOMS) {
    for (const period of ALL_PERIODS) {
      for (const plan of PLANS) {
        const key = `toggled:${room}:${period}:${plan.id}`;
        test(pendingTitle(key, `${room}, ${PERIOD_NAME[period]}: ${plan.name} single and double rates match the workbook`), async () => {
          test.skip(isPending(key) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
          await showPeriod(rates, period, room);
          for (const [i, label] of plan.labels.entries()) {
            const adults = (i + 1) as 1 | 2;
            await expect(rates.roomRate(period, room, label), `${room} ${label} (${period})`).toHaveText(amountStartsWith(plan.total(room, adults, period)));
          }
        });
      }
    }

    const restoreKey = `toggled:${room}:restore-weekday`;
    test(pendingTitle(restoreKey, `${room}: switching back to Weekday restores the workbook weekday B&B rates`), async () => {
      test.skip(isPending(restoreKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
      await showPeriod(rates, 'weekend', room);
      await showPeriod(rates, 'weekday', room);
      for (const [i, label] of PLANS[0].labels.entries()) {
        await expect(rates.roomRate('weekday', room, label)).toHaveText(amountStartsWith(PLANS[0].total(room, (i + 1) as 1 | 2, 'weekday')));
      }
    });
  }

  test('rapid switching ends on the last period selected, showing that period\'s workbook rate', async () => {
    const room = ROOMS.twin;
    await rates.periodButton('weekend').click();
    await rates.periodButton('peak').click();
    await showPeriod(rates, 'peak', room);
    await expect(rates.roomRate('peak', room, 'Single B&B')).toHaveText(amountStartsWith(PLANS[0].total(room, 1, 'peak')));

    await rates.periodButton('weekend').dblclick();
    await showPeriod(rates, 'weekend', room);
    await expect(rates.roomRate('weekend', room, 'Single B&B')).toHaveText(amountStartsWith(PLANS[0].total(room, 1, 'weekend')));
  });

  test('reloading after choosing Peak lands on Weekday with the workbook weekday rate', async ({ page }) => {
    const room = ROOMS.twin;
    await showPeriod(rates, 'peak', room);
    await page.reload();
    await expect(rates.periodButton('weekday')).toHaveAttribute('aria-pressed', 'true');
    await expect(rates.roomRate('weekday', room, 'Single B&B')).toHaveText(amountStartsWith(PLANS[0].total(room, 1, 'weekday')));
  });
});
