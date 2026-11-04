import { test, expect } from '@playwright/test';

const BASE_URL = 'https://kajuju-automation.vercel.app';
const HOTELOGIX_URL =
  'https://booking.staygrid.com/webv2/index/home/c/WWhSOTFXNlQvRUhodTdsRDlYNCtKUzZXNjhka3BiZU9ObzJ3dEJTdWhMZDlWVU0yNTQ3WHlRSUt4NjA4QU5lODdYbkZDNkFRZkwrUUlpU1pUUU11UkJJQTBKRzM2a0hkZkRObDcwZ1FaVGRtdm9wNlFQa1pyZ2had3A3SXFwM2s/language/en';

test.describe('Kajuju Rate Card Page — Synthetic Monitor', () => {

  test('rate card page loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Kajuju|Idan/);
  });

  test('rate card page loads in under 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    const loadTime = Date.now() - startTime;
    console.log(`Rate card loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('WhatsApp CTA button is present and has correct link', async ({ page }) => {
    await page.goto(BASE_URL);
    const btn = page.locator('[data-testid="whatsapp-cta"]');
    await expect(btn).toBeVisible();
    const href = await btn.getAttribute('href');
    expect(href).toContain('254762004417');
    expect(href).toContain('wa.me');
  });

  test('all three rate toggles are visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText('Weekday (Sun–Thu)')).toBeVisible();
    await expect(page.getByText('Weekend (Fri–Sat)')).toBeVisible();
    await expect(page.getByText('Peak / Festive')).toBeVisible();
  });

  test('rate toggle switches content correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByText('Weekend (Fri–Sat)').click();
    const activeSection = page.locator('.rate-section.active');
    await expect(activeSection).toBeVisible();
    await expect(activeSection.getByText('KES 11,500').first()).toBeVisible();
  });

  test('workation page loads successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/workation`);
    await expect(page).toHaveTitle(/Workation/);
  });

  test('workation page loads in under 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/workation`);
    const loadTime = Date.now() - startTime;
    console.log(`Workation page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(15000);
  });

  test('workation Book Now button links to booking form', async ({ page }) => {
    await page.goto(`${BASE_URL}/workation`);
    const btn = page.locator('[data-testid="whatsapp-cta"]');
    await expect(btn).toBeVisible();
    const href = await btn.getAttribute('href');
    expect(href).toContain('/book');
  });

  test('booking form page loads successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    await expect(page).toHaveTitle(/Book/);
  });

  test('booking form page loads in under 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/book`);
    const loadTime = Date.now() - startTime;
    console.log(`Booking form loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('home page booking buttons point to the Hotelogix booking engine', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    const nav = page.locator('.nav-links a.nav-book');
    await expect(nav).toBeVisible({ timeout: 10000 });
    await expect(nav).toHaveText('Book Now');
    await expect(nav).toHaveAttribute('href', HOTELOGIX_URL);
    await expect(nav).toHaveAttribute('target', '_blank');
    await expect(nav).toHaveAttribute('rel', /noopener/);
    await expect(nav).toHaveAttribute('rel', /noreferrer/);
  });

  test('navigation links present on pages that share nav.js', async ({ page }) => {
    // /workation and /book still use the shared nav.js, which keeps the old booking link.
    for (const path of ['/workation', '/book']) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('a[href="https://idanbarnsuites.com/hotel-booking"]').first()).toBeVisible({ timeout: 10000 });
    }
  });

});
