# Kajuju Automation Framework

A hospitality-grade automation framework built with Playwright + TypeScript, solving operational problems for a boutique hospitality business.

🔗 **Live site:** Shared privately

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
- Activities and gatherings pages

**Channel manager availability integration** ⚠️ Deprecated
- Vercel serverless function proxied availability checks to Smoobu channel manager API
- Smoobu has been decommissioned — new channel manager trial pending
- Availability check currently fails open (form submits, team reviews manually)

**Formspree form backend**
- Booking requests are submitted to Formspree, which emails the team immediately
- Chosen deliberately over a custom email backend — no server to maintain, free tier covers current volume

**GitHub Actions CI pipeline**
- Site uptime monitor runs on schedule via cron
- Sends alert email on failure with a link to the actions log
- Manual trigger available via workflow_dispatch

**Playwright test suites**
- Synthetic monitors for all production pages (load time, CTA presence, nav links)
- E2E booking form validation (phone formats, email regex, date constraints, dropdown coverage)


### Phase 2 — WhatsApp Bot: LIVE ✅

**Kajuju WhatsApp Bot** is deployed and running at `https://kajuju-production.up.railway.app`

All incoming WhatsApp messages are handled automatically with a three-tier response system:

1. **Greeting detection** — "hi", "hello", "habari" etc. trigger a welcome message with rates and booking links
2. **Scripted FAQ matching** — 19 keyword-matched categories return instant, accurate responses (checkout time, directions, menu, wifi, cancellation policy, activities, workation, groups, availability, and more)
3. **GPT-4o fallback** — any question not matched by the FAQ layer is handled by OpenAI with a property-specific system prompt

**Smart availability handling** — if a guest mentions a specific date, GPT-4o acknowledges it and asks for guest count; generic availability queries return the booking link directly.

**Architecture:**
- Node.js + Express bot server (`apps/bot-server/index.js`)
- FAQ response library (`apps/bot-server/faqs.js`) — 19 scripted categories, easily editable
- OpenAI GPT-4o for unmatched questions (max 300 tokens, graceful fallback on error)
- Deployed permanently on Railway (auto-restarts, always on)
- Auto-deploys on every push to `master` branch of `skambo/kajuju-bot`
- Wired to Twilio WhatsApp Sandbox (production Meta API approval pending)

**Bot repo:** `https://github.com/skambo/kajuju-bot`
**Railway project:** `https://railway.com/project/705ac21c-7bc0-46da-bdb9-f4d03a2f0530`


### Phase 2 — Remaining
- Move from Twilio Sandbox to WhatsApp Business API (Meta approval + phone number strategy TBD)
- Proactive outbound messages to known channel users via approved message templates
- New channel manager integration (trial pending) — rewrite availability check once confirmed
- Wave invoice automation with guest data pre-population


## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Test framework | Playwright + TypeScript (strict mode) | E2E, API, and synthetic monitoring tests |
| Runtime | Node.js 20 | Test execution and serverless functions |
| CI/CD | GitHub Actions | Cron site uptime monitoring, alerting |
| Serverless | Vercel | Hosting + availability check proxy function |
| Channel manager | ⚠️ Smoobu deprecated — new channel manager TBD | Single source of truth for availability |
| Form backend | Formspree | Booking request emails — no custom server needed |
| Frontend | HTML / CSS / JS | Static pages, no build step required |
| WhatsApp bot | Node.js + Express + Twilio | FAQ handling + GPT-4o fallback for WhatsApp inquiries |
| AI | OpenAI GPT-4o | Handles unscripted guest questions |
| Bot hosting | Railway | Permanent deployment, auto-redeploy on push |
| Secrets (local) | dotenv | Local .env for API keys |


## Project Structure

```
kajuju-automation/                          ← git root
├── .github/
│   └── workflows/
│       └── availability-monitor.yml        ← Cron CI pipeline (site uptime)
├── api/                                    ← Vercel serverless functions
│   ├── check-availability.js               ← Channel manager availability proxy (Smoobu deprecated)
│   └── package.json                        ← CommonJS override
└── kajuju-automation/                      ← all application and test code
    ├── apps/
    │   ├── bot-server/
    │   │   ├── index.js                    ← WhatsApp bot (deployed on Railway via kajuju-bot)
    │   │   ├── faqs.js                     ← 19 scripted FAQ categories + GPT-4o fallback logic
    │   │   └── package.json
    │   └── landing-pages/
    │       ├── index.html                  ← Rate card  →  /
    │       ├── workation/index.html        ← Workation  →  /workation
    │       ├── explore/index.html          ← Activities →  /explore
    │       ├── gatherings/index.html       ← Groups     →  /gatherings
    │       └── book/index.html             ← Booking form  →  /book
    └── tests/
        ├── monitoring/
        │   └── health-check.spec.ts        ← Synthetic monitors
        ├── e2e/
        │   └── booking-form.spec.ts        ← Form E2E
        └── api/
            └── availability.spec.ts        ← Availability detection
```


