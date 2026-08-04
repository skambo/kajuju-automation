# Test plan — Rates page period toggle

**Target:** {site url}} — "Select your travel period" control (`Weekday (Sun–Thu)` / `Weekend (Fri–Sat)` / `Peak / Festive`)

**Method:** Explored manually via Playwright MCP (browser_click + browser_snapshot before/after each toggle state) before drafting this plan, so the cases below reflect actual observed behavior, not assumptions.

## Known bug found during exploration (must be covered)

Switching the toggle to **Weekend (Fri–Sat)** or **Peak / Festive** removes the description paragraph and the amenity-tag pill list for **Twin Garden Room** and **Deluxe Room with Balcony** — only the heading, gallery link, and price grid remain. Switching back to **Weekday (Sun–Thu)** restores the description and tags. Reproduced twice (Weekend and Peak both trigger it). Prices themselves update correctly in all three states. This does not affect Penthouse Loft, Cottage, or Barn House Buyout, which show all period pricing simultaneously and aren't touched by the toggle at all.

**Root cause (confirmed via page source, not just the accessibility tree):** this is a static content gap, not a client side rendering bug. The toggle is driven by `showRates(period, btn)`, which just moves an `.active` class between three independently pre-built HTML blocks (`#offpeak-wd`, `#offpeak-we`, `#peak`), there is no shared data model or client side templating to fetch/compute from. Diffing the raw HTML confirms the Twin Garden Room description paragraph and amenity tag pills are present in `#offpeak-wd` but genuinely absent from the markup in `#offpeak-we` and `#peak` (not hidden via CSS, not skipped by JS logic, just not there). `showRates()` itself works correctly. Implication: the regression test below should assert on rendered DOM text within each `.rate-section` after activation, not on any network/data layer, there's no data layer to intercept.

## Positive test cases

1. On page load, "Weekday (Sun–Thu)" is the default active/selected period.
2. Clicking "Weekend (Fri–Sat)" updates Twin Garden Room and Deluxe Room prices to the weekend rate (e.g. Twin Garden Single B&B: Ksh 9,000 → Ksh 10,000).
3. Clicking "Peak / Festive" updates those same rooms' prices to the peak rate (e.g. Twin Garden Single B&B → Ksh 11,500).
4. Only one toggle button is active/selected at a time.
5. Switching back to "Weekday (Sun–Thu)" restores the original weekday prices exactly.
6. Cycling Weekday → Weekend → Peak → Weekday returns to identical original values (no drift).
7. Rooms not governed by the toggle (Penthouse Loft, Cottage — 3 bedrooms, Barn House Buyout) show unchanged, all-period pricing regardless of which toggle button is selected.
8. The active toggle button has a visually distinct selected state.
9. USD approximations move in step with KES prices at each period change, consistent with the stated KES 130 mid-market rate.

## Negative / edge test cases

1. **Regression for the confirmed bug**: assert the description paragraph and amenity tag pills for Twin Garden Room and Deluxe Room remain visible and non-empty in all three toggle states (Weekday, Weekend, Peak/Festive), not just Weekday.
2. Rapid toggle switching (e.g. Weekend → Peak in quick succession, or double clicking the same button) shouldn't leave two buttons marked active or produce a mismatched price/description pairing mid-transition.
3. Clicking the already-active toggle button should be a no op, no errors, no duplicate re render, no content flash.
4. Reloading the page after selecting Weekend or Peak resets the toggle to **Weekday (Sun–Thu)**confirmed there is no persistence mechanism for rate period (no localStorage/sessionStorage/URL param; only `?tab=` is handled, for the top nav tabs, and the default-active `.rate-section` is hardcoded to `offpeak-wd` in the markup). Assert reload always lands on Weekday with weekday prices and full descriptions, regardless of what was selected pre reload.
5. Keyboard-only interaction: Tab to each toggle button and activate with Enter/Space, same content update as a mouse click, with a visible focus indicator. (Not yet verified manually, flag as untested.)
6. Accessibility: verify the selected toggle button exposes its state programmatically (e.g. `aria-pressed`), not just via visual styling, worth checking the raw HTML/ARIA attributes rather than the accessibility tree snapshot alone.
7. No new console errors or failed network requests are introduced specifically by toggle interaction (separate from the pre-existing, unrelated `/favicon.ico` 404).
8. Narrow/mobile viewport: the three-button row remains tappable and doesn't visually break if it wraps.
