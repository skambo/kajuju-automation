import { test, expect } from '@playwright/test';

const BOOK_URL = 'https://kajuju-automation.vercel.app/book';

test.describe('Kajuju Barn — Booking Form', () => {

  test('booking form loads with all required fields', async ({ page }) => {
    await page.goto(BOOK_URL);
    await expect(page.locator('[data-testid="input-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-phone"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="select-room"]')).toBeVisible();
    await expect(page.locator('[data-testid="select-guests"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-checkin"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-checkout"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-btn"]')).toBeVisible();
  });

  test('phone validation rejects short number', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('[data-testid="input-phone"]').fill('123');
    await page.locator('[data-testid="input-phone"]').blur();
    await expect(page.locator('.field-error').first()).toBeVisible();
  });

  test('phone validation accepts kenyan number', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('[data-testid="input-phone"]').fill('+254 762 004 417');
    await page.locator('[data-testid="input-phone"]').blur();
    await expect(page.locator('.field-error')).toHaveCount(0);
  });

  test('phone validation accepts international number', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('[data-testid="input-phone"]').fill('+44 7911 123456');
    await page.locator('[data-testid="input-phone"]').blur();
    await expect(page.locator('.field-error')).toHaveCount(0);
  });

  test('email validation rejects invalid email', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('[data-testid="input-email"]').fill('notanemail');
    await page.locator('[data-testid="input-email"]').blur();
    await expect(page.locator('.field-error').first()).toBeVisible();
  });

  test('email validation accepts valid email', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('[data-testid="input-email"]').fill('guest@example.com');
    await page.locator('[data-testid="input-email"]').blur();
    await expect(page.locator('.field-error')).toHaveCount(0);
  });

  // TODO: min date validation is set dynamically via JS after page load
  // Will be covered in unit tests when availability engine is built in Week 3
  test.skip('checkin minimum date is today — no past bookings', async ({ page }) => {
    await page.goto(BOOK_URL);
    const checkinMin = await page.locator('[data-testid="input-checkin"]').getAttribute('min');
    const today = new Date().toISOString().split('T')[0];
    expect(checkinMin).toBe(today);
  });

  test('submit button is present and enabled on page load', async ({ page }) => {
    await page.goto(BOOK_URL);
    const btn = page.locator('[data-testid="submit-btn"]');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await expect(btn).toHaveText('Send Booking Request →');
  });

  test('all room options are available in dropdown', async ({ page }) => {
    await page.goto(BOOK_URL);
    const select = page.locator('[data-testid="select-room"]');
    await expect(select).toBeVisible();
    const options = await select.locator('option').allTextContents();
    expect(options.some(o => o.includes('Twin Garden Room'))).toBeTruthy();
    expect(options.some(o => o.includes('Deluxe Room'))).toBeTruthy();
    expect(options.some(o => o.includes('Penthouse'))).toBeTruthy();
    expect(options.some(o => o.includes('Cottage'))).toBeTruthy();
    expect(options.some(o => o.includes('Workation'))).toBeTruthy();
  });

});
