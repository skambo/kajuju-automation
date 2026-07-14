# Testing the Agentic Discovery Layer

This is the how-to for running and validating the agentic tester locally. For what this
layer is and why it exists, see the "Phase 3 — Agentic Testing Layer" section in the
main [README.md](../README.md). A full technical writeup will live in `agentic/README.md`
separately — this file is just the runbook.

## Prerequisites

- **Node.js 20** (matches the rest of the repo).
- From `agentic/`, run:
  ```bash
  cd agentic
  npm install
  ```
  This installs the Anthropic SDK, the MCP SDK, `@playwright/mcp`, and `tsx` (used to run
  the `.ts` script directly — no build step). `npm install` also pulls down a Chromium
  build for Playwright MCP the first time; this can take a minute.
- Copy `agentic/.env.example` to `agentic/.env` (this directory has its own `.env`,
  separate from the root one — it is already covered by the repo's `.gitignore`) and
  fill in:
  ```bash
  ANTHROPIC_API_KEY=sk-ant-...
  TARGET_SITE_URL=https://your-site.example.com
  ```
  Get an API key from the [Anthropic Console](https://console.anthropic.com/) under
  **API Keys**. `TARGET_SITE_URL` is the site this agent tests — point it at your own
  site. `TARGET_SITE_URL` is only required for a real (non-`--dry-run`) run; the smoke
  test in Step 1 doesn't need it. If you want to test the email path locally (see below),
  also add `GMAIL_USERNAME`, `GMAIL_APP_PASSWORD`, and `ALERT_EMAIL` — the same three
  secrets already used by `availability-monitor.yml`, just copied into this local `.env`
  instead of read from GitHub Secrets.

## Step 1 — safe local smoke test (do this first)

```bash
cd agentic
npm run test:dry-run
```

This runs `tsx run-agent.ts --dry-run`. `--dry-run` points the agent at a local static
copy of the site (`apps/landing-pages/dist/index.html`, loaded via a `file://` URL)
instead of whatever `TARGET_SITE_URL` is set to, and email sending is off by default
regardless of flags. It doesn't even require `TARGET_SITE_URL` to be set. It cannot hit
the live site, hammer production, or send a real guest-facing email. Use this to confirm
the MCP subprocess, tool bridging, and Anthropic wiring all work before spending tokens
against the real site.

### What a successful smoke test looks like

Console output, in order:

```
[agentic] persona: First-Time Guest
[agentic] target: file:///.../apps/landing-pages/dist/index.html  (dry run — local static copy, not the live site)

[agentic] loaded 24 browser tools from Playwright MCP

[agentic] turn 1/20: browser_navigate
[agentic] turn 2/20: browser_snapshot
[agentic] turn 3/20: browser_click
...
[agentic] --- token usage ---
  input tokens:  ~40,000–80,000
  output tokens: ~2,000–6,000
  estimated cost: $0.10–$0.25 (Sonnet 5 @ $2/$10 per MTok)

# Agentic Discovery Test — First-Time Guest

**Outcome:** ✅ SUCCESS
...
```

Roughly what to expect:

- **Duration:** 1–3 minutes for the dry run (fewer pages to explore than the live site).
- **Tool turns:** usually well under the 20-turn cap — a handful of navigate/snapshot/click
  cycles per question.
- **Cost:** a few tenths of a cent. Input tokens dominate because each turn resends the
  growing accessibility-snapshot history; that's expected for a short-lived script with no
  caching, not a bug.
- **`--dry-run` limitations:** the static copy has no live server behind it, so
  `check-availability` calls and the real booking flow won't work. Expect the agent to
  note this in `confusions` or `missingInfo` for that run — that's the dry run being
  honest, not a failure of the wiring. Its only job is proving the MCP bridge and token
  accounting work.

If this doesn't produce a report at all, see Troubleshooting below before trying the live
site.

## Step 2 — run against the real live site

Once the dry run looks right:

```bash
cd agentic
npm run test
```

This runs the same script without `--dry-run`, so it targets whatever `TARGET_SITE_URL`
is set to in `agentic/.env`, using a real, isolated, headless browser session. Expect
this to take longer (3–8 minutes) and cost a bit more than the dry run (a real site has
more pages and a real booking form to explore) — check the printed token usage against
the dry-run numbers as a sanity check that nothing is looping unexpectedly.

Email is still off by default. To actually send the report to `ALERT_EMAIL` (e.g. to test
the alert path end-to-end), opt in explicitly:

```bash
npm run test -- --send-email
# or
SEND_EMAIL=true npm run test
```

## Sanity-checking the output — don't just check "no errors"

A run with exit code 0 isn't automatically a good run. Check the actual report:

- **`questionsAnswered` is genuinely populated.** Every question from
  `personas/first-time-guest.json` should have a real `answer` string, not `""` or a
  restated version of the question. If `found: false` shows up for something clearly on
  the page (e.g. the room rates), that's a real finding — the persona couldn't locate
  it — not a bug in the script.
- **`pagesVisited` makes sense for the site.** For the live-site run, expect to see the
  homepage plus whatever pages your site actually has for rates, packages, and booking —
  the exact paths depend on your site's structure. If `pagesVisited` is just the start URL
  and nothing else, the agent likely didn't explore — check the console log of tool turns
  to see what it actually did.
- **Turn count is reasonable.** A handful of turns per question is healthy. If every run
  is bumping up against 15–20 turns, that's worth investigating (see Troubleshooting) —
  don't just raise `MAX_TOOL_TURNS` in `run-agent.ts`.
- **Cost roughly matches the smoke test's order of magnitude**, scaled up for the extra
  pages on the live site. A huge, unexplained jump usually means the agent got stuck
  re-reading the same page (check `pagesVisited` for repeats).
- **Read `confusions` and `recommendations` even on a `success` outcome.** The point of
  this layer is catching things a deterministic test can't — a persona can complete its
  goal and still flag that the booking button was hard to find, or that a page took a
  long time to load.

## Troubleshooting

**MCP subprocess doesn't start / hangs on first run.**
`@playwright/mcp` downloads its own Chromium build on first use, separate from the one
`npx playwright install chromium` sets up for the main Playwright test suite. If the first
run seems to hang, give it a minute — check `ps aux | grep chromium` to see if a browser
process is actually starting. If it's still stuck after a few minutes, delete
`agentic/node_modules` and re-run `npm install`.

**`ANTHROPIC_API_KEY is not set` even though `.env` exists.**
Confirm you're running from inside `agentic/` (`cd agentic && npm run test:dry-run`), not
the repo root — `dotenv` loads `.env` from the current working directory, and there are
two different `.env` files in this repo (root and `agentic/`).

**Tool schema mismatches / `400 invalid_request_error` mentioning `tools`.**
This usually means `@playwright/mcp`'s tool list changed shape between versions. Run
`node -e "..."` or a short throwaway script to call `client.listTools()` directly and log
the result, and compare against what `run-agent.ts` expects (`name`, `description`,
`inputSchema`). Pin the `@playwright/mcp` version in `package.json` if this keeps
happening.

**Hitting the 20-turn cap (`FAILED: hit the hard cap of 20 tool-use turns`).**
This is deliberate — the script fails loudly instead of looping silently, per design. Look
at the printed turn-by-turn tool log to see where it got stuck (repeated `browser_snapshot`
calls on the same page is the most common pattern — usually means the persona is confused
by the page, which is itself a useful finding, or that a click didn't do what the model
expected). Don't just raise `MAX_TOOL_TURNS` in `run-agent.ts` — figure out why first.

**Malformed final JSON from the model.**
The script tries to strip a ```` ```json ```` code fence before parsing, but if the model's
final message still doesn't parse as JSON (or is missing required fields), you'll see
`[agentic] could not parse final response as JSON` with the raw text logged, and the run
falls back to a synthetic `"outcome": "failure"` report so downstream reporting still has
something to show. Read the logged raw text — it usually means the model kept
narrating instead of stopping, which is a system-prompt tuning problem, not a parsing bug.

**Email didn't send even with `--send-email`.**
Check that `GMAIL_USERNAME`, `GMAIL_APP_PASSWORD`, and `ALERT_EMAIL` are all set in
`agentic/.env` — `maybeSendEmail` silently skips (with a console message) if any of the
three are missing, rather than throwing.
