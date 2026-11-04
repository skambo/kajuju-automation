import * as dotenv from 'dotenv';
dotenv.config();

import { test, expect, Page } from '@playwright/test';

const HOTELOGIX_URL =
  'https://booking.staygrid.com/webv2/index/home/c/WWhSOTFXNlQvRUhodTdsRDlYNCtKUzZXNjhka3BiZU9ObzJ3dEJTdWhMZDlWVU0yNTQ3WHlRSUt4NjA4QU5lODdYbkZDNkFRZkwrUUlpU1pUUU11UkJJQTBKRzM2a0hkZkRObDcwZ1FaVGRtdm9wNlFQa1pyZ2had3A3SXFwM2s/language/en';
const OG_IMAGE = 'https://rates.idanbarnsuites.com/images/social/christmas-2026-og.jpg';
const SEO_TITLE = 'Christmas & New Year 2026 in Naro Moru | Idan Barn Suites';
const SEO_DESCRIPTION =
  'Celebrate Christmas and New Year at Idan Barn Suites in Naro Moru. Enjoy cosy accommodation, a swimming pool, festive dining and special holiday experiences.';
const BOOK_TEXT = 'Check Availability & Book';

// Read lazily so the dotenv call above has run first (see rates.page.ts).
function baseUrl(): string {
  const base = process.env.BASE_URL;
  if (!base) throw new Error('BASE_URL environment variable is required to run the Christmas page tests (set it in .env).');
  return base.replace(/\/$/, '');
}
function christmasUrl(): string {
  return `${baseUrl()}/christmas-2026/`;
}

// Loads the page with the two confirmation switches forced on or off, without touching site-config.js.
async function openWithFlags(page: Page, flags: { lazy: boolean; pool: boolean }) {
  await page.route('**/site-config.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text())
      .replace(/LAZY_BREAKFAST_CONFIRMED: (true|false)/, `LAZY_BREAKFAST_CONFIRMED: ${flags.lazy}`)
      .replace(/POOL_SUPERVISION_LINE_APPROVED: (true|false)/, `POOL_SUPERVISION_LINE_APPROVED: ${flags.pool}`);
    await route.fulfill({ response: res, body });
  });
  await page.goto(christmasUrl());
}

const visibleText = (page: Page) => page.evaluate(() => document.body.innerText);

