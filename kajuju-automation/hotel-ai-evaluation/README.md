# Hotel AI Evaluation

An evaluation harness for an AI hotel-booking assistant.


## Structure

```
hotel-ai-evaluation/
  README.md
  docs/
    KnowledgeBase.md       — Pseudonymized crawl notes + documented ambiguities
    EvaluationRubric.md    — Scoring rubric (7 dimensions, 0-5 each)
  hotels/
    kajuju/
      knowledge.json        — Structured KB the assistant is grounded on
  datasets/
    _generate.cjs           — Source-of-truth generator for the two CSVs below
    guest_questions.csv     — ~100 guest conversations (hotel, message, intent,
                              expected response, whether a tool is required, notes)
    intents.csv              — Same conversations, intent-classification view only
    hallucination_pack.csv  — ~30 questions about things not in the KB (spa,
                              unusual payment methods, etc.) — assistant must decline, never invent
    adversarial_tests.csv   — ~50 difficult conversations (typos, emoji, multiple
                              languages, vague/contradictory requests, prompt injection, etc.)
  assistant/
    config.js               — active HOTEL_ID + resolved path into hotels/<id>/knowledge.json
    knowledge.js            — loads the active hotel's knowledge.json, builds the system prompt
    tools.js                — mocked check_availability + check_cancellation_window tools
    client.js                — Claude API call + tool-use loop (Phase 5)
    server.js                — Express server exposing POST /api/chat
  webapp/
    index.html, style.css, app.js — local chat UI for manual testing
  eval/
    run-eval.js              — Runs guest_questions.csv against the live assistant,
                              scores it with hotel-specific heuristics (banned real-identity terms)
    csv.js                   — Shared quoted field CSV parser used by the suite
    generic-checks.js        — Hotel agnostic heuristic checks (tool selection, no raw
                              tool/prompt leakage, formatting policy, KB-grounded numeric claims)
    dataset-adapters.js      — Normalizes either dataset CSV shape into one common row
    behaviour-templates.js   — Reusable behaviour templates (amenities, check_in,
                              availability, cancellation, unknown_information) describing correct
                              behaviour generically
    regression-suite.js      — Runs any dataset CSV against the live assistant and scores
                              it against the behaviour templates
```

## The regression suite

`eval/regression-suite.js` built so that none of its logic or the behaviour
templates it scores against ever hardcodes a Kajuju-specific fact or expected answer. It reads
whichever hotel's `knowledge.json` `assistant/config.js` points at, and works against any dataset
CSV in either of the two shapes used in this project. Swapping in a second `hotels/<id>/` folder
and its own dataset rows later would reuse this exact code unchanged.

Each row is scored across six generic dimensions — `correct_intent`, `correct_tool_selected`,
`no_hallucination`, `no_policy_violation`, `response_contains_required_facts`,
`response_avoids_prohibited_claims` — with a `pass` / `fail` / `null` (not automatable, needs
semantic/LLM/human review) result and a note explaining why. `correct_intent` is always `null` in
this harness (there's no intent-classifier output to check it against) and is excluded from the
overall pass/fail verdict for that reason; it's reported for a future semantic-judge pass. Rows
land in one of five behaviour templates by structural signals only (expected tool, whether the
message mentions check-in/check-out, which dataset it came from), never by hotel content.

```bash
node eval/regression-suite.js --dataset datasets/guest_questions.csv --limit 10
node eval/regression-suite.js --dataset datasets/hallucination_pack.csv --all
node eval/regression-suite.js --dataset datasets/adversarial_tests.csv --all --out ./eval/adv-results.json
```

Some rows in `guest_questions.csv` / `adversarial_tests.csv` expect the assistant to ask a
clarifying question before calling `check_availability` in a real multi-turn conversation (see
each row's notes), since this suite calls the assistant single turn with no history, those
specific rows will correctly show `wrong_tool_selection` here even though the assistant's actual
behaviour is right, a known limitation inherited from the same single turn design already used by `run-eval.js`, not a new regression.

Every hotel's data lives under its own `hotels/<id>/` folder. Only one hotel (`kajuju`) exists
today, but nothing in the assistant, datasets generator, or eval script hardcodes that name, they all read the active hotel from `assistant/config.js` (`HOTEL_ID`, overridable via the
`HOTEL_ID` env var). Adding a second hotel later means adding a new `hotels/<id>/` folder and
dataset rows.

## Model

Uses the official `@anthropic-ai/sdk`, with two independent model config values in
`assistant/config.js` so cost matches the use case.

- `CHAT_MODEL` (default `claude-sonnet-5`, override via the `CHAT_MODEL` env var) — used by
  `assistant/server.js`, the local chat server for manual interactive testing.
- `REGRESSION_MODEL` (default `claude-haiku-4-5`, override via the `REGRESSION_MODEL` env var) —
  used by `eval/regression-suite.js` and `eval/run-eval.js`, the bulk automated dataset runs
  (including the adversarial and hallucination passes). 


## Setup

```bash
cd hotel-ai-evaluation
npm install
```

Add your key to the **root** `.env` (already gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Run the local test harness

```bash
npm start
```

Opens an Express server at `http://localhost:3300` serving the chat UI. The chat UI shows tool
calls inline (🔧) so you can see when `check_availability` fires.

## Run the evaluation script

```bash
node eval/run-eval.js --limit 10        # default: first 10 rows
node eval/run-eval.js --all             # full ~100-row dataset (costs real API calls)
node eval/run-eval.js --limit 20 --out ./eval/my-results.json
```

Writes a JSON report with scores plus an aggregate summary. **Correctness, Completeness,
Tone, and Helpfulness are currently unscored placeholders** — see `docs/EvaluationRubric.md` for
why those need semantic (LLM- or human-graded) judgment rather than a keyword heuristic. 

## Scope

This build covers knowledge base, dataset, intent labels, tool-calling assistant,
rubric + heuristic eval script, hallucination pack, adversarial tests, and the hotel-agnostic
regression suite + behaviour templates