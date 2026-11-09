import { test, expect } from './fixtures';
import { ALL_PERIODS, PERIOD_BUTTON_LABEL, RatesPage } from './pages/rates.page';

const TWIN_GARDEN = 'Twin Garden Room';
const DELUXE = 'Deluxe Room with Balcony';

// Prices are checked against the workbook CSVs in tests/rates (npm run test:rates).
// The tests here cover the toggle's behaviour and state only.

const SELF_CATERING_ROOMS = ['Penthouse Loft', 'Cottage', 'Barn House Buyout'];

test.describe('Rates page: period toggle', () => {
  let rates: RatesPage;
  test.beforeEach(async ({ page }) => {
    rates = new RatesPage(page);
    await page.goto('/');
  });

  test('Weekday is the default active period on load', async () => {
    await expect(rates.periodButton('weekday')).toHaveClass(/active/);
    await expect(rates.activePanels()).toHaveCount(2);
    await expect(rates.panel('weekday', TWIN_GARDEN)).toHaveClass(/active/);
    await expect(rates.panel('weekday', DELUXE)).toHaveClass(/active/);
  });

  test('only one toggle button is active at a time and its panels match', async () => {
    for (const period of ALL_PERIODS) {
      await rates.periodButton(period).click();
      await expect(rates.activeToggleButton()).toHaveCount(1);
      await expect(rates.activePanels()).toHaveCount(2); // one per toggled room
      await expect(rates.activeToggleButton()).toHaveText(PERIOD_BUTTON_LABEL[period]);
    }
  });

  test('cycling Weekday, Weekend, Peak, Weekday returns identical values (no drift)', async () => {
    const before = await rates.roomRate('weekday', TWIN_GARDEN, 'Double H/B').textContent();
    expect(before, 'weekday rate text before cycling').toBeTruthy();
    for (const period of ['weekend', 'peak', 'weekday'] as const) await rates.periodButton(period).click();
    await expect(rates.roomRate('weekday', TWIN_GARDEN, 'Double H/B')).toHaveText(before as string);
  });

  test('self-catering cards are unchanged by the toggle', async () => {
    const baseline = new Map<string, string>();
    for (const room of SELF_CATERING_ROOMS) {
      baseline.set(room, await rates.selfCateringRoomCard(room).innerText());
    }
    for (const period of ['weekend', 'peak'] as const) {
      await rates.periodButton(period).click();
      await expect(rates.activeToggleButton()).toHaveText(PERIOD_BUTTON_LABEL[period]);
      for (const room of SELF_CATERING_ROOMS) {
        await expect.poll(() => rates.selfCateringRoomCard(room).innerText(), { message: room }).toBe(baseline.get(room));
      }
    }
  });

  test('rapid switching and double-clicks leave exactly one consistent active state', async () => {
    await rates.periodButton('weekend').click();
    await rates.periodButton('peak').click();
    await expect(rates.activeToggleButton()).toHaveCount(1);
    await expect(rates.activePanels()).toHaveCount(2);
    await expect(rates.activeToggleButton()).toHaveText(PERIOD_BUTTON_LABEL.peak);

    await rates.periodButton('weekend').dblclick();
    await expect(rates.activeToggleButton()).toHaveCount(1);
    await expect(rates.activePanels()).toHaveCount(2);
    await expect(rates.activeToggleButton()).toHaveText(PERIOD_BUTTON_LABEL.weekend);
  });

  test('clicking the already-active toggle button changes nothing', async () => {
    const before = await rates.activePanels().evaluateAll((els) => els.map((e) => e.innerHTML));
    await rates.periodButton('weekday').click();
    await expect(rates.activePanels()).toHaveCount(2);
    const after = await rates.activePanels().evaluateAll((els) => els.map((e) => e.innerHTML));
    expect(after).toEqual(before);
  });

  test('reloading after choosing Peak resets to Weekday with the room description intact', async ({ page }) => {
    await rates.periodButton('peak').click();
    await page.reload();
    await expect(rates.periodButton('weekday')).toHaveClass(/active/);
    await expect(rates.panel('weekday', TWIN_GARDEN)).toHaveClass(/active/);
    await expect(rates.roomDescription(TWIN_GARDEN)).toBeVisible();
    await expect(rates.roomDescription(TWIN_GARDEN)).not.toBeEmpty();
  });

  test('toggle buttons are operable by keyboard (Enter and Space)', async ({ page }) => {
    await rates.periodButton('weekend').focus();
    await expect(rates.periodButton('weekend')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(rates.panel('weekend', TWIN_GARDEN)).toHaveClass(/active/);

    await rates.periodButton('peak').focus();
    await expect(rates.periodButton('peak')).toBeFocused();
    await page.keyboard.press(' ');
    await expect(rates.panel('peak', TWIN_GARDEN)).toHaveClass(/active/);
  });

  test('[accessibility] the selected button exposes its state through aria-pressed', async ({ page }) => {
    for (const period of ALL_PERIODS) {
      await rates.periodButton(period).click();
      await expect(rates.activeToggleButton()).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.rate-toggle button[aria-pressed="true"]')).toHaveCount(1);
    }
  });

  test('toggling introduces no console errors or failed requests', async () => {
    // Analytics requests are stubbed in fixtures.ts, which removed an old intermittent failure.
    rates.startMonitoring();
    for (const period of ALL_PERIODS) {
      await rates.periodButton(period).click();
      await expect(rates.activeToggleButton()).toHaveText(PERIOD_BUTTON_LABEL[period]);
    }
    expect(rates.consoleErrors()).toHaveLength(0);
    expect(rates.failedNetworkRequests()).toHaveLength(0);
  });

  test('toggle buttons remain usable at a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const period of ALL_PERIODS) {
      await expect(rates.periodButton(period)).toBeVisible();
    }
    await rates.periodButton('weekend').click();
    await expect(rates.panel('weekend', TWIN_GARDEN)).toHaveClass(/active/);
  });
});
