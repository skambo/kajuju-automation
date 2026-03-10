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

  test('checkout date auto-sets to 2 nights after checkin', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('[data-testid="input-checkin"]').fill('2026-04-10');
    await page.locator('[data-testid="input-checkin"]').dispatchEvent('change');
    const checkout = await page.locator('[data-testid="input-checkout"]').inputValue();
    expect(checkout).toBe('2026-04-12');
  });

  test('submit button is disabled while submitting', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('[data-testid="input-name"]').fill('Test Guest');
    await page.locator('[data-testid="input-phone"]').fill('+254 762 004 417');
    await page.locator('[data-testid="input-email"]').fill('test@example.com');
    await page.locator('[data-testid="select-room"]').selectOption('Twin Garden Room — B&B');
    await page.locator('[data-testid="select-guests"]').selectOption('2 guests');
    await page.locator('[data-testid="input-checkin"]').fill('2026-04-10');
    await page.locator('[data-testid="input-checkout"]').fill('2026-04-12');
    await page.locator('[data-testid="submit-btn"]').click();
    await expect(page.locator('[data-testid="submit-btn"]')).toBeDisabled();
  });

});
