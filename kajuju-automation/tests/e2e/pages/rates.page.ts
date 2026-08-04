import { Locator } from '@playwright/test';
import { BasePage } from './base.page';

// Read lazily (inside goto(), not at module load) so it doesn't matter whether
// the test file's dotenv.config() call has run yet by the time this module is
// imported — this project runs as ESM ("type": "module" in package.json),
// where import evaluation order isn't guaranteed relative to sibling body code.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required to run the rates page tests (set it in .env).`);
  }
  return value;
}

export type RatePeriod = 'weekday' | 'weekend' | 'peak';

export const PERIOD_BUTTON_LABEL: Record<RatePeriod, string> = {
  weekday: 'Weekday (Sun–Thu)',
  weekend: 'Weekend (Fri–Sat)',
  peak: 'Peak / Festive',
};

const PERIOD_SECTION_ID: Record<RatePeriod, string> = {
  weekday: 'offpeak-wd',
  weekend: 'offpeak-we',
  peak: 'peak',
};

export const ALL_PERIODS: RatePeriod[] = ['weekday', 'weekend', 'peak'];

/**
 * Page object for the rates microsite's "Select your travel period" toggle
 * and the room cards whose price/description content it switches between.
 *
 * The toggle has no shared data model: each period is an independently
 * pre-built `.rate-section` block, and `showRates()` just moves an `.active`
 * class between them. See tests/e2e/rates-period-toggle.plan.md for the
 * root-cause note this reflects.
 */
export class RatesPage extends BasePage {
  async goto() {
    await super.goto(requireEnv('BASE_URL'));
  }

  periodButton(period: RatePeriod): Locator {
    return this.page.getByRole('button', { name: PERIOD_BUTTON_LABEL[period], exact: true });
  }

  async selectPeriod(period: RatePeriod) {
    await this.periodButton(period).click();
  }

  section(period: RatePeriod): Locator {
    return this.page.locator(`#${PERIOD_SECTION_ID[period]}`);
  }

  /** The single `.rate-section` currently marked active. */
  activeSection(): Locator {
    return this.page.locator('.rate-section.active');
  }

  /** The single toggle button currently marked active. */
  activeToggleButton(): Locator {
    return this.page.locator('.rate-toggle button.active');
  }

  roomCard(period: RatePeriod, roomName: string): Locator {
    return this.section(period)
      .locator('.room-card')
      .filter({ has: this.page.getByRole('heading', { level: 3, name: roomName }) });
  }

  roomDescription(period: RatePeriod, roomName: string): Locator {
    return this.roomCard(period, roomName).locator('.room-desc');
  }

  roomChips(period: RatePeriod, roomName: string): Locator {
    return this.roomCard(period, roomName).locator('.room-chips .chip');
  }

  /** The `.amount` cell (KES price + USD span) for one rate row, e.g. rateLabel = "Single B&B". */
  roomRate(period: RatePeriod, roomName: string, rateLabel: string): Locator {
    return this.roomCard(period, roomName)
      .locator('.rate-item')
      .filter({ has: this.page.locator('.label', { hasText: rateLabel }) })
      .locator('.amount');
  }

  roomRateUsd(period: RatePeriod, roomName: string, rateLabel: string): Locator {
    return this.roomRate(period, roomName, rateLabel).locator('.usd');
  }

  /**
   * Cards outside the toggle entirely (Penthouse Loft, Cottage, Barn House
   * Buyout) — none of these sit inside a .rate-section, so they render
   * identically regardless of the selected period. They don't share one
   * wrapper class (Penthouse Loft/Cottage use .room-card, Barn House Buyout
   * uses .buyout-card), so this walks up from the heading instead.
   */
  selfCateringRoomCard(roomName: string): Locator {
    return this.page
      .getByRole('heading', { level: 3, name: roomName })
      .locator('xpath=..');
  }
}
