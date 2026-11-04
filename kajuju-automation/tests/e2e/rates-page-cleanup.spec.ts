import * as dotenv from 'dotenv';
dotenv.config();

import { test, expect, Page } from '@playwright/test';
import { ALL_PERIODS, RatePeriod, RatesPage } from './pages/rates.page';

// Rates exactly as published before the editorial cleanup (taken from the committed page).
// If any of these change, a published price changed.
const TOGGLED_RATES: Record<RatePeriod, Record<string, Record<string, string>>> = {
  "weekday": {
    "Twin Garden Room": {
      "Single B&B": "Ksh 9,000 ~$69",
      "Double B&B": "Ksh 10,500 ~$81",
      "Single H/B": "Ksh 11,000 ~$85",
      "Double H/B": "Ksh 14,000 ~$108",
      "Single FB": "Ksh 13,000 ~$100",
      "Double FB": "Ksh 17,500 ~$135"
    },
    "Deluxe Room with Balcony": {
      "Single B&B": "Ksh 10,500 ~$81",
      "Double B&B": "Ksh 11,500 ~$88",
      "Single H/B": "Ksh 12,500 ~$96",
      "Double H/B": "Ksh 15,000 ~$115",
      "Single FB": "Ksh 14,500 ~$112",
      "Double FB": "Ksh 18,500 ~$142"
    }
  },
  "weekend": {
    "Twin Garden Room": {
      "Single B&B": "Ksh 10,000 ~$77",
      "Double B&B": "Ksh 11,500 ~$88",
      "Single H/B": "Ksh 12,000 ~$92",
      "Double H/B": "Ksh 15,000 ~$115",
      "Single FB": "Ksh 14,000 ~$108",
      "Double FB": "Ksh 18,500 ~$142"
    },
    "Deluxe Room with Balcony": {
      "Single B&B": "Ksh 11,500 ~$88",
      "Double B&B": "Ksh 13,000 ~$100",
      "Single H/B": "Ksh 13,500 ~$104",
      "Double H/B": "Ksh 16,500 ~$127",
      "Single FB": "Ksh 15,500 ~$119",
      "Double FB": "Ksh 20,000 ~$154"
    }
  },
  "peak": {
    "Twin Garden Room": {
      "Single B&B": "Ksh 11,500 ~$88",
      "Double B&B": "Ksh 13,000 ~$100",
      "Single H/B": "Ksh 13,500 ~$104",
      "Double H/B": "Ksh 16,500 ~$127",
      "Single FB": "Ksh 15,500 ~$119",
      "Double FB": "Ksh 20,000 ~$154"
    },
    "Deluxe Room with Balcony": {
      "Single B&B": "Ksh 13,000 ~$100",
      "Double B&B": "Ksh 14,500 ~$112",
      "Single H/B": "Ksh 15,000 ~$115",
      "Double H/B": "Ksh 18,000 ~$138",
      "Single FB": "Ksh 17,000 ~$131",
      "Double FB": "Ksh 21,500 ~$165"
    }
  }
};
const FIXED_RATES: [string, string][] = [
  [
    "Single — off-peak weekday",
    "Ksh 12,500 ~$96"
  ],
  [
    "Double — off-peak weekday",
    "Ksh 13,500 ~$104"
  ],
  [
    "Single — weekend",
    "Ksh 14,000 ~$108"
  ],
  [
    "Double — weekend",
    "Ksh 15,000 ~$115"
  ],
  [
    "Single — peak",
    "Ksh 15,500 ~$119"
  ],
  [
    "Double — peak",
    "Ksh 16,500 ~$127"
  ],
  [
    "Off-peak weekday — B&B",
    "Ksh 45,500 ~$350"
  ],
  [
    "Off-peak weekday — self-catering",
    "Ksh 35,900 ~$276"
  ],
  [
    "Weekend — B&B",
    "Ksh 55,000 ~$423"
  ],
  [
    "Weekend self catering",
    "Ksh 43,000 ~$331"
  ],
  [
    "Peak (Dec 19 – Jan 3) — B&B",
    "Ksh 58,500 ~$450"
  ],
  [
    "Peak (Dec 19 to Jan 3) self catering",
    "Ksh 48,900 ~$376"
  ],
  [
    "Off-peak weekday",
    "Ksh 10,000 ~$77 / night"
  ],
  [
    "Weekend (Fri–Sat)",
    "Ksh 12,000 ~$92 / night"
  ],
  [
    "Peak (Dec 19 – Jan 3)",
    "Ksh 18,000 ~$138 / night"
  ]
];

const COTTAGE_DESCRIPTION =
  'Enjoy a private, self-catering retreat in Naro Moru. Our three-bedroom cottage accommodates up to six guests and features a fully equipped kitchen, a comfortable living area and access to the shared swimming pool. Ideal for families and small groups looking for a relaxed stay near Mount Kenya.';

function baseUrl(): string {
  const base = process.env.BASE_URL;
  if (!base) throw new Error('BASE_URL environment variable is required (set it in .env).');
  return base.replace(/\/$/, '');
}

const noGtagNoise = (text: string, url: string) => /googletagmanager|google-analytics|ERR_/.test(text + url);

