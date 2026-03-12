# Kajuju Automation Framework

A hospitality-grade QA automation framework built with Playwright + TypeScript, solving real operational problems for a live accommodation business.

🔗 **Live site:** https://kajuju-automation.vercel.app  
🔗 **GitHub:** https://github.com/skambo/kajuju-automation


## The Problem

Kaju — a boutique property near Mt. Kenya — receives booking inquiries across WhatsApp, phone, and social media. Availability is manually tracked across Airbnb, Booking.com, a WordPress booking site, and direct bookings, with no single source of truth. Rate information is shared as PDFs. The result: overbooking risk, slow guest response times, and high manual overhead for a small team.

| # | Pain Point | Impact |
|---|---|---|
| 1 | No single source of truth | Bookings tracked separately across 4 channels — any lag causes overbooking |
| 2 | Manual rate card distribution | Staff send the same PDF and photos multiple times daily — no tracking, poor mobile UX |
| 3 | Three inbound inquiry channels | WhatsApp, phone, and social media each require different manual handling |
| 4 | Slow inquiry-to-response time | Guests wait minutes to hours for basic availability or rate information |
| 5 | No automated guest feedback loop | Post-stay follow-up and review solicitation is manual and inconsistent |
| 6 | Manual invoice creation | Ad hoc with no templated guest data pre-population |


## The Solution

This project defines and builds the Kajuju Automation Framework — a QA-engineered system that automates the inquiry-to-confirmation workflow while keeping human judgment in the loop for invoicing, payment verification, and channel management.

### Business Goals
- Respond to all inquiries within 60 seconds
- Eliminate double-booking risk with a central availability source
- Replace PDF rate cards with fast, mobile-first landing pages
- Automate post-stay feedback and Google review solicitation
- Reduce manual WhatsApp responses by 80% via AI FAQ handling
- Keep human oversight for invoicing and payment confirmation

### QA Engineering Goals
- Demonstrate E2E testing with Playwright and TypeScript (strict mode)
- Build an API testing layer against a live channel manager
- Write date-boundary and double-booking detection test suites
- Implement synthetic monitoring for all live production pages
- Build a Vercel serverless availability check wired to the booking form
- Run on a GitHub repo with CI/CD and automated alerting


## What's Been Built

### Phase 1 — Live and Running

**Mobile-first landing pages** (live on Vercel)
- Rate card page with weekday / weekend / peak tab toggle
- Workation packages page
- Booking form with phone/email validation, 2-night minimum enforcement, and real-time availability check

**Smoobu availability integration**
- Vercel serverless function proxies availability checks to the Smoobu channel manager API
- Guests are blocked from submitting requests for already-booked dates
- Fails open on API errors — if Smoobu is unreachable, the form submits and the team reviews the request manually rather than blocking a genuine guest due to an infrastructure problem
- API key kept server-side, never exposed to the browser

**Formspree form backend**
- Booking requests are submitted to Formspree, which emails the team immediately
- Chosen deliberately over a custom email backend — no server to maintain, free tier covers current volume, and we can review and make changes when/if volume increases. 
- Use of `data-testid` attributes in the HTML form

**GitHub Actions CI pipeline**
- Availability monitor runs every 4 hours via cron
- Detects double bookings across all 5 room types using soft assertions — collects every conflict across all rooms before failing, so one run displays the complete picture rather than stopping at the first problem found
- Sends a summary alert email on failure with a link to the actions log
- Manual trigger available via `workflow_dispatch`

**Playwright test suites**
- Synthetic monitors for all 3 production pages (load time, CTA presence, nav links)
- E2E booking form validation (phone formats, email regex, date constraints, dropdown coverage)
- Smoobu API reachability and property fetch tests
- Double booking detection across all 5 rooms

### Phase 2 (WIP)
- Twilio WhatsApp auto-responses and AI FAQ handling
- OpenAI GPT - booking summary generation
- Wave invoice automation with guest data pre-population
- WordPress → Smoobu webhook for automatic date blocking on confirmed payment

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Test framework | Playwright + TypeScript (strict mode) | E2E, API, and synthetic monitoring tests |
| Runtime | Node.js 20 | Test execution and serverless functions |
| CI/CD | GitHub Actions | Cron availability monitoring, alerting |
| Serverless | Vercel | Hosting + availability check proxy function |
| Channel manager | Smoobu API | Single source of truth for availability |
| Form backend | Formspree | Booking request emails — no custom server needed |
| Frontend | HTML / CSS / JS | Static pages, no build step required |
| Secrets (local) | dotenv | Local `.env` for API keys |
| Phase 2 | Twilio · OpenAI GPT-4o · Wave | WhatsApp automation, AI, invoicing |


## Project Structure

