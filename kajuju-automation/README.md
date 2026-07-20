# Kajuju Automation Framework

A hospitality-grade QA automation framework built with Playwright + TypeScript, solving operational problems for a hospitality business.

[![Channel Manager Integration Tests](https://github.com/skambo/kajuju-automation/actions/workflows/channel-manager-tests.yml/badge.svg)](https://github.com/skambo/kajuju-automation/actions/workflows/channel-manager-tests.yml)

🔗 **Live site:** Shared privately

🔗 **GitHub:** https://github.com/skambo/kajuju-automation


## The Problem

Kajuju, a boutique property near Mt. Kenya, receives booking inquiries across WhatsApp, phone, and social media. Availability is manually tracked across Airbnb, Booking.com, a WordPress booking site, and direct bookings, with no single source of truth. Rate information is shared as PDFs. The result: overbooking risk, slow guest response times, and high manual overhead for a small team.

| # | Pain Point | Impact |
|---|-----------|--------|
| 1 | No single source of truth | Bookings tracked separately across 4 channels — any lag causes overbooking |
| 2 | Manual rate card distribution | Staff send the same PDF and photos multiple times daily — no tracking, poor mobile UX |
| 3 | Three inbound inquiry channels | WhatsApp, phone, and social media each require different manual handling |
| 4 | Slow inquiry-to-response time | Guests wait for basic availability or rate information |
| 5 | No automated guest feedback loop | Post-stay follow-up and review solicitation is manual and inconsistent |
| 6 | Manual invoice creation | Ad hoc with no templated guest data pre-population |

## About

Built by Sandra, a QA engineer with 10 years of experience across manual and automation testing. This project is built during a career break running a hospitality business, using the operational challenges of the business itself as the test subject.

The goal is twofold: solve real problems encountered while running a new business, while staying up to date with a modern QA engineering stack — Playwright, TypeScript, REST API testing, CI/CD pipelines, serverless architecture,WhatsApp automation and AI trends in QA. 

## The Solution

This project defines and builds the Kajuju Automation Framework, a QA-engineered system that automates the inquiry-to-confirmation workflow while keeping human judgment in the loop for invoicing, payment verification, and channel management.

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

**Channel manager integration tests**
- A contract/integration suite (`tests/api/availability.spec.ts`) runs against the [Channex](https://channex.io) staging sandbox, a free developer sandbox.
- It creates real ARI (availability, rate, inventory) writes against a sandbox property, reads them back through the API, and asserts the same double-booking-prevention logic used in `api/check-availability.js` still holds against real API responses, not mocked ones
- Runs daily on a schedule via GitHub Actions (badge above), plus on-demand via `workflow_dispatch`
- See [Channel Manager Testing](#channel-manager-testing) below for why we're using a sandbox
- The live booking form's availability proxy (`api/check-availability.js`) currently points at at a previously trialled channel manager, which has been replaced; that swap is tracked separately from the test suite above and doesn't block it

**Formspree form backend**
- Booking requests are submitted to Formspree, which emails the team immediately
- Chosen deliberately over a custom email backend as there's no server to maintain, free tier covers current volume

**GitHub Actions CI pipeline**
- Site uptime monitor runs every 4 hours via cron
- Checks all production pages load correctly and CTAs are present
- Sends alert email on failure with link to the failing page
- Manual trigger available via `workflow_dispatch`

**Playwright test suites**
- Synthetic monitors for all 3 production pages (load time, CTA presence, nav links)
- E2E booking form validation (phone formats, email regex, date constraints, dropdown coverage)


### Phase 2 — WhatsApp Bot: LIVE ✅

**Kajuju WhatsApp Bot** is deployed and running at `https://kajuju-production.up.railway.app`

Every incoming WhatsApp message is automatically replied to with the welcome message, rates link, and booking link, with no manual intervention.

**Architecture:**
- Node.js + Express bot server (`apps/bot-server/index.js`)
- Listens on `POST /webhook`
- Deployed permanently on Railway (auto-restarts, always on)
- Auto-deploys on every push to `master` branch of `skambo/kajuju-bot` on GitHub
- Wired to Twilio WhatsApp Sandbox

**What the bot sends on any incoming message** (structure shown, property name redacted for this portfolio):
```
Hi! 👋 Welcome to Kajuju, a boutique lodge at the foot of Mt. Kenya.

🏡 View our rooms & rates: 
📅 Book your stay: 

Questions about availability, meals, or special requests? Just reply here and we'll get back to you shortly!
```

**Current status: Twilio Sandbox** — works for opted-in test numbers. Moving to production WhatsApp Business API (Meta approval) is on hold, decision pending.

**Bot repo:** `https://github.com/skambo/kajuju-bot`
**Railway project:** `https://railway.com/project/705ac21c-7bc0-46da-bdb9-f4d03a2f0530`


### Phase 2 (WIP — Remaining)
- Proactive outbound messages to known channel users via approved WhatsApp message templates
- OpenAI GPT: Intelligent FAQ handling (availability, meals, special requests, local info)
- Wave invoice automation ⏸️ _Paused — needs channel manager integration first_
- WhatsApp Business API (Meta approval) ⏸️ _Paused — decision pending_


### Phase 3 — Agentic Testing Layer

The Playwright suites above answer "does the button work." They don't answer "could a
real guest actually use this site to figure out if they want to stay here." Phase 3 adds
a second, deliberately different kind of test: a Claude Sonnet 5 agent that role-plays a
persona (currently a first-time guest) and browses the live site through Playwright
MCP, the same accessibility-tree tools a human browsing agent would use, to answer the persona's real questions (price, minimum nights, what
a booking actually involves) using only what it finds on the page.

This is based on the approach Slack Engineering documented in "Agentic Testing: Where
Agents Fit in the E2E Testing Stack" (June 2026), agentic tests as a complement to
deterministic E2E, not a replacement for it.

**Current status:** built and smoke-tested locally, runs on a weekly
schedule and on-demand via `workflow_dispatch`, and reports whether the persona could
complete their goal, what confused them, and what's missing, plus real token-usage and
cost figures for every run, since this isn't free the way a Playwright
assertion is.

See [`agentic/TESTING.md`](agentic/TESTING.md) for how to run it, a full writeup covering the
Playwright MCP bridging and design decisions is coming in `agentic/README.md`.


## Channel Manager Testing

This project's core differentiator is a suite that catches double bookings by treating
the channel manager as an API dependency instead of trusting it blindly.

The suite runs against the Channex staging sandbox, instead of a live paid
connection.

- It's a real API with real auth, real validation, real latency, and a real async
  task queue behind writes.
- It's free, so the suite runs unattended on a daily schedule without tying test
  reliability to a paid subscription staying active.
- It isolates test data from any production channel manager account, so a bad test run
 doesn't touch real guest bookings.

**What the suite proves:**
1. The Channex sandbox property, room type, and rate plan resolve correctly by name (contract check)
2. Rate and availability writes are accepted by the ARI endpoints (`POST /restrictions`, `POST /availability`)
3. Those writes are correctly readable back through the API once the async task queue processes them (read-your-write, with polling, Channex applies ARI updates asynchronously)
4. A simulated sell-out (availability driven to 0 for a date range) is correctly flagged as unavailable by the same conflict detection logic that runs in `api/check-availability.js`
5. A back-to-back booking (one guest's checkout day is the next guest's check-in day) is correctly flagged. 

Once the live channel manager is confirmed, `api/check-availability.js`
will be rewritten against it, the Channex suite here is the reusable pattern for
testing that integration in a sandbox first.


## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Test framework | Playwright + TypeScript (strict mode) | E2E, API, and synthetic monitoring tests |
| Runtime | Node.js 20 | Test execution and serverless functions |
| CI/CD | GitHub Actions | Cron uptime monitoring, alerting |
| Serverless | Vercel | Hosting + availability check proxy function |
| Channel manager (test target) | Channex staging sandbox | Free sandbox API for the ARI contract/integration suite |
| Channel manager (production, pending) | In-trial | Will replace previous manager as the live booking form's availability source of truth |
| Form backend | Formspree | Booking request emails, no custom server needed |
| Frontend | HTML / CSS / JS | Static pages, no build step required |
| WhatsApp bot | Node.js + Express + Twilio | Auto-response to all WhatsApp inquiries |
| Bot hosting | Railway | Permanent deployment, auto-redeploy on push |
| Secrets (local) | dotenv | Local .env for API keys |
| Phase 2 (next) | OpenAI GPT-4o | AI FAQ handling |

## Project Structure

```
kajuju-automation/                          ← git root
├── .github/
│   └── workflows/
│       ├── availability-monitor.yml        ← Cron CI pipeline (site uptime monitor)
│       └── channel-manager-tests.yml       ← Cron CI pipeline (Channex sandbox integration suite)
├── api/                                    ← Vercel serverless functions
│   └── check-availability.js              ← Availability proxy (awaiting channel manager rewrite)
└── kajuju-automation/                      ← All application and test code
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
            └── availability.spec.ts        ← Channex sandbox contract/integration suite
```


## Key Engineering Decisions

**Fail open on availability errors** — When the channel manager API is unreachable, the booking form submits and the team reviews manually rather than blocking a genuine guest.

**Date string comparison over new Date()** — Comparing YYYY-MM-DD strings directly avoids UTC midnight timezone drift that caused false positive double-booking alerts in early builds.

**Soft assertions for overlap detection** — Rather than stopping at the first double-booking found, the availability test collects every conflict across all rooms in a single CI run.

**Static HTML over a framework** — No build step, instant Vercel deploys, and easy for non-engineers to read and edit.

**Formspree over a custom email backend** — No server to maintain, free tier covers current volumes.

**CommonJS in the api/ folder** — The main package.json sets "type": "module" for Playwright compatibility. A local package.json with "type": "commonjs" in api/ overrides this for Vercel.

**Railway over Heroku/Render for bot hosting** — GitHub-connected deploys, always-on free tier suitable for current volume, simple environment variable management.

**Twilio Sandbox first** — Allows full end-to-end testing without Meta WhatsApp Business API approval. Sandbox requires recipients to opt in via a join code.


## Secrets

| Secret | Where | Purpose |
|--------|-------|---------|
| CHANNEX_API_KEY | Local .env / GitHub Secrets | Channex sandbox — channel manager integration test suite |
| GMAIL_USERNAME | GitHub Secrets | Alert email sender |
| GMAIL_APP_PASSWORD | GitHub Secrets | Gmail app password (16 chars, no spaces) |
| ALERT_EMAIL | GitHub Secrets | Recipient for uptime alerts |




## Local Setup

```bash
git clone
cd kajuju-automation/kajuju-automation
npm install
npx playwright install chromium
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

| Suite | Status | Notes |
|-------|--------|-------|
| health-check.spec.ts | Passing, with one skip | Nav link needs data-testid — TODO |
| booking-form.spec.ts | Passing, with one skip | 2-night minimum, might need unit test approach |
| availability.spec.ts | Passing | Channex sandbox contract/integration suite — runs daily in CI |


## Tech Debt

| ID | Issue | Priority |
|----|-------|----------|
| TD-001 | `api/check-availability.js` (live booking form proxy) still needs rewrite once channel manager is onboarded — `tests/api/` (now runs against the Channex sandbox) | Medium |
| TD-002 | Alert email doesn't specify which page failed | Medium |
| TD-003 | Page `<title>` tags on the live landing pages are inconsistent, guest-facing production content, out of scope for this pass | Medium |
| TD-004 | Images not fitting correctly on desktop | Low |
| TD-005 | Nav link Playwright test flaky — skipped with TODO | Low |
| TD-006 | ~~Workation page slow load — hero image needs compression (5.4MB)~~ Fixed — compressed to WebP | Done |
| TD-007 | 2-night minimum checkout test skipped, needs unit test approach | Low |
| TD-008 | Bot replies identically to all messages, no keyword detection or smart routing yet | Medium |
| TD-009 | Twilio Sandbox requires manual opt-in from each guest. Meta approval decision pending | High |


## Development Methodology

Strategy, framework selection, system design, CI/CD architecture, and all decisions about what to build and why are mine. Claude is used as a thinking partner, working through edge cases and debugging. Code is reviewed, debugged, and validated by me before merging, including catching and fixing issues the AI introduced, such as a UTC midnight timezone bug in the double booking detection logic. This reflects how I work, AI handles the repetitive thinking, I own the decisions and the quality bar.