## Key Engineering Decisions

**Fail open on availability errors** — When the channel manager API is unreachable, the booking form submits and the team reviews manually rather than blocking a genuine guest.

**Date string comparison over new Date()** — Comparing YYYY-MM-DD strings directly avoids UTC midnight timezone drift that caused false positive double-booking alerts in early builds.

**Soft assertions for overlap detection** — Rather than stopping at the first double-booking found, the availability test collects every conflict across all rooms in a single CI run.

**Static HTML over a framework** — No build step, instant Vercel deploys, and easy for non-engineers to read and edit.

**Formspree over a custom email backend** — No server to maintain, free tier covers current volumes.

**CommonJS in the api/ folder** — The main package.json sets "type": "module" for Playwright compatibility. A local package.json with "type": "commonjs" in api/ overrides this for Vercel.

**Railway over Heroku/Render for bot hosting** — GitHub-connected deploys, always-on free tier suitable for current volume, simple environment variable management.

**Twilio Sandbox first** — Allows full end-to-end testing without Meta WhatsApp Business API approval. Production number strategy is under review.

**FAQ-first, GPT-4o second** — Scripted responses are instant, free, and accurate. GPT-4o only fires for genuinely novel questions — cost stays minimal (~$5/month at expected inquiry volume).

**Smart availability routing** — Date-pattern detection in the FAQ layer distinguishes specific date queries (routed to GPT-4o for a natural, personalised response) from generic availability questions (routed to the booking form link).


## Secrets & Where They Live

| Secret | Where | Purpose |
|--------|-------|---------|
| OPENAI_API_KEY | Local .env + Railway Env Vars | OpenAI GPT-4o for unscripted FAQ fallback |
| GMAIL_USERNAME | GitHub Secrets | Alert email sender |
| GMAIL_APP_PASSWORD | GitHub Secrets | Gmail app password (16 chars, no spaces) |
| ALERT_EMAIL | GitHub Secrets | Recipient for uptime alerts |


## Local Setup

```bash
git clone https://github.com/skambo/kajuju-automation.git
cd kajuju-automation/kajuju-automation
npm install
npx playwright install chromium
```

Create `.env` in `kajuju-automation/kajuju-automation/`:

```
OPENAI_API_KEY=your_key_here
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

| Suite | Tests | Passing | Notes |
|-------|-------|---------|-------|
| health-check.spec.ts | 10 | 9 | Nav link needs data-testid — TODO |
| booking-form.spec.ts | 8 | 7 | 2-night minimum — might need unit test approach |
| availability.spec.ts | 3 | — | Pending channel manager rewrite |
| **Total** | **21** | **16+** | Availability suite paused pending new channel manager |


## Tech Debt

| ID | Issue | Priority |
|----|-------|----------|
| TD-001 | Channel manager rewrite — Smoobu decommissioned, new integration pending trial confirmation | High |
| TD-002 | Alert email doesn't specify which page or check failed | Medium |
| TD-003 | Page titles show incorrect brand name on public pages | Medium |
| TD-004 | Images not fitting correctly on desktop | Low |
| TD-005 | Nav link Playwright test flaky — skipped with TODO | Low |
| TD-006 | Workation page slow load — image needs to be compressed (5.4MB) | Low |
| TD-007 | 2-night minimum checkout for workation package test skipped — might need unit test approach | Low |
| TD-008 | WhatsApp production number strategy TBD — Twilio Sandbox to Meta API migration requires phone number decision | High |
| TD-009 | Proactive outbound message templates not yet built — blocked on Meta API approval | Medium |


## Development Methodology

Strategy, framework selection, system design, CI/CD architecture, and all decisions about what to build and why are mine. Claude is used as a thinking partner — working through edge cases and debugging. Code is reviewed, debugged, and validated by me before merging — including catching and fixing issues the AI introduced, such as a UTC midnight timezone bug in the double-booking detection logic. This reflects how I work: AI handles the repetitive thinking, I own the decisions and the quality bar.

## About

Built by Sandra — a QA engineer with 10 years of experience across manual and automation testing. This project is built during a career break running a hospitality business, using the operational challenges of the business itself as the test subject.

The goal is twofold: solve real problems encountered while running a new business, while staying up to date with a modern QA engineering stack — Playwright, TypeScript, REST API testing, CI/CD pipelines, serverless architecture, and AI-assisted WhatsApp automation.
