import { test, expect } from '../e2e/fixtures';
import { PENDING_REASON, WEBSITE_UPDATE_PENDING, isPending, pendingTitle } from './constants';
import { adultSupplement, breakfastPerAdult, childSupplement, fmt } from './rates-data';

/**
 * Meal plan supplements shown outside the room rate tables: the cafe menu tab, the self catering
 * note, the child meal line, structured data and the enquiry form options.
 * Expected values come from rates-reference/ (adult breakfast is derived from the room CSVs;
 * Half Board and Full Board come from website-only-rates.csv).
 */

test.describe('Rates: meal plan supplements', () => {
  const cafeKey = 'supplements:cafe-menu-headings';
  test(pendingTitle(cafeKey, 'cafe menu: Half Board and Full Board headings state the per adult supplement from the CSV'), async ({ page }) => {
    test.skip(isPending(cafeKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    await page.goto('/?tab=menu');
    const plans = page.getByRole('group', { name: 'Meal plan supplements' });
    // Structure first, so a failure below can only be the price itself.
    await expect(plans.getByRole('heading', { level: 3, name: /^Half Board — KES [\d,]+ per adult$/ })).toBeVisible();
    await expect(plans.getByRole('heading', { level: 3, name: /^Full Board — KES [\d,]+ per adult$/ })).toBeVisible();
    await expect(plans.getByRole('heading', { level: 3, name: `Half Board — KES ${fmt(adultSupplement('Half Board'))} per adult`, exact: true })).toBeVisible();
    await expect(plans.getByRole('heading', { level: 3, name: `Full Board — KES ${fmt(adultSupplement('Full Board'))} per adult`, exact: true })).toBeVisible();
  });

  const selfKey = 'supplements:self-catering-note';
  test(pendingTitle(selfKey, 'self catering note: Breakfast, Half Board and Full Board adult supplements match the CSVs'), async ({ page }) => {
    test.skip(isPending(selfKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    await page.goto('/');
    const note = page.locator('.self-cater-meals');
    await expect(note).toHaveCount(1);
    await expect(note).toContainText(
      `Breakfast KES ${fmt(breakfastPerAdult())} | Half Board KES ${fmt(adultSupplement('Half Board'))} | Full Board KES ${fmt(adultSupplement('Full Board'))}`
    );
  });

  const childKey = 'supplements:child-meals';
  test(pendingTitle(childKey, 'child meals (ages 4 to 11): Breakfast, Half Board and Full Board prices match the CSV'), async ({ page }) => {
    test.skip(isPending(childKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    await page.goto('/');
    const line = page.locator('span', { hasText: 'Meal plans for children aged 4 to 11' });
    await expect(line).toHaveCount(1);
    await expect(line).toContainText(
      `(Breakfast KES ${fmt(childSupplement('Breakfast'))}, Half Board KES ${fmt(childSupplement('Half Board'))}, Full Board KES ${fmt(childSupplement('Full Board'))})`
    );
  });

  const ldKey = 'supplements:structured-data-breakfast';
  test(pendingTitle(ldKey, 'structured data: the breakfast add-on offer price matches the derived adult breakfast'), async ({ page }) => {
    test.skip(isPending(ldKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    await page.goto('/');
    const blocks = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    const offers: Array<{ name?: string; priceSpecification?: { price?: number } }> = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === 'object') {
        const o = node as Record<string, unknown>;
        if (o['@type'] === 'Offer') offers.push(o as { name?: string });
        Object.values(o).forEach(walk);
      }
    };
    for (const b of blocks) walk(JSON.parse(b));
    const breakfast = offers.filter((o) => /breakfast add-on/i.test(o.name ?? ''));
    expect(breakfast, 'breakfast add-on offers in the structured data').toHaveLength(1);
    expect(breakfast[0].priceSpecification?.price).toBe(breakfastPerAdult());
  });

  const formKey = 'supplements:enquiry-form-options';
  test(pendingTitle(formKey, 'enquiry form: Half Board and Full Board options state the supplement from the CSV'), async ({ page }) => {
    test.skip(isPending(formKey) && WEBSITE_UPDATE_PENDING, PENDING_REASON);
    await page.goto('/book');
    const meal = page.getByTestId('select-meal');
    await expect(meal.locator('option', { hasText: /^Half Board/ })).toHaveText(new RegExp(`\\(\\+KES ${fmt(adultSupplement('Half Board'))}/person/day\\)$`));
    await expect(meal.locator('option', { hasText: /^Full Board/ })).toHaveText(new RegExp(`\\(\\+KES ${fmt(adultSupplement('Full Board'))}/person/day\\)$`));
  });
});