test.describe('Rates page editorial cleanup', () => {
  let rates: RatesPage;
  test.beforeEach(async ({ page }) => {
    rates = new RatesPage(page);
    await rates.goto();
  });

  test('every published room rate is unchanged in every period', async () => {
    for (const period of ALL_PERIODS) {
      await rates.selectPeriod(period);
      for (const [room, items] of Object.entries(TOGGLED_RATES[period])) {
        for (const [label, expected] of Object.entries(items)) {
          await expect(rates.roomRate(period, room, label), ).toHaveText(expected);
        }
        await expect(rates.panel(period, room).locator('.rate-item')).toHaveCount(Object.keys(items).length);
      }
    }
  });

  test('penthouse, cottage and buyout rates are unchanged', async ({ page }) => {
    for (const [label, amount] of FIXED_RATES) {
      const [kes, amt, usd] = [amount.split(' ')[0], amount.split(' ')[1], amount.split(' ')[2]];
      const row = page
        .locator('.rate-item, .cottage-period')
        .filter({ hasText: label })
        .filter({ hasText: `${kes} ${amt}` })
        .filter({ hasText: usd });
      await expect(row.first(), `${label} ${amount}`).toBeAttached();
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
      await rates.selectPeriod(period);
      for (const room of ['Twin Garden Room', 'Deluxe Room with Balcony']) {
        await expect(rates.roomDescription(period, room)).toBeVisible();
        await expect(rates.roomChips(period, room).first()).toBeVisible();
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
    await page.goto(baseUrl() + '/christmas-2026/');
    await expect(page.locator('#rates .room-desc', { hasText: 'three-bedroom cottage' })).toHaveText(COTTAGE_DESCRIPTION);
  });

  test('no photo count placeholder and no "See more photos" label, in the HTML or on screen', async ({ page, request }) => {
    for (const path of ['/', '/christmas-2026/']) {
      const html = await (await request.get(baseUrl() + path)).text();
      expect(html, path + ' raw HTML').not.toContain('{n}');
      expect(html.toLowerCase(), path + ' raw HTML').not.toContain('see more photos');
      await page.goto(baseUrl() + path);
      await page.waitForLoadState('networkidle');
      const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
      expect(text).not.toContain('{n}');
      expect(text).not.toContain('see more photos');
      expect(text).not.toMatch(/see all \d+ photos/);
      await expect(page.locator('[data-photo-count], .gallery-more, .gallery-link')).toHaveCount(0);
    }
  });

  test('photos stay clickable: lightbox opens, browses and closes from the property grid and a room strip', async ({ page }) => {
    const dialog = page.locator('dialog.viewer[open]');
    const tile = page.locator('#gallery ~ .photo-grid .grid-tile').first();
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
    await expect(dialog).toBeVisible();
    const first = await dialog.locator('figcaption').innerText();
    await dialog.locator('.v-next').click();
    expect(await dialog.locator('figcaption').innerText()).not.toBe(first);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    const roomPhoto = page.locator('[data-photo-strip="twin-garden"] .strip-item').first();
    await roomPhoto.scrollIntoViewIfNeeded();
    await roomPhoto.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('figcaption')).toContainText('Twin Garden Room');
    await page.keyboard.press('Escape');
  });

  test('café menu shows the Half Board and Full Board supplements under clear headings', async ({ page }) => {
    await page.goto(baseUrl() + '/?tab=menu');
    const plans = page.getByRole('group', { name: 'Meal plan supplements' });
    await expect(plans.getByRole('heading', { level: 3, name: 'Half Board — KES 2,500 per adult' })).toBeVisible();
    await expect(plans.getByRole('heading', { level: 3, name: 'Full Board — KES 3,300 per adult' })).toBeVisible();
    await expect(plans).toContainText('Breakfast and one three-course lunch or dinner. Beverages charged separately.');
    await expect(plans).toContainText('Breakfast, lunch and dinner, with a starter, main course and dessert for lunch and dinner. Beverages charged separately.');
    // Supplements, not à la carte items: they sit outside the menu grid and have no menu-item rows.
    await expect(page.locator('.menu-grid .meal-plan-banner')).toHaveCount(0);
    await expect(plans.locator('.menu-item')).toHaveCount(0);
    // Published prices are unchanged.
    const menu = await page.locator('#tab-menu').innerText();
    for (const price of ['1,500', '800', '1,000', '1,400', '3,000', '5,500']) expect(menu).toContain(price);
  });

  test('FAQs are concise and the FAQ structured data matches them', async ({ page }) => {
    const summaries = await page.locator('.faq details summary').allInnerTexts();
    expect(summaries).toEqual([
      'Where to stay before climbing Mt Kenya?',
      'Do you offer long stay or monthly rates?',
      'How do I book direct at Idan Barn Suites?',
    ]);
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

  test('Hotelogix and WhatsApp links are intact', async ({ page }) => {
    const hx = page.locator('[data-hotelogix]');
    await expect(hx).toHaveCount(4);
    for (const a of await hx.all()) {
      await expect(a).toHaveAttribute('href', /booking\.staygrid\.com/);
      await expect(a).toHaveAttribute('rel', /noreferrer/);
      await expect(a).toHaveAttribute('referrerpolicy', 'no-referrer');
    }
    for (const a of await page.locator('[data-whatsapp]').all()) {
      await expect(a).toHaveAttribute('href', /^https:\/\/wa\.me\/254762004417/);
    }
  });

  test('no console errors and no overflow at mobile and desktop widths', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' && !noGtagNoise(m.text(), m.location().url)) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [w, h] of [[390, 844], [1280, 900]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(baseUrl() + '/');
      for (const period of ALL_PERIODS) await rates.selectPeriod(period);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'overflow at ' + w).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
});
