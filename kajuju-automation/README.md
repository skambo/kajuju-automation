# Kajuju Automation Framework

A hospitality-grade QA automation framework built with Playwright + TypeScript, solving operational problems for a hospitality business.

🔗 **Live site:** Shared privately

🔗 **GitHub:** https://github.com/skambo/kajuju-automation


## The Problem

Kajuju — a boutique property near Mt. Kenya — receives booking inquiries across WhatsApp, phone, and social media. Availability is manually tracked across Airbnb, Booking.com, a WordPress booking site, and direct bookings, with no single source of truth. Rate information is shared as PDFs. The result: overbooking risk, slow guest response times, and high manual overhead for a small team.

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

**Availability integration** ⚠️ _Smoobu deprecated — new channel manager pending_
- Vercel serverless function (`api/check-availability.js`) was built to proxy availability checks to Smoobu
- Smoobu is no longer in use — new channel manager trial has been requested (awaiting response)
- Once new channel manager is onboarded: `check-availability.js` and `tests/api/` will be fully rewritten
- Until then: booking form submits and the team reviews availability manually

**Formspree form backend**
- Booking requests are submitted to Formspree, which emails the team immediately
- Chosen deliberately over a custom email backend — no server to maintain, free tier covers current volume

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

Every incoming WhatsApp message is automatically replied to with the welcome message, rates link, and booking link — with zero manual intervention.

**Architecture:**
- Node.js + Express bot server (`apps/bot-server/index.js`)
- Listens on `POST /webhook`
- Deployed permanently on Railway (auto-restarts, always on)
- Auto-deploys on every push to `master` branch of `skambo/kajuju-bot` on GitHub
- Wired to Twilio WhatsApp Sandbox

**What the bot sends on any incoming message:**
```
Hi! 👋 Welcome to Idan Barn Suites & Café — boutique lodge at the foot of Mt. Kenya.

🏡 View our rooms & rates: 
📅 Book your stay: 

Questions about availability, meals, or special requests? Just reply here and we'll get back to you shortly!
```

**Current status: Twilio Sandbox** — works for opted-in test numbers. Moving to production WhatsApp Business API (Meta approval) is on hold — decision pending.

**Bot repo:** `https://github.com/skambo/kajuju-bot`
**Railway project:** `https://railway.com/project/705ac21c-7bc0-46da-bdb9-f4d03a2f0530`


### Phase 2 (WIP — Remaining)
- Proactive outbound messages to known channel users via approved WhatsApp message templates
- OpenAI GPT — intelligent FAQ handling (availability, meals, special requests, local info)
- Wave invoice automation ⏸️ _Paused — needs channel manager integration first_
- WhatsApp Business API (Meta approval) ⏸️ _Paused — decision pending_


## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Test framework | Playwright + TypeScript (strict mode) | E2E, API, and synthetic monitoring tests |
| Runtime | Node.js 20 | Test execution and serverless functions |
| CI/CD | GitHub Actions | Cron uptime monitoring, alerting |
| Serverless | Vercel | Hosting + availability check proxy function |
| Channel manager | TBD (trial pending) | Will replace Smoobu as availability source of truth |
| Form backend | Formspree | Booking request emails — no custom server needed |
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
│       └── availability-monitor.yml        ← Cron CI pipeline (site uptime monitor)
├── api/                                    ← Vercel serverless functions
│   └── check-availability.js              ← Availability proxy (awaiting channel manager rewrite)
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
            ├── smoobu.spec.ts              ← ⚠️ Deprecated — to be replaced with new channel manager tests
            └── availability.spec.ts        ← ⚠️ Deprecated — to be replaced with new channel manager tests
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


## Secrets & Where They Live

| Secret | Where | Purpose |
|--------|-------|---------|
| SMOOBU_API_KEY | Local .env ⚠️ | Deprecated — remove once new manager onboarded |
| GMAIL_USERNAME | GitHub Secrets | Alert email sender |
| GMAIL_APP_PASSWORD | GitHub Secrets | Gmail app password (16 chars, no spaces) |
| ALERT_EMAIL | GitHub Secrets | Recipient for uptime alerts |
| _API_KEY | _Not yet set_ | Will replace SMOOBU_API_KEY once trial confirmed |



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

| Suite | Tests | Passing | Skipped | Notes |
|-------|-------|---------|---------|-------|
| health-check.spec.ts | 10 | 9 | 1 | Nav link needs data-testid — TODO |
| booking-form.spec.ts | 8 | 7 | 1 | 2-night minimum — might need unit test approach |
| smoobu.spec.ts | 1 | — | — | ⚠️ Deprecated — not run in CI |
| availability.spec.ts | 3 | — | — | ⚠️ Deprecated — not run in CI |
| **Total (active)** | **18** | **16** | **2** | |


## Tech Debt

| ID | Issue | Priority |
|----|-------|----------|
| TD-001 | `api/check-availability.js` and `tests/api/` need full rewrite once new channel manager is confirmed | High |
| TD-002 | Alert email doesn't specify which page failed | Medium |
| TD-003 | Page titles show incorrect brand name on some pages | Medium |
| TD-004 | Images not fitting correctly on desktop | Low |
| TD-005 | Nav link Playwright test flaky — skipped with TODO | Low |
| TD-006 | Workation page slow load — hero image needs compression (5.4MB) | Low |
| TD-007 | 2-night minimum checkout test skipped — needs unit test approach | Low |
| TD-008 | Bot replies identically to all messages — no keyword detection or smart routing yet | Medium |
| TD-009 | Twilio Sandbox requires manual opt-in from each guest — Meta approval decision pending | High |


## Development Methodology

Strategy, framework selection, system design, CI/CD architecture, and all decisions about what to build and why are mine. Claude is used as a thinking partner — working through edge cases and debugging. Code is reviewed, debugged, and validated by me before merging — including catching and fixing issues the AI introduced, such as a UTC midnight timezone bug in the double-booking detection logic. This reflects how I work: AI handles the repetitive thinking, I own the decisions and the quality bar.

## About

Built by Sandra — a QA engineer with 10 years of experience across manual and automation testing. This project is built during a career break running a hospitality business, using the operational challenges of the business itself as the test subject.

The goal is twofold: solve real problems encountered while running a new business, while staying up to date with a modern QA engineering stack — Playwright, TypeScript, REST API testing, CI/CD pipelines, serverless architecture, and WhatsApp automation.