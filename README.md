# Kajuju Automation Framework

A hospitality-grade QA automationframework built with Playwright + TypeScript, solving operational problems for a hospitality business.

🔗 **Live site:** https://idan-barn-suites-git-main-skambo-2710s-projects.vercel.app/

🔗 **GitHub:** https://github.com/skambo/kajuju-automation


## The Problem

Kaju — a boutique property near Mt. Kenya — receives booking inquiries across WhatsApp, phone, and social media. Availability is manually tracked across Airbnb, Booking.com, a WordPress booking site, and direct bookings, with no single source of truth. Rate information is shared as PDFs. The result: overbooking risk, slow guest response times, and high manual overhead for a small team.

| # | Pain Point | Impact |
|---|-----------|--------|
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
- Fails open on API errors — if Smoobu is unreachable, the form submits and the team reviews manually
- API key kept server-side, never exposed to the browser

**Formspree form backend**
- Booking requests are submitted to Formspree, which emails the team immediately
- Chosen deliberately over a custom email backend — no server to maintain, free tier covers current volume

**GitHub Actions CI pipeline**
- Availability monitor runs every 4 hours via cron
- Detects double bookings across all 5 room types using soft assertions
- Sends a summary alert email on failure with a link to the actions log
- Manual trigger available via workflow_dispatch

**Playwright test suites**
- Synthetic monitors for all 3 production pages (load time, CTA presence, nav links)
- E2E booking form validation (phone formats, email regex, date constraints, dropdown coverage)
- Smoobu API reachability and property fetch tests
- Double booking detection across all 5 rooms


### Phase 2 — WhatsApp Bot: LIVE ✅

**Kajuju WhatsApp Bot** is deployed and running at `https://kajuju-production.up.railway.app`

Every incoming WhatsApp message is automatically replied to with the Idan Barn welcome message, rates link, and booking link — with zero manual intervention.

**Architecture:**
- Node.js + Express bot server (`apps/bot-server/index.js`)
- Listens on `POST /webhook`
- Deployed permanently on Railway (auto-restarts, always on)
- Auto-deploys on every push to `master` branch of `skambo/kajuju-bot` on GitHub
- Wired to Twilio WhatsApp Sandbox

**What the bot sends on any incoming message:**
```
Hi! 👋 Welcome to Kaju  — boutique lodge at the foot of Mt. Kenya.

🏡 View our rooms & rates: 
📅 Book your stay:

Questions about availability, meals, or special requests? Just reply here and we'll get back to you shortly!

```

**Current status: Twilio Sandbox** — works for opted-in test numbers. Production WhatsApp Business API (Meta approval) is the next milestone.

**Bot repo:** `https://github.com/skambo/kajuju-bot`
**Railway project:** `https://railway.com/project/705ac21c-7bc0-46da-bdb9-f4d03a2f0530`


### Phase 2 (WIP — Remaining)
- Move from Twilio Sandbox to WhatsApp Business API (Meta approval required)
- Proactive outbound messages to known channel users via approved message templates
- OpenAI GPT — intelligent FAQ handling (availability, meals, special requests)
- Wave invoice automation with guest data pre-population
- WordPress → Smoobu webhook for automatic date blocking on confirmed payment


## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Test framework | Playwright + TypeScript (strict mode) | E2E, API, and synthetic monitoring tests |
| Runtime | Node.js 20 | Test execution and serverless functions |
| CI/CD | GitHub Actions | Cron availability monitoring, alerting |
| Serverless | Vercel | Hosting + availability check proxy function |
| Channel manager | Smoobu API | Single source of truth for availability |
| Form backend | Formspree | Booking request emails — no custom server needed |
| Frontend | HTML / CSS / JS | Static pages, no build step required |
| WhatsApp bot | Node.js + Express + Twilio | Auto-response to all WhatsApp inquiries |
| Bot hosting | Railway | Permanent deployment, auto-redeploy on push |
| Secrets (local) | dotenv | Local .env for API keys |
| Phase 2 (next) | OpenAI GPT-4o · Wave | AI FAQ handling, invoicing |

## Project Structure

