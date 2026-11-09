import { Locator } from '@playwright/test';
import { BasePage } from './base.page';

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
  periodButton(period: RatePeriod): Locator {
    return this.page.getByRole('button', { name: PERIOD_BUTTON_LABEL[period], exact: true });
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

  /** The one card for a room. */
  roomCard(roomName: string): Locator {
    return this.page
      .locator('.room-card')
      .filter({ has: this.page.getByRole('heading', { level: 3, name: roomName }) });
  }

  /** The rate panel for one room and period. */
  panel(period: RatePeriod, roomName: string): Locator {
    return this.roomCard(roomName).locator(`.rate-grid[data-period="${PERIOD_PANEL_ID[period]}"]`);
  }

  roomDescription(roomName: string): Locator {
    return this.roomCard(roomName).locator('.room-desc');
  }

  roomChips(roomName: string): Locator {
    return this.roomCard(roomName).locator('.room-chips .chip');
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
      .locator('.room-card, .buyout-card')
      .filter({ has: this.page.getByRole('heading', { level: 3, name: roomName }) });
  }
}
