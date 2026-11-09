import { test as base, expect, Locator, Route } from '@playwright/test';

/**
 * Shared test fixtures for the live-site suite.
 *
 * Every test gets two protections automatically:
 *  1. Analytics are stubbed, so clicks in tests never reach production Google Analytics.
 *  2. Endpoints that create real-world side effects (booking enquiries, availability lookups)
 *     are blocked. A test that needs one must register its own page.route() mock, which takes
 *     priority over this guard. If a request reaches the guard, the test fails.
 */

const ANALYTICS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net/;
const FORMSPREE = /^https:\/\/formspree\.io\//;
const AVAILABILITY_API = /\/api\/check-availability/;

export const test = base.extend<{ networkGuards: void }>({
  networkGuards: [
    async ({ context }, use) => {
      const unmocked: string[] = [];

      await context.route(ANALYTICS, (route) => {
        const url = route.request().url();
        if (url.includes('/gtag/js') || url.includes('/gtm.js')) {
          return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
        }
        return route.fulfill({ status: 204, body: '' });
      });

      const guard = (route: Route) => {
        unmocked.push(`${route.request().method()} ${route.request().url()}`);
        return route.abort('blockedbyclient');
      };
      await context.route(FORMSPREE, guard);
      await context.route(AVAILABILITY_API, guard);

      await use();

      expect(unmocked, 'A test reached a write endpoint without mocking it. Add a page.route() mock.').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Waits until every image in the locator has finished loading (decoded, non-zero width).
 * Scrolls each into view first so lazy-loaded images start loading.
 */
export async function expectImagesLoaded(images: Locator) {
  const count = await images.count();
  for (let i = 0; i < count; i++) {
    const img = images.nth(i);
    await img.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), {
        message: `image ${i} did not finish loading`,
      })
      .toBe(true);
  }
}
