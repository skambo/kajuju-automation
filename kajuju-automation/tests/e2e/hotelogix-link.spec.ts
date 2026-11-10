import { test, expect } from './fixtures';
import { BOOKING_URL, HOTELOGIX_URL } from '../support/site';
import { checkWhatsAppLink } from '../support/links';

// Hotelogix rejects visitors whose Referer is not the hotel's own domain (error EIUA),
// so every booking link must send no Referer.
for (const [name, path, expected] of [
  ['homepage', '/', 4],
  ['Christmas page', '/christmas-2026/', 4],
] as const) {
  test.describe(`Hotelogix links: ${name}`, () => {
    test('every booking link has the exact URL and sends no Referer', async ({ page }) => {
      await page.goto(path);
      const links = page.locator('[data-hotelogix]');
      await expect(links).toHaveCount(expected);
      for (const link of await links.all()) {
        // TEMP-BOOKING: restore HOTELOGIX_URL and the noreferrer assertions when Hotelogix is back.
        await expect(link).toHaveAttribute('href', BOOKING_URL);
        await expect(link).not.toHaveAttribute('href', /staygrid/);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener/);
        // await expect(link).toHaveAttribute('rel', /noreferrer/);
        // await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
      }
    });

    test('WhatsApp links are untouched by the Hotelogix rules and well formed', async ({ page }) => {
      await page.goto(path);
      const links = page.locator('[data-whatsapp]');
      await expect(links).not.toHaveCount(0);
      for (const wa of await links.all()) {
        await expect(wa).not.toHaveAttribute('referrerpolicy', /.*/);
        expect(checkWhatsAppLink((await wa.getAttribute('href')) ?? '').problems, 'WhatsApp link structure').toEqual([]);
      }
    });
  });
}

// If this fails while the site tests above pass, the problem is on the Hotelogix side
// (their booking engine is returning its error page), not in our website.
// TEMP-BOOKING: skipped while Hotelogix is suspended. Change test.skip back to test to restore.
test.skip('HOTELOGIX SIDE: booking URL with no Referer does not end on the error page', async ({ request }) => {
  const res = await request.get(HOTELOGIX_URL);
  expect(
    res.url(),
    'Hotelogix returned its error page for our booking URL. This is a Hotelogix service or configuration problem, not a website problem.'
  ).not.toContain('/error/index/ec/');
  expect(res.status()).toBe(200);
});
