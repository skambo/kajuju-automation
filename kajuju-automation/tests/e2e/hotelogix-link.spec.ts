import * as dotenv from 'dotenv';
dotenv.config();

import { test, expect } from '@playwright/test';

const HOTELOGIX_URL =
  'https://booking.staygrid.com/webv2/index/home/c/WWhSOTFXNlQvRUhodTdsRDlYNCtKUzZXNjhka3BiZU9ObzJ3dEJTdWhMZDlWVU0yNTQ3WHlRSUt4NjA4QU5lODdYbkZDNkFRZkwrUUlpU1pUUU11UkJJQTBKRzM2a0hkZkRObDcwZ1FaVGRtdm9wNlFQa1pyZ2had3A3SXFwM2s/language/en';

function pageUrl(path: string): string {
  const base = process.env.BASE_URL;
  if (!base) throw new Error('BASE_URL environment variable is required (set it in .env).');
  return `${base.replace(/\/$/, '')}${path}`;
}

// Hotelogix rejects visitors whose Referer is not idanbarnsuites.com (error EIUA),
// so every booking link must send no Referer.
for (const [name, path, expected] of [
  ['homepage', '/', 4],
  ['Christmas page', '/christmas-2026/', 5],
] as const) {
  test.describe(`Hotelogix links: ${name}`, () => {
    test('every booking link has the exact URL and sends no Referer', async ({ page }) => {
      await page.goto(pageUrl(path));
      const links = page.locator('[data-hotelogix]');
      await expect(links).toHaveCount(expected);
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute('href', HOTELOGIX_URL);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener/);
        await expect(link).toHaveAttribute('rel', /noreferrer/);
        await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
      }
    });

    test('non Hotelogix links are untouched', async ({ page }) => {
      await page.goto(pageUrl(path));
      const wa = page.locator('[data-whatsapp]').first();
      await expect(wa).not.toHaveAttribute('referrerpolicy', /.*/);
    });
  });
}

// If this fails while the site tests above pass, the problem is on the Hotelogix side
// (their booking engine is returning its error page), not in our website.
test('HOTELOGIX SIDE: booking URL with no Referer does not end on the error page', async ({ request }) => {
  const res = await request.get(HOTELOGIX_URL);
  expect(
    res.url(),
    'Hotelogix returned its error page for our booking URL. This is a Hotelogix service or configuration problem, not a website problem.'
  ).not.toContain('/error/index/ec/');
  expect(res.status()).toBe(200);
});
