import { test, expect } from '../e2e/fixtures';
import { ALL_PERIODS, PERIOD_BUTTON_LABEL, RatesPage } from '../e2e/pages/rates.page';
import { BOOKING_URL } from '../support/site';
import { checkWhatsAppLink } from '../support/links';

/**
 * Synthetic uptime checks for the public site. Read only, and independent of the gitignored rate CSVs:
 * these confirm the pages load and the key controls work. Prices are checked in tests/rates.
 * Load time is not asserted: it depends on the live host and the network, not on our code.
 */

test.describe('Rate card site: synthetic monitor', () => {
  test('rate card page loads', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.trim(), 'page title').not.toBe('');
    expect(title.length, 'page title length').toBeGreaterThanOrEqual(10);
    expect(title.length, 'page title length').toBeLessThanOrEqual(70);
  });

  test('WhatsApp CTA is visible and links to a well formed wa.me URL', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByTestId('whatsapp-cta');
    await expect(cta).toBeVisible();
    expect(checkWhatsAppLink((await cta.getAttribute('href')) ?? '').problems, 'WhatsApp link structure').toEqual([]);
  });

  test('all three rate period buttons are visible', async ({ page }) => {
    await page.goto('/');
    const rates = new RatesPage(page);
    for (const period of ALL_PERIODS) {
      await expect(rates.periodButton(period)).toBeVisible();
    }
  });

  test('choosing Weekend makes the weekend panels the active ones', async ({ page }) => {
    await page.goto('/');
    const rates = new RatesPage(page);
    await rates.periodButton('weekend').click();
    await expect(rates.activeToggleButton()).toHaveText(PERIOD_BUTTON_LABEL.weekend);
    await expect(rates.activePanels()).toHaveCount(2);
    await expect(rates.panels('weekend').and(page.locator('.active'))).toHaveCount(2);
    await expect(rates.panels('weekday').and(page.locator('.active'))).toHaveCount(0);
  });

  test('workation page loads', async ({ page }) => {
    await page.goto('/workation');
    await expect(page).toHaveTitle(/Workation/);
  });

  test('workation Book Now button links to the enquiry form', async ({ page }) => {
    await page.goto('/workation');
    const cta = page.getByTestId('whatsapp-cta');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /\/book/);
  });

  test('enquiry form page loads', async ({ page }) => {
    await page.goto('/book');
    await expect(page).toHaveTitle(/Book/);
  });

  test('home page Book Now button points to the temporary /book page', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('.nav-links a.nav-book');
    await expect(nav).toBeVisible();
    await expect(nav).toHaveText('Book Now');
    await expect(nav).toHaveAttribute('href', BOOKING_URL); // TEMP-BOOKING: restore HOTELOGIX_URL
    await expect(nav).toHaveAttribute('target', '_blank');
    await expect(nav).toHaveAttribute('rel', /noopener/);
    // await expect(nav).toHaveAttribute('rel', /noreferrer/);
  });
});
