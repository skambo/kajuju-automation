import * as dotenv from 'dotenv';
dotenv.config();

import { test, expect } from '@playwright/test';
import { ALL_PERIODS, PERIOD_BUTTON_LABEL, RatePeriod, RatesPage } from './pages/rates.page';

const TWIN_GARDEN = 'Twin Garden Room';
const DELUXE = 'Deluxe Room with Balcony';

type RateEntry = { kes: string; usd: string };
type RoomRates = Record<string, RateEntry>;

const RATES: Record<RatePeriod, Record<string, RoomRates>> = {
  weekday: {
    [TWIN_GARDEN]: {
      'Single B&B': { kes: 'Ksh 9,000', usd: '~$69' },
      'Double B&B': { kes: 'Ksh 10,500', usd: '~$81' },
      'Single H/B': { kes: 'Ksh 11,000', usd: '~$85' },
      'Double H/B': { kes: 'Ksh 14,000', usd: '~$108' },
    },
    [DELUXE]: {
      'Single B&B': { kes: 'Ksh 10,500', usd: '~$81' },
      'Double B&B': { kes: 'Ksh 11,500', usd: '~$88' },
      'Single H/B': { kes: 'Ksh 12,500', usd: '~$96' },
      'Double H/B': { kes: 'Ksh 15,000', usd: '~$115' },
    },
  },
  weekend: {
    [TWIN_GARDEN]: {
      'Single B&B': { kes: 'Ksh 10,000', usd: '~$77' },
      'Double B&B': { kes: 'Ksh 11,500', usd: '~$88' },
      'Single H/B': { kes: 'Ksh 12,000', usd: '~$92' },
      'Double H/B': { kes: 'Ksh 15,000', usd: '~$115' },
    },
    [DELUXE]: {
      'Single B&B': { kes: 'Ksh 11,500', usd: '~$88' },
      'Double B&B': { kes: 'Ksh 13,000', usd: '~$100' },
      'Single H/B': { kes: 'Ksh 13,500', usd: '~$104' },
      'Double H/B': { kes: 'Ksh 16,500', usd: '~$127' },
    },
  },
  peak: {
    [TWIN_GARDEN]: {
      'Single B&B': { kes: 'Ksh 11,500', usd: '~$88' },
      'Double B&B': { kes: 'Ksh 13,000', usd: '~$100' },
      'Single H/B': { kes: 'Ksh 13,500', usd: '~$104' },
      'Double H/B': { kes: 'Ksh 16,500', usd: '~$127' },
    },
    [DELUXE]: {
      'Single B&B': { kes: 'Ksh 13,000', usd: '~$100' },
      'Double B&B': { kes: 'Ksh 14,500', usd: '~$112' },
      'Single H/B': { kes: 'Ksh 15,000', usd: '~$115' },
      'Double H/B': { kes: 'Ksh 18,000', usd: '~$138' },
    },
  },
};

const SELF_CATERING_ROOMS = ['Penthouse Loft', 'Cottage', 'Barn House Buyout'];

let ratesPage: RatesPage;

