import * as dotenv from 'dotenv';
dotenv.config();

import { test, expect } from '@playwright/test';

const HOTELOGIX_URL =
  'https://booking.staygrid.com/webv2/index/home/c/WWhSOTFXNlQvRUhodTdsRDlYNCtKUzZXNjhka3BiZU9ObzJ3dEJTdWhMZDlWVU0yNTQ3WHlRSUt4NjA4QU5lODdYbkZDNkFRZkwrUUlpU1pUUU11UkJJQTBKRzM2a0hkZkRObDcwZ1FaVGRtdm9wNlFQa1pyZ2had3A3SXFwM2s/language/en';
const OG_IMAGE = 'https://rates.idanbarnsuites.com/images/social/christmas-2026-og.jpg';

// Read lazily so the dotenv call above has run first (see rates.page.ts).
function christmasUrl(): string {
  const base = process.env.BASE_URL;
  if (!base) throw new Error('BASE_URL environment variable is required to run the Christmas page tests (set it in .env).');
  return `${base.replace(/\/$/, '')}/christmas-2026/`;
}

test.describe('Christmas page: /christmas-2026/', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(christmasUrl());
  });

  test('1. page loads with the Christmas headline and title', async ({ page }) => {
    await expect(page).toHaveTitle(/Christmas at the Barn/);
    await expect(page.getByRole('heading', { level: 1, name: 'Christmas at the Barn' })).toBeVisible();
  });

  test('2. every booking button points to the Hotelogix link and opens in a new tab', async ({ page }) => {
    const buttons = page.locator('[data-hotelogix]');
    await expect(buttons).not.toHaveCount(0);
    for (const button of await buttons.all()) {
      await expect(button).toHaveAttribute('href', HOTELOGIX_URL);
      await expect(button).toHaveAttribute('target', '_blank');
      await expect(button).toHaveAttribute('rel', /noopener/);
      await expect(button).toHaveAttribute('rel', /noreferrer/);
      await expect(button).toHaveAttribute('referrerpolicy', 'no-referrer');
    }
    await expect(page.getByRole('link', { name: 'Check Festive Availability & Book' }).first()).toBeVisible();
  });

  test('3. WhatsApp link goes to wa.me with the Christmas message', async ({ page }) => {
    const wa = page.locator('[data-testid="whatsapp-cta"]');
    await expect(wa).toBeVisible();
    const href = (await wa.getAttribute('href')) ?? '';
    expect(href).toContain('https://wa.me/254762004417');
    expect(decodeURIComponent(href)).toContain("Hello, I'd like to enquire about Christmas at Idan Barn Suites.");
  });

  test('4. social preview tags exist with absolute URLs', async ({ page }) => {
    const meta = (selector: string) => page.locator(selector).getAttribute('content');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/^https:\/\/rates\.idanbarnsuites\.com\/christmas-2026/);
    expect(await meta('meta[name="description"]')).toBeTruthy();
    expect(await meta('meta[property="og:title"]')).toContain('Christmas at the Barn');
    expect(await meta('meta[property="og:description"]')).toBeTruthy();
    expect(await meta('meta[property="og:image"]')).toBe(OG_IMAGE);
    expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(await meta('meta[name="twitter:image"]')).toBe(OG_IMAGE);
  });

  test('5. every image on the page loads', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    const broken = await page.$$eval('img', (imgs) =>
      (imgs as HTMLImageElement[]).filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src)
    );
    expect(broken).toEqual([]);
  });
  test('6. festive dates and minimum stay show near the top, sections are in the agreed order, and a phone link exists', async ({ page }) => {
    const facts = page.locator('.facts');
    await expect(facts).toContainText('19 December 2026 to 3 January 2027');
    await expect(facts).toContainText('2 nights');
    await expect(facts).toContainText('3 nights');
    const ids = await page.$$eval('header, section', (els) => els.map((e) => e.id || e.tagName.toLowerCase()));
    expect(ids).toEqual(['header', 'why', 'gallery', 'rates', 'dining', 'book', 'good-to-know']);
    await expect(page.locator('#property')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '← Back to Rates & Packages' })).toHaveAttribute('href', '/');
    await expect(page.locator('.nav-book')).toHaveText('Book Now');
    await expect(page.locator('a[href="tel:+254762004417"]').last()).toBeVisible();
  });
});