```
kajuju-automation/                          ← git root
├── .github/
│   └── workflows/
│       └── availability-monitor.yml        ← Cron CI pipeline
├── api/                                    ← Vercel serverless functions
│   ├── check-availability.js               ← Smoobu availability proxy
│   └── package.json                        ← CommonJS override (see architecture decisions)
└── kajuju-automation/                      ← all application and test code
    ├── apps/
    │   └── landing-pages/
    │       ├── index.html                  ← Rate card  →  /
    │       ├── workation/index.html        ← Workation  →  /workation
    │       └── book/index.html             ← Booking form  →  /book
    └── tests/
        ├── monitoring/
        │   └── health-check.spec.ts        ← Synthetic monitors
        ├── e2e/
        │   └── booking-form.spec.ts        ← Form E2E 
        └── api/
            ├── smoobu.spec.ts              ← API reachability + property fetch
            └── availability.spec.ts        ← Double booking detection 
```


## Key Engineering Decisions

**Smoobu as single source of truth**
All date blocking flows through the channel manager — never directly on Airbnb or Booking.com. Direct platform blocks don't sync back to Smoobu. This is enforced through monitoring and documented as a business rule.

**Fail open on availability errors**
When something goes wrong in a system, it can either fail closed (block everything) or fail open (let things through for a human to handle). Our availability check fails open: if the Smoobu API is unreachable, the booking form submits and the team reviews manually. 

**Date string comparison over `new Date()`**
Comparing `YYYY-MM-DD` strings directly avoids UTC midnight timezone drift that caused false positive double-booking alerts in early builds. Back-to-back bookings (checkout and check-in on the same date) correctly return no conflict.

**Soft assertions for overlap detection**
Rather than stopping at the first double-booking found, the availability test collects every conflict across all rooms, so one CI run surfaces the complete picture — all affected rooms in a single alert rather than requiring multiple fix-and-rerun cycles.


**Static HTML over a framework**
No build step, instant Vercel deploys, and easy for non-engineers to read and edit. The business logic lives in the serverless function and test suite — the pages don't need a framework.

**Formspree over a custom email backend**
No server to maintain, the free tier covers current booking volumes, and the integration is a single `action` attribute on a form. When Phase 2 requires more control, we can review this again.

**CommonJS in the `api/` folder**
The main `package.json` sets `"type": "module"` for Playwright compatibility. A local `package.json` with `"type": "commonjs"` in the `api/` folder overrides this for Vercel serverless functions without affecting the test suite.

**Testability built into the HTML**
Interactive elements in the landing pages all have `data-testid` attributes. This allows us to separate test selectors from styling or structural changes.

## Secrets & Where They Live

| Secret | Where | Purpose |
|---|---|---|
| `SMOOBU_API_KEY` | Local `.env` + GitHub Secrets + Vercel Env Vars | Smoobu API authentication |
| `SMOOBU_*_ROOM_ID` | Local `.env` + Vercel Env Vars | Room ID mapping for availability checks |
| `GMAIL_USERNAME` | GitHub Secrets | Alert email sender |
| `GMAIL_APP_PASSWORD` | GitHub Secrets | Gmail app password (16 chars, no spaces) |
| `ALERT_EMAIL` | GitHub Secrets | Recipient for double booking alerts |


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
npx playwright test                    # all tests
npx playwright test --reporter=list    # with visible console output
npx playwright test --ui               # interactive mode
```

## Current Test Status

| Suite | Tests | Passing | Skipped | Notes |
|---|---|---|---|---|
| `health-check.spec.ts` | 10 | 9 | 1 | Nav link needs `data-testid` — TODO |
| `booking-form.spec.ts` | 8 | 7 | 1 | 2-night minimum — might need unit test approach |
| `smoobu.spec.ts` | 1 | 1 | 0 | |
| `availability.spec.ts` | 3 | 3 | 0 | |
| **Total** | **22** | **20** | **2** | **91% passing** |


## Tech Debt

| ID | Issue | Priority |
|---|---|---|
| TD-009 | WordPress bookings don't sync to Smoobu — manual blocking required until Phase 2 webhook is built | High |
| TD-003 | Alert email doesn't specify which room has the conflict | Medium |
| TD-004 | Page titles show incorrect brand name on public pages | Medium |
| TD-005 | Images not fitting correctly on desktop | Low |
| TD-006 | Nav link Playwright test flaky — skipped with TODO | Low |
| TD-007 | Workation page slow load — image needs to be compressed (5.4MB) | Low |
| TD-008 | 2-night minimum checkout test skipped — might need unit test approach | Low |


## About

Built by Sandra — a QA engineer with 10 years of experience across manual and automation testing. This project is built during a career break running a hospitality business, using the operational challenges of the business itself as the test subject.

The goal is twofold: solve real problems encountered while running a new business, while staying up to date with a modern QA engineering stack — Playwright, TypeScript, REST API testing, CI/CD pipelines, and serverless architecture. 

AI is part of this project honestly and intentionally.The problem framing, design choices, testing decisions and engineering judgement are mine. I believe this reflects how QA engineering is evolving, not AI replacing testing, but engineers who know how to work effectively alongside AI producing better outcomes faster.
