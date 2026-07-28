'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const { askAssistant } = require('../assistant/client');
const { loadKnowledge } = require('../assistant/knowledge');
const { REGRESSION_MODEL } = require('../assistant/config');

const DATASET_PATH = path.join(__dirname, '..', 'datasets', 'guest_questions.csv');

// Real-identity terms that must never appear in assistant output: the real
// property name and domain only. Real geography (Naromoru, Nyeri, Nanyuki,
// Mount Kenya, etc.) is intentionally allowed — see docs/KnowledgeBase.md.
// Kept here (not just as a pre-commit grep) so a live-run response is checked too.
const BANNED_TERMS = ['idan barn', 'idanbarnsuites'];

const HEDGE_PHRASES = [
  "not sure", "don't have", "do not have", "check with the team", "let me check",
  "let me confirm", "confirm with the team", "i don't have that", "not able to check",
];

function parseArgs(argv) {
  const args = { limit: 10, out: path.join(__dirname, 'eval-results.json') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
    else if (argv[i] === '--all') args.limit = Infinity;
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function loadDataset() {
  const raw = fs.readFileSync(DATASET_PATH, 'utf8');
  const rows = parseCsv(raw);
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = r[i]; });
    return obj;
  });
}

function extractKesAmounts(text) {
  const matches = text.match(/(\d[\d,]{2,})\s*(?:KES|Ksh|kes|ksh)|(?:KES|Ksh|kes|ksh)\s*(\d[\d,]{2,})/g) || [];
  return matches
    .map((m) => m.replace(/[^\d]/g, ''))
    .filter(Boolean)
    .map((n) => n.replace(/^0+/, ''));
}

function checkHallucination(reply, kbText) {
  const amounts = extractKesAmounts(reply);
  const unknownAmounts = amounts.filter((amt) => !kbText.includes(amt));
  const lowerReply = reply.toLowerCase();
  const leaked = BANNED_TERMS.filter((term) => lowerReply.includes(term));
  return { unknownAmounts, leaked, score: unknownAmounts.length === 0 && leaked.length === 0 ? 5 : 0 };
}

function checkPolicyCompliance(reply, row, leaked) {
  const notes = (row.notes || '').toLowerCase();
  const ambiguityFlagged = /ambigu|gap|no fixed fee|does not|doesn.t|not covered|no upper bound|no completion date/.test(notes);
  const lowerReply = reply.toLowerCase();
  const hedged = HEDGE_PHRASES.some((p) => lowerReply.includes(p));

  let score = 5;
  const issues = [];
  if (leaked.length > 0) {
    score = 0;
    issues.push(`Leaked banned term(s): ${leaked.join(', ')}`);
  } else if (ambiguityFlagged && !hedged) {
    score = 2;
    issues.push('Row is flagged as an ambiguity/gap in notes, but reply does not appear to hedge.');
  }
  return { score, issues };
}

function checkToolSelection(row, toolCalls) {
  const required = String(row.tool_required).toLowerCase() === 'true';
  const called = toolCalls.length > 0;
  if (required === called) return { score: called ? 5 : 5, note: called ? 'Tool called as expected.' : 'No tool call, none expected.' };
  if (required && !called) return { score: 0, note: 'Expected a check_availability call but none was made.' };
  return { score: 1, note: 'Called check_availability when the dataset did not expect it — verify it was actually necessary.' };
}

// Placeholder for a future LLM-graded (or human-graded) pass on the
// dimensions that need semantic judgment: Correctness, Completeness, Tone,
// Helpfulness. Intentionally not implemented yet — see docs/EvaluationRubric.md.
function scoreWithLLMJudge(_row, _reply) {
  return { correctness: null, completeness: null, tone: null, helpfulness: null, note: 'Not implemented — placeholder for LLM/human-graded scoring.' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataset = loadDataset();
  const rowsToRun = Number.isFinite(args.limit) ? dataset.slice(0, args.limit) : dataset;
  const kb = loadKnowledge();
  const kbText = JSON.stringify(kb);

  console.log(`Running ${rowsToRun.length} of ${dataset.length} dataset rows against the live assistant (model: ${REGRESSION_MODEL})...`);

  const results = [];
  for (const row of rowsToRun) {
    process.stdout.write(`  ${row.id}... `);
    try {
      const { reply, toolCalls } = await askAssistant(row.user_message, [], REGRESSION_MODEL);
      const hallucination = checkHallucination(reply, kbText);
      const policy = checkPolicyCompliance(reply, row, hallucination.leaked);
      const toolSelection = checkToolSelection(row, toolCalls);
      const llmJudge = scoreWithLLMJudge(row, reply);

      results.push({
        id: row.id,
        user_message: row.user_message,
        expected_intent: row.expected_intent,
        expected_response: row.expected_response,
        actual_reply: reply,
        tool_calls: toolCalls,
        scores: {
          correctness: llmJudge.correctness,
          completeness: llmJudge.completeness,
          tone: llmJudge.tone,
          helpfulness: llmJudge.helpfulness,
          policy_compliance: policy.score,
          hallucination: hallucination.score,
          tool_selection: toolSelection.score,
        },
        notes: {
          policy_issues: policy.issues,
          hallucination_unknown_amounts: hallucination.unknownAmounts,
          hallucination_leaked_terms: hallucination.leaked,
          tool_selection_note: toolSelection.note,
        },
      });
      console.log('done');
    } catch (err) {
      console.log(`FAILED (${err.message})`);
      results.push({ id: row.id, user_message: row.user_message, error: err.message });
    }
  }

  const summary = summarize(results);
  const output = { generated_at_note: 'timestamp omitted — stamp externally if needed', summary, results };
  fs.writeFileSync(args.out, JSON.stringify(output, null, 2));

  console.log('\n--- Summary (automated dimensions only; correctness/completeness/tone/helpfulness are unscored placeholders) ---');
  console.log(summary);
  console.log(`\nFull results written to ${args.out}`);
}

function summarize(results) {
  const scored = results.filter((r) => r.scores);
  const avg = (key) => {
    const vals = scored.map((r) => r.scores[key]).filter((v) => typeof v === 'number');
    if (vals.length === 0) return null;
    return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  };
  return {
    rows_run: results.length,
    rows_errored: results.filter((r) => r.error).length,
    avg_policy_compliance: avg('policy_compliance'),
    avg_hallucination: avg('hallucination'),
    avg_tool_selection: avg('tool_selection'),
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