test.describe('Christmas page: /christmas-2026/', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(christmasUrl());
  });

  test('1. page loads with the Christmas headline, one H1 and a logical heading order', async ({ page }) => {
    await expect(page).toHaveTitle(SEO_TITLE);
    await expect(page.getByRole('heading', { level: 1, name: 'Christmas at the Barn' })).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    const levels = await page.$$eval('h1,h2,h3,h4', (els) => els.map((e) => Number(e.tagName[1])));
    levels.reduce((prev, cur) => {
      expect(cur - prev, `heading level jumps from h${prev} to h${cur}`).toBeLessThanOrEqual(1);
      return cur;
    });
  });

  test('2. hero copy, dates and the secondary WhatsApp link are present', async ({ page }) => {
    const hero = page.locator('header.hero');
    await expect(hero).toContainText('A little festive magic. A lot of time together.');
    await expect(hero).toContainText('19 December 2026 to 3 January 2027');
    await expect(hero.getByRole('link', { name: 'Chat with Us on WhatsApp' })).toBeVisible();
    await expect(hero.getByRole('link', { name: BOOK_TEXT })).toBeVisible();
  });

  test('3. every booking button uses data-hotelogix and passes the Hotelogix safety rules', async ({ page }) => {
    const buttons = page.locator('[data-hotelogix]');
    await expect(buttons).toHaveCount(4);
    for (const button of await buttons.all()) {
      await expect(button).toHaveAttribute('href', HOTELOGIX_URL);
      await expect(button).toHaveAttribute('target', '_blank');
      await expect(button).toHaveAttribute('rel', /noopener/);
      await expect(button).toHaveAttribute('rel', /noreferrer/);
      await expect(button).toHaveAttribute('referrerpolicy', 'no-referrer');
    }
    // No plain Hotelogix link anywhere that is not driven by data-hotelogix.
    expect(await page.locator('a[href*="staygrid"]:not([data-hotelogix])').count()).toBe(0);
  });

  test('4. the booking placements use the agreed wording and cta_location values', async ({ page }) => {
    const buttons = page.getByRole('link', { name: BOOK_TEXT, exact: true });
    await expect(buttons).toHaveCount(3);
    const locations = await page.$$eval('[data-hotelogix]', (els) => els.map((e) => e.getAttribute('data-cta')));
    expect(locations).toEqual(['nav', 'hero', 'after_programme', 'final']);

    // One mid page CTA after the programme; no CTA directly before the final one.
    await expect(page.locator('#programme [data-cta="after_programme"]')).toBeVisible();
    await expect(page.locator('[data-cta="after_rates"]')).toHaveCount(0);
    await expect(page.locator('#book [data-hotelogix][data-cta="final"]')).toBeVisible();
  });

  test('5. each booking click sends book_direct_click with its cta_location', async ({ page }) => {
    // Stop the new tab opening; the tracking listener still runs.
    await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault(), true));
    for (const cta of ['nav', 'hero', 'after_programme', 'final']) {
      await page.locator(`[data-hotelogix][data-cta="${cta}"]`).click();
    }
    const events = await page.evaluate(() =>
      Array.from((window as any).dataLayer as IArguments[])
        .map((a) => Array.from(a))
        .filter((a) => a[0] === 'event' && a[1] === 'book_direct_click')
        .map((a) => (a[2] as any).cta_location)
    );
    expect(events).toEqual(['nav', 'hero', 'after_programme', 'final']);

    await page.locator('[data-whatsapp][data-cta="hero"]').click();
    const wa = await page.evaluate(() =>
      Array.from((window as any).dataLayer as IArguments[])
        .map((a) => Array.from(a))
        .filter((a) => a[1] === 'whatsapp_click')
        .map((a) => (a[2] as any).cta_location)
    );
    expect(wa).toEqual(['hero']);
  });

  test('6. WhatsApp links use the wa.me number and the Christmas message', async ({ page }) => {
    const links = page.locator('[data-whatsapp="christmas"]');
    await expect(links).toHaveCount(2);
    for (const wa of await links.all()) {
      const href = (await wa.getAttribute('href')) ?? '';
      expect(href).toContain('https://wa.me/254762004417');
      expect(decodeURIComponent(href)).toContain("Hi, I'd like to enquire about Christmas at Idan Barn Suites.");
      await expect(wa).toHaveText('Chat with Us on WhatsApp');
    }
  });

  test('7. SEO and social preview tags exist and agree with each other', async ({ page }) => {
    const meta = (selector: string) => page.locator(selector).getAttribute('content');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/^https:\/\/rates\.idanbarnsuites\.com\/christmas-2026/);
    expect(await meta('meta[name="description"]')).toBe(SEO_DESCRIPTION);
    expect(await meta('meta[property="og:title"]')).toBe(SEO_TITLE);
    expect(await meta('meta[property="og:description"]')).toBe(SEO_DESCRIPTION);
    expect(await meta('meta[property="og:image"]')).toBe(OG_IMAGE);
    expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(await meta('meta[name="twitter:title"]')).toBe(SEO_TITLE);
    expect(await meta('meta[name="twitter:description"]')).toBe(SEO_DESCRIPTION);
    expect(await meta('meta[name="twitter:image"]')).toBe(OG_IMAGE);
    // "Naro Moru" in the metadata, "Naromoru" in the visible copy.
    expect(SEO_TITLE + SEO_DESCRIPTION).toContain('Naro Moru');
    expect(await visibleText(page)).toContain('Naromoru');
  });

  test('8. the social preview image is a 1200 x 630 JPG under 300 KB', async ({ page, request }) => {
    const res = await request.get(`${baseUrl()}/images/social/christmas-2026-og.jpg`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/jpeg');
    expect((await res.body()).length).toBeLessThan(300 * 1024);
    const size = await page.evaluate(
      (src) =>
        new Promise<[number, number]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
          img.onerror = reject;
          img.src = src;
        }),
      `${baseUrl()}/images/social/christmas-2026-og.jpg`
    );
    expect(size).toEqual([1200, 630]);
  });

  test('9. every image on the page loads and has alt text', async ({ page }) => {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
    });
    await page.waitForLoadState('networkidle');
    const broken = await page.$$eval('img', (imgs) =>
      (imgs as HTMLImageElement[]).filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src)
    );
    expect(broken).toEqual([]);
    const noAlt = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.getAttribute('alt')).length);
    expect(noAlt).toBe(0);
  });

  test('10. sections are in the agreed order and the minimum stay shows near the top', async ({ page }) => {
    await expect(page.locator('.facts')).toContainText('2 nights');
    await expect(page.locator('.facts')).toContainText('3 nights');
    const ids = await page.$$eval('header, section', (els) => els.map((e) => e.id || e.tagName.toLowerCase()));
    expect(ids).toEqual(['header', 'why', 'programme', 'dining', 'gallery', 'rates', 'book', 'good-to-know']);
    await expect(page.locator('#property')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '← Back to Rates & Packages' })).toHaveAttribute('href', '/');
    await expect(page.locator('.nav-book')).toHaveText('Book Now');
    await expect(page.locator('a[href="tel:+254762004417"]').last()).toBeVisible();
  });

  test('11. highlights, facilities and festive programme cards are present', async ({ page }) => {
    await expect(page.locator('#why .hl')).toHaveCount(3);
    expect(await page.locator('#why .hl h3').allInnerTexts()).toEqual([
      'A new way to spend Christmas at the Barn',
      'Stay a little longer',
      'Good food, festive moments',
    ]);
    const why = page.locator('#why');
    await expect(why).toContainText('Make a splash this festive season in our swimming pool, including a separate shallow pool for younger guests.');
    await expect(why).toContainText('Settle into comfortable ensuite rooms, the Penthouse Loft or our private three-bedroom cottage. Enjoy a relaxed escape near Mount Kenya.');
    await expect(why).toContainText('Enjoy freshly prepared festive meals, leisurely breakfasts and time together at the Barn.');
    await expect(why).toContainText('A baby cot is available on request, and indoor games are available for guests.');
    // Three different genuine photographs: pool, accommodation, café. None repeated in the Christmas gallery.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    const name = (src: string) => src.split('/').pop()!.replace(/-\d+\.webp$/, '');
    const whyPhotos = (await page.$$eval('#why .hl-img img', (i) => i.map((x) => (x as HTMLImageElement).currentSrc))).map(name);
    expect(new Set(whyPhotos).size).toBe(3);
    expect(whyPhotos.filter((n) => n.startsWith('pool')).length).toBe(1);
    const gallery = (await page.$$eval('#gallery img', (i) => i.map((x) => (x as HTMLImageElement).currentSrc))).map(name);
    expect(gallery).toHaveLength(5);
    for (const n of whyPhotos) expect(gallery).not.toContain(n);
    await expect(page.locator('#gallery p').first()).toHaveText(
      "A little glimpse of Christmas at Idan, festive decorations, fireside moments, good food and time together. We're looking forward to welcoming you this season."
    );

    const titles = await page.locator('#programme .prog-card h3').allInnerTexts();
    expect(titles).toEqual([
      'Christmas Eve, Thursday 24 December',
      'Christmas Day, Friday 25 December',
      'Boxing Day, Saturday 26 December',
      'New Year’s Eve, Thursday 31 December',
      'New Year’s Day, Friday 1 January',
    ]);
    const cards = page.locator('#programme .prog-card');
    for (const i of [0, 3]) {
      await expect(cards.nth(i)).toContainText('Complimentary cocktail hour, 6 to 8 pm');
    }
    for (const i of [1, 2, 4]) await expect(cards.nth(i)).not.toContainText('cocktail');
  });

  test('12. festive dining sits straight after the programme with the shortened copy', async ({ page }) => {
    const dining = page.locator('#dining');
    await expect(dining.getByRole('heading', { level: 2, name: 'Festive Dining at the Barn' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /dining/i })).toHaveCount(1);
    await expect(dining.locator('> p').first()).toHaveText(
      'Celebrate Christmas and New Year with specially curated festive set menus, freshly prepared at our café.'
    );
    // The set lunch and dining specials are listed in the programme, so they are not repeated here.
    expect(await dining.locator('.dine-list li').allInnerTexts()).toEqual([
      'Half Board and Full Board guests enjoy their applicable festive meal as part of their package.',
      'Bed & Breakfast and self catering guests can reserve festive meals separately.',
    ]);
    // Sits after the programme booking button and before the gallery.
    const order = await page.$$eval('#programme, #dining, #gallery', (els) => els.map((e) => e.id));
    expect(order).toEqual(['programme', 'dining', 'gallery']);
  });

  test('12b. festive dining has a WhatsApp enquiry for reserving a meal', async ({ page }) => {
    const para = page.locator('#dining .dine-reserve');
    await expect(para).toHaveText(
      'Beverages are charged separately. Planning to join us for festive dining? Chat with us on WhatsApp to reserve your meal.'
    );
    const link = para.getByRole('link', { name: 'Chat with us on WhatsApp' });
    const href = (await link.getAttribute('href')) ?? '';
    expect(href).toContain('https://wa.me/254762004417');
    expect(decodeURIComponent(href)).toContain("Hi, I'd like to reserve festive meals at Idan Barn Suites.");
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).not.toHaveAttribute('data-hotelogix', /.*/);
  });

  test('13. approved rates and policies are unchanged', async ({ page }) => {
    const text = await visibleText(page);
    for (const fragment of [
      '11,500', '13,000', '13,500', '16,500', '15,500', '20,000', '14,500', '15,000', '18,000', '17,000', '21,500',
      'KES 15,500', 'KES 16,500', 'KES 18,000', 'KES 58,500', 'KES 48,900', 'KES 1,200', 'KES 2,500', 'KES 3,300',
      'A 50% deposit is required to secure your reservation.',
      'Cancel at least 72 hours before your arrival date for a full refund.',
      'Children aged 11 and under can share existing bedding',
      'Deluxe Room with Balcony',
    ]) {
      expect(text, `missing: ${fragment}`).toContain(fragment);
    }
    await expect(page.locator('a[href="/?tab=rates"]').first()).toBeVisible();
  });

  test('14. prohibited words and claims do not appear in the visible copy', async ({ page }) => {
    const text = (await visibleText(page)).toLowerCase();
    for (const banned of ['buffet', 'unlimited', 'entertainer', 'kids club', 'treasure hunt', 'brunch', 'spacious', 'expansive', 'luxurious']) {
      expect(text, `found "${banned}"`).not.toContain(banned);
    }
    // No dashes in website copy (hyphens only live in code, URLs and attributes).
    expect(text).not.toMatch(/[–—]/);
  });

  test('15. no console errors, and no scripts beyond our own and the Google tag', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !/googletagmanager|google-analytics|ERR_/.test(m.text() + m.location().url)) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
    const hosts = await page.$$eval('script[src]', (s) => s.map((x) => new URL((x as HTMLScriptElement).src).host));
    for (const h of hosts) expect([new URL(christmasUrl()).host, 'www.googletagmanager.com']).toContain(h);
  });

  test('16. internal links resolve', async ({ page, request }) => {
    const hrefs = await page.$$eval('a[href^="/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href') as string))]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const res = await request.get(`${baseUrl()}${href}`);
      expect(res.status(), href).toBe(200);
    }
  });

  test('17. keyboard focus is visible on links', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
  });

  test('18. the page loads quickly', async ({ page }) => {
    await page.reload({ waitUntil: 'load' });
    const nav = await page.evaluate(() => {
      const t = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return { dcl: t.domContentLoadedEventEnd, load: t.loadEventEnd };
    });
    expect(nav.dcl).toBeLessThan(3000);
    expect(nav.load).toBeLessThan(8000);
    expect(await page.locator('img[fetchpriority="high"]').count()).toBe(1);
  });
});

