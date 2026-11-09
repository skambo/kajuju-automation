import { test, expect } from './fixtures';
import { ALL_PERIODS, RatesPage } from './pages/rates.page';
import { checkWhatsAppLink } from '../support/links';

const COTTAGE_DESCRIPTION =
  'Enjoy a private, self-catering retreat in Naro Moru. Our three-bedroom cottage accommodates up to six guests and features a fully equipped kitchen, a comfortable living area and access to the shared swimming pool. Ideal for families and small groups looking for a relaxed stay near Mount Kenya.';

test.describe('Rates page editorial cleanup', () => {
  let rates: RatesPage;
  test.beforeEach(async ({ page }) => {
    rates = new RatesPage(page);
    await page.goto('/');
  });

  test('each toggled room shows six rate rows in every period (prices are checked in tests/rates)', async () => {
    for (const period of ALL_PERIODS) {
      await rates.periodButton(period).click();
      for (const room of ['Twin Garden Room', 'Deluxe Room with Balcony']) {
        await expect(rates.panel(period, room).locator('.rate-item')).toHaveCount(6);
      }
    }
  });

  test('each room has one description and one amenity list that never disappear', async ({ page }) => {
    await expect(page.locator('.room-desc', { hasText: 'A well-appointed twin room' })).toHaveCount(1);
    await expect(page.locator('.room-desc', { hasText: 'A spacious deluxe room with a private balcony' })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 3, name: /^Twin Garden Room/ })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 3, name: /^Deluxe Room with Balcony/ })).toHaveCount(1);
    await expect(page.locator('[data-photo-strip="twin-garden"]')).toHaveCount(1);
    await expect(page.locator('[data-photo-strip="deluxe"]')).toHaveCount(1);
    for (const period of ALL_PERIODS) {
      await rates.periodButton(period).click();
      for (const room of ['Twin Garden Room', 'Deluxe Room with Balcony']) {
        await expect(rates.roomDescription(room)).toBeVisible();
        const chips = rates.roomChips(room);
        await expect(chips).not.toHaveCount(0);
        for (const chip of await chips.all()) await expect(chip).toBeVisible();
        await expect(rates.panels(period).filter({ visible: true })).toHaveCount(2);
      }
    }
  });

  test('the cottage uses the approved description and no size claims', async ({ page }) => {
    const card = page.locator('.room-card').filter({ has: page.getByRole('heading', { level: 3, name: /^Cottage/ }) });
    await expect(card.locator('.room-desc')).toHaveText(COTTAGE_DESCRIPTION);
    const text = (await card.innerText()).toLowerCase();
    for (const word of ['spacious', 'compact', 'small ', 'cosy', 'expansive', 'luxurious']) {
      // "small groups" is part of the approved wording; the others must not appear at all.
      if (word === 'small ') expect(text.replace('small groups', '')).not.toContain('small');
      else expect(text, word).not.toContain(word);
    }
    // Self catering stays clearly separate from the toggled rooms.
    await expect(page.locator('.section-label', { hasText: 'Self-Catering Units' })).toBeVisible();
  });

  test('the Christmas page uses the same cottage description', async ({ page }) => {
    await page.goto('/christmas-2026/');
    await expect(page.locator('#rates .room-desc', { hasText: 'three-bedroom cottage' })).toHaveText(COTTAGE_DESCRIPTION);
  });

  test('no photo count placeholder and no "See more photos" label, in the HTML or on screen', async ({ page, request }) => {
    for (const path of ['/', '/christmas-2026/']) {
      const html = await (await request.get(path)).text();
      expect(html, path + ' raw HTML').not.toContain('{n}');
      expect(html.toLowerCase(), path + ' raw HTML').not.toContain('see more photos');
      await page.goto(path);
      const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
      expect(text).not.toContain('{n}');
      expect(text).not.toContain('see more photos');
      expect(text).not.toMatch(/see all \d+ photos/);
      await expect(page.locator('[data-photo-count], .gallery-more, .gallery-link')).toHaveCount(0);
    }
  });

  test('photos stay clickable: lightbox opens, browses and closes from the property grid and a room strip', async ({ page }) => {
    const dialog = page.locator('dialog.viewer[open]');
    const tile = page.locator('#gallery ~ .photo-grid .grid-tile').nth(0);
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
    await expect(dialog).toBeVisible();
    const first = await dialog.locator('figcaption').innerText();
    await dialog.locator('.v-next').click();
    expect(await dialog.locator('figcaption').innerText()).not.toBe(first);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    const roomPhoto = page.locator('[data-photo-strip="twin-garden"]').getByRole('button', { name: /^Open photo 1 of \d+:/ });
    await roomPhoto.scrollIntoViewIfNeeded();
    await roomPhoto.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('figcaption')).toContainText('Twin Garden Room');
    await page.keyboard.press('Escape');
  });

  test('café menu shows the Half Board and Full Board supplements under clear headings (amounts are checked in tests/rates)', async ({ page }) => {
    await page.goto('/?tab=menu');
    const plans = page.getByRole('group', { name: 'Meal plan supplements' });
    await expect(plans.getByRole('heading', { level: 3, name: /^Half Board — KES [\d,]+ per adult$/ })).toBeVisible();
    await expect(plans.getByRole('heading', { level: 3, name: /^Full Board — KES [\d,]+ per adult$/ })).toBeVisible();
    await expect(plans).toContainText('Breakfast and one three-course lunch or dinner. Beverages charged separately.');
    await expect(plans).toContainText('Breakfast, lunch and dinner, with a starter, main course and dessert for lunch and dinner. Beverages charged separately.');
    // Supplements, not à la carte items: they sit outside the menu grid and have no menu-item rows.
    await expect(page.locator('.menu-grid .meal-plan-banner')).toHaveCount(0);
    await expect(plans.locator('.menu-item')).toHaveCount(0);
  });

  // Menu item prices are deliberately not asserted (owner decision). This checks structure only.
  test('café menu renders sections of items that each have a name and a well formed price, with no duplicates', async ({ page }) => {
    await page.goto('/?tab=menu');
    const menu = page.locator('#tab-menu');
    await expect(menu.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(menu.locator('.menu-card')).not.toHaveCount(0);
    const sectionHeadings = await menu.locator('.menu-card h3').allInnerTexts();
    expect(sectionHeadings.filter((h) => !h.trim()), 'menu sections with an empty heading').toEqual([]);

    const items = await menu.locator('.menu-item').evaluateAll((els) =>
      els.map((e) => ({
        name: e.querySelector('.item-name')?.textContent?.trim() ?? '',
        price: e.querySelector('.item-price')?.textContent?.trim() ?? '',
      }))
    );
    expect(items.length, 'menu items rendered').toBeGreaterThan(0);
    expect(items.filter((i) => !i.name || /\b(undefined|NaN|null)\b/.test(i.name)).map((i) => i.price), 'items without a usable name (shown by price)').toEqual([]);
    // Prices are digits with thousands separators, or "single / double" pairs. Never empty, NaN or undefined.
    const priceShape = /^\d[\d,]*(?: \/ \d[\d,]*)?$/;
    expect(items.filter((i) => !priceShape.test(i.price)).map((i) => `${i.name}: "${i.price}"`), 'items with a malformed price').toEqual([]);
    const names = items.map((i) => i.name);
    expect(names.filter((n, i) => names.indexOf(n) !== i), 'duplicated item names').toEqual([]);
    // Item prices carry no currency label of their own; the menu must state its currency somewhere.
    await expect(menu).toContainText(/\b(KES|Ksh)\b/);
  });

  test('FAQs are concise question and answer pairs and the FAQ structured data matches them', async ({ page }) => {
    const pairs = await page.locator('.faq details').evaluateAll((els) =>
      els.map((d) => {
        const summary = d.querySelector('summary');
        const question = summary?.textContent?.trim() ?? '';
        const answer = (d.textContent ?? '').replace(summary?.textContent ?? '', '').trim();
        return { question, answer };
      })
    );
    const summaries = pairs.map((p) => p.question);
    expect(summaries).toHaveLength(3);
    // Two questions are checked word for word. The third names the property, so only its shape is checked.
    expect(summaries[0]).toBe('Where to stay before climbing Mt Kenya?');
    expect(summaries[1]).toBe('Do you offer long stay or monthly rates?');
    expect(summaries[2]).toMatch(/^How do I book direct at .+\?$/);
    expect(pairs.filter((p) => !p.question || !p.answer), 'FAQs with an empty question or answer').toEqual([]);
    expect(summaries.filter((q, i) => summaries.indexOf(q) !== i), 'duplicate FAQ questions').toEqual([]);
    const ld = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => JSON.parse(e.textContent || '{}')));
    const faq = ld.find((d) => d['@type'] === 'FAQPage');
    expect(faq.mainEntity.map((q: any) => q.name)).toEqual(summaries);
  });

  test('Mt Kenya gate distances are stated once outside the FAQs', async ({ page }) => {
    const text = await page.evaluate(() => document.querySelector('#tab-packages')!.textContent! + document.querySelector('#tab-activities')!.textContent!);
    expect((text.match(/19km from the Naromoru gate/g) || []).length + (text.match(/We're 19km/g) || []).length).toBe(1);
    await expect(page.locator('.activity-note', { hasText: 'See Mt Kenya Climb Package' })).toHaveCount(1);
    await expect(page.locator('.blog-card-link')).toHaveCount(2);
  });

  test('every WhatsApp link has a valid wa.me structure and they all use the same number', async ({ page }) => {
    const links = page.locator('[data-whatsapp]');
    await expect(links).not.toHaveCount(0);
    const numbers = new Set<string>();
    for (const link of await links.all()) {
      const checked = checkWhatsAppLink((await link.getAttribute('href')) ?? '');
      expect(checked.problems, 'WhatsApp link structure').toEqual([]);
      numbers.add(checked.digits);
    }
    expect(numbers.size, 'distinct WhatsApp numbers on the page').toBe(1);
  });

  test('no console errors and no overflow at mobile and desktop widths', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${m.text()} (${m.location().url})`); });
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [w, h] of [[390, 844], [1280, 900]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      for (const period of ALL_PERIODS) await rates.periodButton(period).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'overflow at ' + w).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
});
