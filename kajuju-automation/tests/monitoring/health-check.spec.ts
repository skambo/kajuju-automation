import { test, expect } from '@playwright/test';

const RATE_CARD_URL = 'https://kajuju-automation.vercel.app';

test.describe('Kajuju Rate Card Page — Synthetic Monitor', () => {

  test('page loads successfully', async ({ page }) => {
    await page.goto(RATE_CARD_URL);
    await expect(page).toHaveTitle(/Kajuju/);
  });

  test('page loads in under 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(RATE_CARD_URL);
    const loadTime = Date.now() - startTime;
    console.log(`Page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('WhatsApp CTA button is present and has correct link', async ({ page }) => {
    await page.goto(RATE_CARD_URL);
    const btn = page.locator('[data-testid="whatsapp-cta"]');
    await expect(btn).toBeVisible();
    const href = await btn.getAttribute('href');
    expect(href).toContain('254762004417');
    expect(href).toContain('wa.me');
  });

  test('all three rate toggles are visible', async ({ page }) => {
    await page.goto(RATE_CARD_URL);
    await expect(page.getByText('Weekday (Sun–Thu)')).toBeVisible();
    await expect(page.getByText('Weekend (Fri–Sat)')).toBeVisible();
    await expect(page.getByText('Peak / Festive')).toBeVisible();
  });

  test('rate toggle switches content correctly', async ({ page }) => {
  await page.goto(RATE_CARD_URL);
  await page.getByText('Weekend (Fri–Sat)').click();

  // Scope to the active section only — avoids matching hidden duplicate values
  const activeSection = page.locator('.rate-section.active');
  await expect(activeSection).toBeVisible();
  await expect(activeSection.getByText('KES 11,500').first()).toBeVisible();
});

});