```
kajuju-automation/                          ← git root
├── .github/
│   └── workflows/
│       └── availability-monitor.yml        ← Cron CI pipeline
├── api/                                    ← Vercel serverless functions
│   ├── check-availability.js               ← Smoobu availability proxy
│   └── package.json                        ← CommonJS override
└── kajuju-automation/                      ← all application and test code
    ├── apps/
    │   ├── bot-server/
    │   │   ├── index.js                    ← WhatsApp bot (deployed on Railway)
    │   │   └── package.json
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

**Smoobu as single source of truth** — All date blocking flows through the channel manager — never directly on Airbnb or Booking.com. Direct platform blocks don't sync back to Smoobu.

**Fail open on availability errors** — When the Smoobu API is unreachable, the booking form submits and the team reviews manually rather than blocking a genuine guest.

**Date string comparison over new Date()** — Comparing YYYY-MM-DD strings directly avoids UTC midnight timezone drift that caused false positive double-booking alerts in early builds.

**Soft assertions for overlap detection** — Rather than stopping at the first double-booking found, the availability test collects every conflict across all rooms in a single CI run.

**Static HTML over a framework** — No build step, instant Vercel deploys, and easy for non-engineers to read and edit.

**Formspree over a custom email backend** — No server to maintain, free tier covers current volumes.

**CommonJS in the api/ folder** — The main package.json sets "type": "module" for Playwright compatibility. A local package.json with "type": "commonjs" in api/ overrides this for Vercel.

**Railway over Heroku/Render for bot hosting** — GitHub-connected deploys, always-on free tier suitable for current volume, simple environment variable management.

**Twilio Sandbox first** — Allows full end-to-end testing without Meta WhatsApp Business API approval. Sandbox requires recipients to opt in via a join code.


## Secrets & Where They Live

| Secret | Where | Purpose |
|--------|-------|---------|
| SMOOBU_API_KEY | Local .env + GitHub Secrets + Vercel Env Vars | Smoobu API authentication |
| SMOOBU_*_ROOM_ID | Local .env + Vercel Env Vars | Room ID mapping for availability checks |
| GMAIL_USERNAME | GitHub Secrets | Alert email sender |
| GMAIL_APP_PASSWORD | GitHub Secrets | Gmail app password (16 chars, no spaces) |
| ALERT_EMAIL | GitHub Secrets | Recipient for double booking alerts |



## Local Setup

```bash
git clone
cd kajuju-automation/kajuju-automation
npm install
npx playwright install chromium
```

Create `.env` in `kajuju-automation/kajuju-automation/`:

```
SMOOBU_API_KEY=your_key_here
SMOOBU_C_ROOM_ID=your_id
SMOOBU_J_ROOM_ID=your_id
SMOOBU_P_ROOM_ID=your_id
SMOOBU_PENT_ID=your_id
SMOOBU_COTTAGE_ID=your_id
```

```bash
npx playwright test                    # all tests
npx playwright test --reporter=list    # with visible console output
npx playwright test --ui               # interactive mode
```

**To run the bot locally:**
```bash
cd apps/bot-server
node index.js
# Bot runs on port 3000
```


## Current Test Status

| Suite | Tests | Passing | Skipped | Notes |
|-------|-------|---------|---------|-------|
| health-check.spec.ts | 10 | 9 | 1 | Nav link needs data-testid — TODO |
| booking-form.spec.ts | 8 | 7 | 1 | 2-night minimum — might need unit test approach |
| smoobu.spec.ts | 1 | 1 | 0 | |
| availability.spec.ts | 3 | 3 | 0 | |
| **Total** | **22** | **20** | **2** | **91% passing** |


## Tech Debt

| ID | Issue | Priority |
|----|-------|----------|
| TD-001 | WordPress bookings don't sync to Smoobu — manual blocking required until Phase 2 webhook is built | High |
| TD-002 | Alert email doesn't specify which room has the conflict | Medium |
| TD-003 | Page titles show incorrect brand name on public pages | Medium |
| TD-004 | Images not fitting correctly on desktop | Low |
| TD-005 | Nav link Playwright test flaky — skipped with TODO | Low |
| TD-006 | Workation page slow load — image needs to be compressed (5.4MB) | Low |
| TD-007 | 2-night minimum checkout for workation package test skipped — might need unit test approach | Low |
| TD-008 | Bot currently replies identically to all messages — no keyword detection or smart routing yet | Medium |
| TD-009 | Twilio Sandbox requires manual opt-in from each guest (join code) — blocked on Meta approval for production | High |
| TD-010 | Known channel users (Airbnb, Booking.com guests) need proactive outreach template once Meta approved | Medium |


## Development Methodology

Strategy, framework selection, system design, CI/CD architecture, and all decisions about what to build and why are mine. Claude is used as a thinking partner — working through edge cases and debugging. Code is reviewed, debugged, and validated by me before merging — including catching and fixing issues the AI introduced, such as a UTC midnight timezone bug in the double-booking detection logic. This reflects how I work: AI handles the repetitive thinking, I own the decisions and the quality bar.

## About

Built by Sandra — a QA engineer with 10 years of experience across manual and automation testing. This project is built during a career break running a hospitality business, using the operational challenges of the business itself as the test subject.

The goal is twofold: solve real problems encountered while running a new business, while staying up to date with a modern QA engineering stack — Playwright, TypeScript, REST API testing, CI/CD pipelines, serverless architecture, and WhatsApp automation.
