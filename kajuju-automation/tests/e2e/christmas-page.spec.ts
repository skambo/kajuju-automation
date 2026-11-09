import { test, expect, expectImagesLoaded } from './fixtures';
import { HOTELOGIX_URL } from '../support/site';
import { checkWhatsAppLink, telDigits } from '../support/links';
import type { Page } from '@playwright/test';

const BOOK_TEXT = 'Check Availability & Book';

const CHRISTMAS_PATH = '/christmas-2026/';

// Loads the page with the two confirmation switches forced on or off, without touching site-config.js.
async function openWithFlags(page: Page, flags: { lazy: boolean; pool: boolean }) {
  await page.route('**/site-config.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text())
      .replace(/LAZY_BREAKFAST_CONFIRMED: (true|false)/, `LAZY_BREAKFAST_CONFIRMED: ${flags.lazy}`)
      .replace(/POOL_SUPERVISION_LINE_APPROVED: (true|false)/, `POOL_SUPERVISION_LINE_APPROVED: ${flags.pool}`);
    await route.fulfill({ response: res, body });
  });
  await page.goto(CHRISTMAS_PATH);
}

const visibleText = (page: Page) => page.evaluate(() => document.body.innerText);

test.describe('Christmas page: /christmas-2026/', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CHRISTMAS_PATH);
  });

  test('page loads with the Christmas headline, one H1 and a logical heading order', async ({ page }) => {
    const title = await page.title();
    expect(title.trim(), 'page title').not.toBe('');
    expect(title).toMatch(/christmas/i);
    await expect(page.getByRole('heading', { level: 1, name: 'No alarms. No rush. Just time together.', exact: true })).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    const levels = await page.$$eval('h1,h2,h3,h4', (els) => els.map((e) => Number(e.tagName[1])));
    levels.reduce((prev, cur) => {
      expect(cur - prev, `heading level jumps from h${prev} to h${cur}`).toBeLessThanOrEqual(1);
      return cur;
    });
  });

  test('hero copy, dates and the secondary WhatsApp link are present', async ({ page }) => {
    const hero = page.locator('header.hero');
    await expect(hero).toContainText('Near Nanyuki. Away from the bustle.');
    await expect(hero).toContainText('Fresh mountain air, cosy stays, good food and afternoons by the pool. Gather your favourite people and settle into the festive season at the Barn.');
    await expect(hero).toContainText('19 December 2026 to 3 January 2027');
    await expect(hero.getByRole('link', { name: 'Chat with Us on WhatsApp' })).toBeVisible();
    await expect(hero.getByRole('link', { name: BOOK_TEXT })).toBeVisible();
  });

  test('every booking button uses data-hotelogix and passes the Hotelogix safety rules', async ({ page }) => {
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

  test('the booking placements use the agreed wording and cta_location values', async ({ page }) => {
    const buttons = page.getByRole('link', { name: BOOK_TEXT, exact: true });
    await expect(buttons).toHaveCount(3);
    const locations = await page.$$eval('[data-hotelogix]', (els) => els.map((e) => e.getAttribute('data-cta')));
    expect(locations).toEqual(['nav', 'hero', 'after_programme', 'final']);

    // One mid page CTA after the programme; no CTA directly before the final one.
    await expect(page.locator('#programme [data-cta="after_programme"]')).toBeVisible();
    await expect(page.locator('[data-cta="after_rates"]')).toHaveCount(0);
    await expect(page.locator('#book [data-hotelogix][data-cta="final"]')).toBeVisible();
  });

  test('each booking click sends book_direct_click with its cta_location', async ({ page }) => {
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

  test('Christmas WhatsApp links are well formed and carry the Christmas enquiry message', async ({ page }) => {
    const links = page.locator('[data-whatsapp="christmas"]');
    await expect(links).toHaveCount(2);
    for (const wa of await links.all()) {
      const checked = checkWhatsAppLink((await wa.getAttribute('href')) ?? '');
      expect(checked.problems, 'WhatsApp link structure').toEqual([]);
      // Non empty and URL encoded is checked by the helper; this link must carry the Christmas enquiry, not the generic one.
      expect(checked.message).toMatch(/christmas/i);
      await expect(wa).toHaveText('Chat with Us on WhatsApp');
    }
  });

  test('SEO and social preview tags are present, sensibly sized and agree with each other', async ({ page, request }) => {
    const meta = async (selector: string) => (await page.locator(selector).getAttribute('content')) ?? '';
    const title = await page.title();
    const description = await meta('meta[name="description"]');
    expect(title.length, 'page title length').toBeGreaterThanOrEqual(10);
    expect(title.length, 'page title length').toBeLessThanOrEqual(70);
    expect(description.length, 'meta description length').toBeGreaterThanOrEqual(50);
    expect(description.length, 'meta description length').toBeLessThanOrEqual(200);

    const canonical = new URL((await page.locator('link[rel="canonical"]').getAttribute('href')) ?? '');
    expect(canonical.protocol).toBe('https:');
    expect(canonical.pathname).toMatch(/^\/christmas-2026/);

    const ogTitle = await meta('meta[property="og:title"]');
    const ogDescription = await meta('meta[property="og:description"]');
    const ogImage = await meta('meta[property="og:image"]');
    expect(ogTitle, 'og:title').toBe(title);
    expect(ogDescription, 'og:description').toBe(description);
    expect(ogImage, 'og:image is present').not.toBe('');
    expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(await meta('meta[name="twitter:title"]')).toBe(title);
    expect(await meta('meta[name="twitter:description"]')).toBe(description);
    expect(await meta('meta[name="twitter:image"]')).toBe(ogImage);
    // "Naro Moru" in the metadata, "Naromoru" in the visible copy.
    expect(title + description).toContain('Naro Moru');
    expect(await visibleText(page)).toContain('Naromoru');

    // The preview image URL must resolve to an image.
    const res = await request.get(ogImage);
    expect(res.status(), 'og:image status').toBe(200);
    expect(res.headers()['content-type'], 'og:image content type').toMatch(/^image\//);
  });

  test('every image on the page loads and has alt text', async ({ page }) => {
    await expectImagesLoaded(page.locator('img'));
    const noAlt = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.getAttribute('alt')).length);
    expect(noAlt).toBe(0);
  });

  test('sections are in the agreed order and the minimum stay shows near the top', async ({ page }) => {
    // The minimum stay bar is gone from the hero; the notice sits straight before the first rate card.
    await expect(page.locator('.facts')).toHaveCount(0);
    await expect(page.locator('header.hero')).not.toContainText('Minimum');
    await expect(page.locator('#rates p.lead + p.stay-note + .room-card h3')).toHaveText('Twin Garden Room');
    await expect(page.locator('#rates .stay-note')).toContainText('Minimum stay: 2 nights');
    await expect(page.locator('#good-to-know')).toContainText('Two nights between 19 December 2026 and 3 January 2027.');
    const ids = await page.$$eval('header, section', (els) => els.map((e) => e.id || e.tagName.toLowerCase()));
    expect(ids).toEqual(['header', 'why', 'programme', 'dining', 'gallery', 'rates', 'book', 'good-to-know']);
    await expect(page.locator('#property')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '← Back to Rates & Packages' })).toHaveAttribute('href', '/');
    await expect(page.locator('.nav-book')).toHaveText('Book Now');
    // The phone link and the WhatsApp links must point at the same number.
    const tel = page.locator('a[href^="tel:"]');
    await expect(tel).toHaveCount(1);
    const whatsapp = await page.locator('[data-whatsapp]').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
    expect(whatsapp.length).toBeGreaterThan(0);
    const telNumber = telDigits((await tel.getAttribute('href')) ?? '');
    expect(telNumber, 'tel link has a number').not.toBe('');
    expect(whatsapp.map((href) => checkWhatsAppLink(href).digits === telNumber), 'WhatsApp links match the tel link number').not.toContain(false);
  });

  test('highlights, facilities and festive programme cards are present', async ({ page }) => {
    await expect(page.locator('#why .hl')).toHaveCount(3);
    await expect(page.getByRole('heading', { level: 2, name: 'The good things, all in one place.' })).toBeVisible();
    expect(await page.locator('#why .hl h3').allInnerTexts()).toEqual([
      'Pool days, your way.',
      'Stay in. Slow down. Make yourself at home.',
      'Good mornings start here.',
    ]);
    const why = page.locator('#why');
    await expect(why).toContainText("A new swimming pool, fresh mountain air and time to unwind. There's even a separate shallow pool for younger guests.");
    await expect(why).toContainText('Choose a cosy ensuite room, the Penthouse Loft or our three-bedroom self-catering Cottage. Your stay, your pace.');
    await expect(why).toContainText('Enjoy freshly prepared food, festive dining and leisurely mornings at the Barn.');
    await expect(why).toContainText('A baby cot is available on request, and indoor games are available for guests.');
    // Three different genuine photographs: pool, accommodation, café. None repeated in the Christmas gallery.
    await expectImagesLoaded(page.locator('#why .hl-img img, #gallery img'));
    const name = (src: string) => src.split('/').pop()!.replace(/-\d+\.webp$/, '');
    const whyPhotos = (await page.$$eval('#why .hl-img img', (i) => i.map((x) => (x as HTMLImageElement).currentSrc))).map(name);
    expect(new Set(whyPhotos).size).toBe(3);
    expect(whyPhotos.filter((n) => n.startsWith('pool')).length).toBe(1);
    const gallery = (await page.$$eval('#gallery img', (i) => i.map((x) => (x as HTMLImageElement).currentSrc))).map(name);
    expect(gallery).toHaveLength(5);
    for (const n of whyPhotos) expect(gallery).not.toContain(n);
    await expect(page.locator('#gallery p')).toHaveText(
      'Twinkling lights, cosy fireside moments, good food and time together.'
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
    await expect(page.locator('#programme .prog-note')).toHaveText(
      'Join us for cocktails on 24 and 31 December. Complimentary drinks are offered to guests staying with us on those nights, and all visitors are welcome to enjoy the evening.'
    );
  });

  test('section headings carry the campaign wording', async ({ page }) => {
    const headings = (await page.locator('main h2, section h2').allInnerTexts()).map((h) =>
      // One heading ends with the property's name; the rest of its wording is still checked.
      /^A glimpse of the season at \S+\.$/.test(h) ? 'A glimpse of the season at <name>.' : h
    );
    expect(headings).toEqual([
      'The good things, all in one place.',
      'Your festive days, your way.',
      'Good food. Great company.',
      'A glimpse of the season at <name>.',
      'Find your place at the Barn.',
      'Your stay starts here.',
      'Good to know',
    ]);
    // The cottage promo line sits under its heading and before the approved description.
    const cottage = page.locator('#rates .room-card').filter({ has: page.getByRole('heading', { level: 3, name: 'Cottage (3 bedrooms)' }) });
    const paras = await cottage.locator('.room-desc').allInnerTexts();
    expect(paras[0]).toBe('Your own cottage. Christmas for six.');
    expect(paras[1]).toContain('Enjoy a private, self-catering retreat in Naro Moru.');
    expect(paras[1]).toContain('access to the shared swimming pool');
    expect(paras[1]).not.toMatch(/private (swimming )?pool/i);
  });

  test('room tables are unchanged and standalone prices say per night', async ({ page }) => {
    const rates = page.locator('#rates');
    await expect(rates.locator('p.lead')).toHaveText('19 December 2026 to 3 January 2027. All rates are per night in Kenya shillings.');
    await expect(rates.getByText('Festive accommodation rates')).toHaveCount(0);
    expect(await page.$$eval('#rates .rate-table thead th', (els) => els.map((e) => e.textContent))).toEqual([
      'Meal plan', 'Single', 'Double', 'Meal plan', 'Single', 'Double',
    ]);
    // Standalone accommodation prices say "per night" (the amounts are checked in tests/rates).
    const rows = page.locator('#rates .room-card .rate-row span:last-child, #rates .room-card .price-only');
    const perNight = await rows.allInnerTexts();
    expect(perNight.length).toBeGreaterThan(0);
    for (const text of perNight) expect(text).toMatch(/^KES [\d,]+ per night$/);
    // Meal supplements are per adult and carry no "per night" wording. The amounts are checked in tests/rates.
    const meals = await page.locator('.meals-note .rate-row').allInnerTexts();
    expect(meals.map((m) => m.replace(/\s+/g, ' ').replace(/ KES [\d,]+$/, ''))).toEqual(['Breakfast', 'Half Board', 'Full Board']);
    expect(meals.join(' ')).not.toContain('per night');
  });

  test('prohibited words and claims do not appear in the visible copy', async ({ page }) => {
    const text = (await visibleText(page)).toLowerCase();
    for (const banned of ['buffet', 'unlimited', 'entertainer', 'kids club', 'treasure hunt', 'brunch', 'spacious', 'expansive', 'luxurious']) {
      expect(text, `found "${banned}"`).not.toContain(banned);
    }
    // No dashes in website copy (hyphens only live in code, URLs and attributes).
    expect(text).not.toMatch(/[–—]/);
  });

  test('no console errors, and no scripts beyond our own and the Google tag', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`${m.text()} (${m.location().url})`);
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.reload({ waitUntil: 'load' });
    expect(errors).toEqual([]);
    const hosts = await page.$$eval('script[src]', (s) => s.map((x) => new URL((x as HTMLScriptElement).src).host));
    for (const h of hosts) expect([new URL(page.url()).host, 'www.googletagmanager.com']).toContain(h);
  });

  test('internal links resolve', async ({ page, request }) => {
    const hrefs = await page.$$eval('a[href^="/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href') as string))]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const res = await request.get(`${href}`);
      expect(res.status(), href).toBe(200);
    }
  });

  test('keyboard focus is visible on links', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
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
    await expect(page.locator('#why')).toContainText('Lazy Breakfast until 11 a.m. is planned for 25, 26 and 31 December and 1 January, subject to kitchen capacity.');
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
    await expect(page.locator('#why .hl').filter({ hasText: 'Pool days, your way.' })).toContainText('Children must be supervised by an adult at all times.');
  });

  test('as shipped: Lazy Breakfast is on for the four approved dates, the pool supervision line is off', async ({ page, request }) => {
    const body = await (await request.get(`/site-config.js`)).text();
    expect(body).toMatch(/LAZY_BREAKFAST_CONFIRMED: true/);
    expect(body).toMatch(/POOL_SUPERVISION_LINE_APPROVED: false/);
    await page.goto(CHRISTMAS_PATH);
    const cards = page.locator('#programme .prog-card');
    await expect(cards.nth(0)).not.toContainText('Lazy Breakfast');
    for (const i of [1, 2, 3]) await expect(cards.nth(i)).toContainText('Lazy Breakfast until 11 am.');
    await expect(cards.nth(4)).toContainText('Lazy Breakfast');
    expect((await page.locator('.prog-card li', { hasText: 'Lazy Breakfast' }).count())).toBe(4);
    expect(await visibleText(page)).not.toContain('supervised');
  });

  test('the booking section explains the 50% M-Pesa deposit once, and booking stays on Hotelogix', async ({ page }) => {
    await page.goto(CHRISTMAS_PATH);
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
      await page.goto(CHRISTMAS_PATH);
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
      const lastPhoto = page.locator('#gallery').getByRole('button', { name: /^Open photo 5 of 5:/ });
      await lastPhoto.scrollIntoViewIfNeeded();
      const fifth = await lastPhoto.boundingBox();
      expect(fifth!.x).toBeGreaterThanOrEqual(0);
      expect(fifth!.x + fifth!.width).toBeLessThanOrEqual(width + 1);
      await expect(lastPhoto).toHaveAttribute('aria-label', /photo 5 of 5/);
      await expect(page.locator('#gallery .strip-hint, #gallery .gallery-link')).toHaveCount(0);
      if (width >= 700) {
        // all five fit without scrolling on desktop
        const strip = await page.locator('#gallery .photo-strip').evaluate((e) => e.scrollWidth - e.clientWidth);
        expect(strip).toBeLessThanOrEqual(0);
      }
      await lastPhoto.focus();
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