test.describe('Christmas page: confirmation switches', () => {
  test('LAZY_BREAKFAST_CONFIRMED=false: no Lazy Breakfast wording or timings render', async ({ page }) => {
    await openWithFlags(page, { lazy: false, pool: false });
    expect((await visibleText(page)).toLowerCase()).not.toContain('lazy breakfast');
    expect((await page.content()).toLowerCase()).not.toContain('lazy breakfast');
    expect(await visibleText(page)).not.toContain('until 11 am');
  });

  test('LAZY_BREAKFAST_CONFIRMED=true: Lazy Breakfast appears on the approved dates only', async ({ page }) => {
    await openWithFlags(page, { lazy: true, pool: false });
    const cards = page.locator('#programme .prog-card');
    for (const [i, expected] of [[0, false], [1, true], [2, true], [3, true]] as const) {
      const card = cards.nth(i);
      if (expected) await expect(card).toContainText('Lazy Breakfast until 11 am.');
      else await expect(card).not.toContainText('Lazy Breakfast');
    }
    await expect(cards.nth(4)).toContainText('Lazy Breakfast, an extended breakfast service.');
    for (const banned of ['unlimited', 'brunch']) expect((await visibleText(page)).toLowerCase()).not.toContain(banned);
    await expect(page.locator('#why')).not.toContainText('Lazy Breakfast');
    await expect(page.locator('#dining')).not.toContainText('Lazy Breakfast');
    expect(await visibleText(page)).not.toContain('a relaxed Lazy Breakfast');
  });

  test('POOL_SUPERVISION_LINE_APPROVED=false: the supervision sentence does not render', async ({ page }) => {
    await openWithFlags(page, { lazy: false, pool: false });
    expect((await visibleText(page)).toLowerCase()).not.toContain('supervised');
    expect((await page.content()).toLowerCase()).not.toContain('supervised');
  });

  test('POOL_SUPERVISION_LINE_APPROVED=true: the approved sentence appears in the pool highlight', async ({ page }) => {
    await openWithFlags(page, { lazy: false, pool: true });
    await expect(page.locator('#why .hl').first()).toContainText('Children must be supervised by an adult at all times.');
  });

  test('as shipped: Lazy Breakfast is on for the four approved dates, the pool supervision line is off', async ({ page, request }) => {
    const body = await (await request.get(`${baseUrl()}/site-config.js`)).text();
    expect(body).toMatch(/LAZY_BREAKFAST_CONFIRMED: true/);
    expect(body).toMatch(/POOL_SUPERVISION_LINE_APPROVED: false/);
    await page.goto(christmasUrl());
    const cards = page.locator('#programme .prog-card');
    await expect(cards.nth(0)).not.toContainText('Lazy Breakfast');
    for (const i of [1, 2, 3]) await expect(cards.nth(i)).toContainText('Lazy Breakfast until 11 am.');
    await expect(cards.nth(4)).toContainText('Lazy Breakfast');
    expect((await page.locator('.prog-card li', { hasText: 'Lazy Breakfast' }).count())).toBe(4);
    expect(await visibleText(page)).not.toContain('supervised');
  });

  test('the booking section explains the 50% M-Pesa deposit once, and booking stays on Hotelogix', async ({ page }) => {
    await page.goto(christmasUrl());
    const book = page.locator('#book');
    await expect(book).toContainText('pay a 50% M-Pesa deposit within 48 hours of receiving your booking instructions');
    await expect(book.locator('[data-hotelogix][data-cta="final"]')).toHaveText('Check Availability & Book');
    expect(((await visibleText(page)).match(/M-Pesa/g) || []).length).toBe(1);
  });
});

