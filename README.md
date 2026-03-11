# Kajuju Automation

**A production-grade QA automation framework built with Playwright + TypeScript, running against a live hospitality website.**

This project monitors real pages, validates booking form behaviour, and detects double bookings via a channel manager API — all automated through GitHub Actions CI running every 4 hours. Built as a portfolio project, the framework tests a live, revenue-generating website — not a demo app.

🔗 **Live site:** https://kajuju-automation.vercel.app  
🔗 **GitHub:** https://github.com/skambo/kajuju-automation

---

## What This Project Demonstrates

| Skill | Implementation |
|---|---|
| Playwright + TypeScript | Strict mode, typed API responses, scoped locators |
| API test automation | Live third-party REST API (channel manager) with auth headers |
| CI/CD pipeline | GitHub Actions — cron schedule, env secrets, email alerting |
| Synthetic monitoring | Page load thresholds, element presence, CTA validation |
| E2E form testing | Validation logic, date constraints, dropdown coverage |
| Double booking detection | Reservation overlap algorithm across 5 room types |
| Test architecture | Suite separation, skip strategy, no third-party testing |
| Real deployment | Vercel hosting, Formspree form backend, live production traffic |

---

## Tech Stack

**Testing:** Playwright · TypeScript (strict) · Node.js 20  
**CI/CD:** GitHub Actions · cron scheduling · email alerting  
**Frontend:** HTML/CSS/JS · Vercel  
**APIs:** Smoobu channel manager · Formspree  
**Phase 2:** Twilio WhatsApp · OpenAI GPT-4o · Wave invoicing

---

## Project Structure

```
kajuju-automation/
├── .github/
│   └── workflows/
│       └── availability-monitor.yml   ← Cron CI pipeline
└── kajuju-automation/
    ├── apps/
    │   └── landing-pages/             ← 3 live Vercel pages
    │       ├── index.html             ← Rate card with tab toggle
    │       ├── workation/index.html   ← Workation packages page
    │       └── book/index.html        ← Booking form with validation
    └── tests/
        ├── monitoring/
        │   └── health-check.spec.ts   ← Synthetic monitors (10 tests)
        ├── e2e/
        │   └── booking-form.spec.ts   ← Form validation E2E (8 tests)
        └── api/
            ├── smoobu.spec.ts         ← API reachability + property fetch
            └── availability.spec.ts   ← Double booking detection (3 tests)
```

---

## Test Suites

### Synthetic Monitoring — `health-check.spec.ts`
Monitors all three production pages on every CI run:
- Page loads successfully with correct status
- Load time within threshold (5s standard, 15s for image-heavy page)
- Critical CTAs present and pointing to correct URLs
- Rate toggle tabs visible and interactive
- Navigation links present across all pages

### Booking Form E2E — `booking-form.spec.ts`
Validates the guest-facing booking form end to end:
- All fields render correctly on load
- Phone validation: rejects short/invalid numbers, accepts Kenyan (+254) and international formats
- Email validation: rejects malformed addresses, accepts valid formats
- Date picker enforces today as minimum check-in
- All room types present in dropdown
- Submit button enabled with correct form state

### API Tests — `smoobu.spec.ts` + `availability.spec.ts`
Tests against the live Smoobu channel manager API:
- API key authentication and endpoint reachability
- All 5 properties returned with correct IDs
- Full reservation list fetched and parsed
- Overlap detection across all rooms using date string comparison (avoids UTC midnight false positives from `new Date()`)
- Produces a full conflict report before failing — all overlaps surfaced, not just the first

---

## CI Pipeline

```yaml
# .github/workflows/availability-monitor.yml
on:
  schedule:
    - cron: '0 */4 * * *'   # Every 4 hours
  workflow_dispatch:          # Manual trigger
```

The pipeline installs dependencies, runs the availability suite, and sends a single summary email alert if any overlap is detected. Secrets are stored in GitHub Actions — never in the repo.

---

## Key Architecture Decisions

**Date string comparison over `new Date()`**  
Comparing `YYYY-MM-DD` strings directly avoids UTC midnight timezone drift that caused false positive double-booking alerts. Back-to-back bookings (checkout and check-in on the same date) correctly return no conflict.

**Collect all failures before asserting**  
The overlap test gathers every conflict across all rooms before throwing, so one run surfaces the complete picture rather than stopping at the first failure.

**`test.skip` over deleting**  
Two tests are skipped with TODO comments explaining exactly why — a flaky nav locator and a date constraint that needs a unit test approach. Deleted tests are invisible technical debt.

**Don't test third-party reliability**  
Tests assert that our code behaves correctly — not that Formspree responds fast or that the channel manager API has 100% uptime.

**CommonJS not ESNext**  
`"type": "module"` breaks Playwright test discovery. Documented here to avoid re-encountering it.

---

## Local Setup

```bash
git clone https://github.com/skambo/kajuju-automation.git
cd kajuju-automation/kajuju-automation
npm install
npx playwright install chromium
```

Create `.env` in `kajuju-automation/kajuju-automation/`:

```
SMOOBU_API_KEY=your_key_here
SMOOBU_CORAL_ROOM_ID=your_id
SMOOBU_JADE_ROOM_ID=your_id
SMOOBU_PEBBLE_ROOM_ID=your_id
SMOOBU_PENTHOUSE_ID=your_id
SMOOBU_COTTAGE_ID=your_id
```

```bash
npx playwright test                                              # all tests
npx playwright test tests/api/availability.spec.ts --reporter=list  # one suite
npx playwright test --ui                                         # interactive mode
```

---

## Current Test Status

| Suite | Tests | Passing | Skipped | Notes |
|---|---|---|---|---|
| `health-check.spec.ts` | 10 | 9 | 1 | Nav link needs `data-testid` |
| `booking-form.spec.ts` | 8 | 7 | 1 | 2-night minimum — needs unit test |
| `smoobu.spec.ts` | 1 | 1 | 0 | |
| `availability.spec.ts` | 3 | 3 | 0 | |
| **Total** | **22** | **20** | **2** | **91% passing** |

---

## Roadmap

- **Next:** Smoobu availability check wired into booking form pre-submission
- **Week 3:** Page object model refactor · 2-night minimum unit test
- **Phase 2:** Twilio WhatsApp alerts · OpenAI booking summaries · Wave invoice automation

---

## About

Built by Sandra — QA engineer with 10 years of experience, currently running a hospitality business.

Rather than stepping away from tech during this chapter, I've used it as an opportunity to automate the real operational problems I face as a business owner — availability monitoring, double booking detection, guest-facing booking flows, and CI alerting. Everything here runs against live production traffic, not a toy app.

This project keeps me hands-on with current tooling and reflects how I've always approached QA: find the real problem, build something that actually solves it, and make sure it doesn't break quietly.