test.describe('Rates page — period toggle', () => {
  test.beforeEach(async ({ page }) => {
    ratesPage = new RatesPage(page);
    await ratesPage.goto();
  });

  test.describe('positive', () => {
    test('1. Weekday is the default active period on load', async () => {
      await expect(ratesPage.periodButton('weekday')).toHaveClass(/active/);
      await expect(ratesPage.section('weekday')).toHaveClass(/active/);
      await expect(ratesPage.activeSection()).toHaveAttribute('id', 'offpeak-wd');
    });

    test('2. selecting Weekend updates Twin Garden and Deluxe prices', async () => {
      await ratesPage.selectPeriod('weekend');
      for (const room of [TWIN_GARDEN, DELUXE]) {
        for (const [label, { kes, usd }] of Object.entries(RATES.weekend[room])) {
          await expect(ratesPage.roomRate('weekend', room, label)).toHaveText(`${kes} ${usd}`);
        }
      }
    });

    test('3. selecting Peak updates Twin Garden and Deluxe prices', async () => {
      await ratesPage.selectPeriod('peak');
      for (const room of [TWIN_GARDEN, DELUXE]) {
        for (const [label, { kes, usd }] of Object.entries(RATES.peak[room])) {
          await expect(ratesPage.roomRate('peak', room, label)).toHaveText(`${kes} ${usd}`);
        }
      }
    });

    test('4. only one toggle button is active at a time', async () => {
      for (const period of ALL_PERIODS) {
        await ratesPage.selectPeriod(period);
        await expect(ratesPage.activeToggleButton()).toHaveCount(1);
        await expect(ratesPage.activeSection()).toHaveCount(1);
        await expect(ratesPage.activeToggleButton()).toHaveText(PERIOD_BUTTON_LABEL[period]);
      }
    });

    test('5. switching back to Weekday restores the original prices exactly', async () => {
      await ratesPage.selectPeriod('weekend');
      await ratesPage.selectPeriod('weekday');
      for (const room of [TWIN_GARDEN, DELUXE]) {
        for (const [label, { kes, usd }] of Object.entries(RATES.weekday[room])) {
          await expect(ratesPage.roomRate('weekday', room, label)).toHaveText(`${kes} ${usd}`);
        }
      }
    });

    test('6. cycling Weekday -> Weekend -> Peak -> Weekday returns identical values (no drift)', async () => {
      const before = await ratesPage.roomRate('weekday', TWIN_GARDEN, 'Double H/B').textContent();
      await ratesPage.selectPeriod('weekend');
      await ratesPage.selectPeriod('peak');
      await ratesPage.selectPeriod('weekday');
      await expect(ratesPage.roomRate('weekday', TWIN_GARDEN, 'Double H/B')).toHaveText(before ?? '');
    });

    test('7. self-catering rooms show unchanged pricing regardless of the toggle', async () => {
      const baseline = new Map<string, string>();
      for (const room of SELF_CATERING_ROOMS) {
        baseline.set(room, await ratesPage.selfCateringRoomCard(room).innerText());
      }
      for (const period of ['weekend', 'peak'] as const) {
        await ratesPage.selectPeriod(period);
        for (const room of SELF_CATERING_ROOMS) {
          expect(await ratesPage.selfCateringRoomCard(room).innerText()).toBe(baseline.get(room));
        }
      }
    });

    test('8. the active toggle button has a visually distinct style from inactive ones', async () => {
      const [activeColor, inactiveColor] = await Promise.all([
        ratesPage.activeToggleButton().evaluate((el) => (globalThis as any).getComputedStyle(el).backgroundColor),
        ratesPage.periodButton('weekend').evaluate((el) => (globalThis as any).getComputedStyle(el).backgroundColor),
      ]);
      expect(activeColor).not.toBe(inactiveColor);
    });

    test('9. USD approximations move in sync with KES at each period', async () => {
      for (const period of ALL_PERIODS) {
        await ratesPage.selectPeriod(period);
        for (const room of [TWIN_GARDEN, DELUXE]) {
          for (const [label, { usd }] of Object.entries(RATES[period][room])) {
            await expect(ratesPage.roomRateUsd(period, room, label)).toHaveText(usd);
          }
        }
      }
    });
  });

  test.describe('negative / edge', () => {
    test('1. [regression] description and amenity tags remain visible in all three toggle states', async () => {
      test.fail(
        true,
        'Known bug: the description paragraph and amenity-tag pills for Twin Garden Room and Deluxe Room ' +
          'are genuinely absent from the static markup for Weekend/Peak (confirmed via page source, not just ' +
          'a rendering issue). See "Known bug found during exploration" in rates-period-toggle.plan.md. ' +
          'Remove this test.fail() once the missing markup is added.'
      );
      for (const period of ALL_PERIODS) {
        await ratesPage.selectPeriod(period);
        for (const room of [TWIN_GARDEN, DELUXE]) {
          await expect(ratesPage.roomDescription(period, room)).toBeVisible();
          await expect(ratesPage.roomDescription(period, room)).not.toBeEmpty();
          await expect(ratesPage.roomChips(period, room)).not.toHaveCount(0);
        }
      }
    });

    test('2. rapid switching and double-clicks do not leave inconsistent state', async () => {
      await ratesPage.periodButton('weekend').click();
      await ratesPage.periodButton('peak').click();
      await expect(ratesPage.activeToggleButton()).toHaveCount(1);
      await expect(ratesPage.activeSection()).toHaveCount(1);
      await expect(ratesPage.activeToggleButton()).toHaveText('Peak / Festive');
      await expect(ratesPage.roomRate('peak', TWIN_GARDEN, 'Single B&B')).toHaveText(
        `${RATES.peak[TWIN_GARDEN]['Single B&B'].kes} ${RATES.peak[TWIN_GARDEN]['Single B&B'].usd}`
      );

      await ratesPage.periodButton('weekend').dblclick();
      await expect(ratesPage.activeToggleButton()).toHaveCount(1);
      await expect(ratesPage.activeSection()).toHaveCount(1);
      await expect(ratesPage.activeToggleButton()).toHaveText('Weekend (Fri–Sat)');
      await expect(ratesPage.roomRate('weekend', TWIN_GARDEN, 'Single B&B')).toHaveText(
        `${RATES.weekend[TWIN_GARDEN]['Single B&B'].kes} ${RATES.weekend[TWIN_GARDEN]['Single B&B'].usd}`
      );
    });

    test('3. clicking the already-active toggle button is a no-op', async () => {
      const before = await ratesPage.activeSection().innerHTML();
      await ratesPage.selectPeriod('weekday');
      await expect(ratesPage.activeSection()).toHaveCount(1);
      const after = await ratesPage.activeSection().innerHTML();
      expect(after).toBe(before);
    });

    test('4. reloading after selecting Weekend or Peak resets to Weekday', async () => {
      await ratesPage.selectPeriod('peak');
      await ratesPage.reload();
      await expect(ratesPage.periodButton('weekday')).toHaveClass(/active/);
      await expect(ratesPage.section('weekday')).toHaveClass(/active/);
      await expect(ratesPage.roomRate('weekday', TWIN_GARDEN, 'Single B&B')).toHaveText(
        `${RATES.weekday[TWIN_GARDEN]['Single B&B'].kes} ${RATES.weekday[TWIN_GARDEN]['Single B&B'].usd}`
      );
      await expect(ratesPage.roomDescription('weekday', TWIN_GARDEN)).toBeVisible();
      await expect(ratesPage.roomDescription('weekday', TWIN_GARDEN)).not.toBeEmpty();
    });

    test('5. toggle buttons are operable via keyboard', async ({ page }) => {
      await ratesPage.periodButton('weekend').focus();
      await expect(ratesPage.periodButton('weekend')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(ratesPage.section('weekend')).toHaveClass(/active/);

      await ratesPage.periodButton('peak').focus();
      await expect(ratesPage.periodButton('peak')).toBeFocused();
      await page.keyboard.press(' ');
      await expect(ratesPage.section('peak')).toHaveClass(/active/);
    });

    test('6. [accessibility] active toggle button exposes state via aria-pressed', async () => {
      test.fail(
        true,
        'Known gap: toggle buttons carry no aria-pressed (or other programmatic state) — only the visual ' +
          '.active class. See negative case 6 in rates-period-toggle.plan.md.'
      );
      await expect(ratesPage.activeToggleButton()).toHaveAttribute('aria-pressed', 'true');
    });

    test.skip('7. toggle interaction introduces no new console errors or failed requests', async () => {
      // TEMPORARILY SKIPPED: intermittent failure under investigation — see [issue/note link].
      // Failing ~2/30+ runs with a single unidentified failed request. Un-skip once root cause is confirmed.
      ratesPage.startMonitoring();
      for (const period of ALL_PERIODS) {
        await ratesPage.selectPeriod(period);
      }
      expect(ratesPage.consoleErrors()).toHaveLength(0);
      expect(ratesPage.failedNetworkRequests()).toHaveLength(0);
    });

    test('8. toggle buttons remain usable at a narrow/mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      for (const period of ALL_PERIODS) {
        await expect(ratesPage.periodButton(period)).toBeVisible();
      }
      await ratesPage.selectPeriod('weekend');
      await expect(ratesPage.section('weekend')).toHaveClass(/active/);
    });
  });
});