for (const [name, width, height] of [['mobile', 390, 844], ['desktop', 1280, 900]] as const) {
  test.describe(`Christmas page layout: ${name} ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test('no horizontal overflow, cards lay out for this width and CTAs are visible', async ({ page }) => {
      await page.goto(christmasUrl());
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      const boxes = await page.locator('#programme .prog-card').evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width) };
        })
      );
      expect(boxes).toHaveLength(5);
      if (width < 700) {
        expect(new Set(boxes.map((b) => b.x)).size).toBe(1); // stacked
        expect(boxes.map((b) => b.y)).toEqual([...boxes.map((b) => b.y)].sort((a, b) => a - b));
      } else {
        // three across, then two centred, all the same width
        expect(boxes[0].y).toBe(boxes[1].y);
        expect(boxes[1].y).toBe(boxes[2].y);
        expect(boxes[3].y).toBe(boxes[4].y);
        expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
        expect(new Set(boxes.map((b) => b.w)).size).toBe(1);
        const grid = await page.locator('#programme .prog-grid').boundingBox();
        const left = boxes[3].x - grid!.x;
        const right = grid!.x + grid!.width - (boxes[4].x + boxes[4].w);
        expect(Math.abs(left - right)).toBeLessThanOrEqual(2);
      }

      // Gallery: the fifth photo can be found and opened on every width.
      const photos = page.locator('#gallery .strip-item');
      await expect(photos).toHaveCount(5);
      await photos.last().scrollIntoViewIfNeeded();
      const fifth = await photos.last().boundingBox();
      expect(fifth!.x).toBeGreaterThanOrEqual(0);
      expect(fifth!.x + fifth!.width).toBeLessThanOrEqual(width + 1);
      await expect(photos.last()).toHaveAttribute('aria-label', /photo 5 of 5/);
      await expect(page.locator('#gallery .strip-hint, #gallery .gallery-link')).toHaveCount(0);
      if (width >= 700) {
        // all five fit without scrolling on desktop
        const strip = await page.locator('#gallery .photo-strip').evaluate((e) => e.scrollWidth - e.clientWidth);
        expect(strip).toBeLessThanOrEqual(0);
      }
      await photos.last().focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('dialog.viewer[open] figcaption')).toContainText('5 of 5');
      await page.keyboard.press('Escape');

      for (const cta of ['hero', 'after_programme', 'final']) {
        const btn = page.locator(`[data-hotelogix][data-cta="${cta}"]`);
        await btn.scrollIntoViewIfNeeded();
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(40);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
    });
  });
}
