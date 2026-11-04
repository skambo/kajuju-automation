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

const PERIOD_PANEL_ID: Record<RatePeriod, string> = {
  weekday: 'offpeak-wd',
  weekend: 'offpeak-we',
  peak: 'peak',
};

export const ALL_PERIODS: RatePeriod[] = ['weekday', 'weekend', 'peak'];

/**
 * Page object for the rates microsite's "Select your travel period" toggle
 * and the room cards whose prices it switches.
 *
 * Each room has ONE card (one description, one set of amenity chips, one photo strip) holding
 * three `.rate-grid[data-period]` panels. `showRates()` moves an `.active` class between the
 * panels and updates `aria-pressed` on the toggle buttons; the description is never touched.
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

  /** The rate panels (one per toggled room) for a period. */
  panels(period: RatePeriod): Locator {
    return this.page.locator(`.rate-grid[data-period="${PERIOD_PANEL_ID[period]}"]`);
  }

  /** The rate panels currently shown, one per toggled room. */
  activePanels(): Locator {
    return this.page.locator('.rate-grid[data-period].active');
  }

  /** The single toggle button currently marked active. */
  activeToggleButton(): Locator {
    return this.page.locator('.rate-toggle button.active');
  }

  /** The one card for a room. The period argument is kept so existing call sites read the same. */
  roomCard(_period: RatePeriod, roomName: string): Locator {
    return this.page
      .locator('.room-card')
      .filter({ has: this.page.getByRole('heading', { level: 3, name: roomName }) });
  }

  /** The rate panel for one room and period. */
  panel(period: RatePeriod, roomName: string): Locator {
    return this.roomCard(period, roomName).locator(`.rate-grid[data-period="${PERIOD_PANEL_ID[period]}"]`);
  }

  roomDescription(period: RatePeriod, roomName: string): Locator {
    return this.roomCard(period, roomName).locator('.room-desc');
  }

  roomChips(period: RatePeriod, roomName: string): Locator {
    return this.roomCard(period, roomName).locator('.room-chips .chip');
  }

  /** The `.amount` cell (KES price + USD span) for one rate row, e.g. rateLabel = "Single B&B". */
  roomRate(period: RatePeriod, roomName: string, rateLabel: string): Locator {
    return this.panel(period, roomName)
      .locator('.rate-item')
      .filter({ has: this.page.locator('.label', { hasText: rateLabel }) })
      .locator('.amount');
  }

  roomRateUsd(period: RatePeriod, roomName: string, rateLabel: string): Locator {
    return this.roomRate(period, roomName, rateLabel).locator('.usd');
  }

  /** The card of a room that is not governed by the toggle (Penthouse Loft, Cottage, Barn House Buyout). */
  selfCateringRoomCard(roomName: string): Locator {
    return this.page
      .getByRole('heading', { level: 3, name: roomName })
      .locator('xpath=..');
  }
}
