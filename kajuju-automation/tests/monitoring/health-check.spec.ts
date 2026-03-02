import { test, expect } from '@playwright/test';

test.describe('Kajuju Rate Card Page — Synthetic Monitor', () => {

  test('page loads successfully', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('https://www.idanbarnsuites.com');

    const loadTime = Date.now() - startTime;

    console.log(`Page loaded in ${loadTime}ms`);

    await expect(page).toHaveTitle(/.+/);
  });

  test('page loads in under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('https://www.idanbarnsuites.com');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

});
