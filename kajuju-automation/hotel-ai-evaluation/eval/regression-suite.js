'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const { askAssistant } = require('../assistant/client');
const { loadKnowledge } = require('../assistant/knowledge');
const { REGRESSION_MODEL } = require('../assistant/config');
const { parseCsv, rowsToObjects } = require('./csv');
const { detectShape, normalizeRow } = require('./dataset-adapters');
const { evaluateRow } = require('./behaviour-templates');

function parseArgs(argv) {
  const args = {
    dataset: path.join(__dirname, '..', 'datasets', 'guest_questions.csv'),
    limit: 10,
    out: path.join(__dirname, 'regression-results.json'),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dataset') args.dataset = path.resolve(argv[++i]);
    else if (argv[i] === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--all') args.limit = Infinity;
    else if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
  }
  return args;
}

function loadDataset(datasetPath) {
  const raw = fs.readFileSync(datasetPath, 'utf8');
  const rows = parseCsv(raw);
  const shape = detectShape(rows[0]);
  const datasetName = path.basename(datasetPath, '.csv');
  return rowsToObjects(rows).map((r, i) => normalizeRow(r, i, { datasetName, shape }));
}

function summarize(results) {
  const counts = { pass: 0, fail: 0, needs_review: 0, error: 0 };
  const failureTypes = {};
  results.forEach((r) => {
    counts[r.overall] = (counts[r.overall] || 0) + 1;
    if (r.failureType) failureTypes[r.failureType] = (failureTypes[r.failureType] || 0) + 1;
  });
  return { rows_run: results.length, ...counts, failure_types: failureTypes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataset = loadDataset(args.dataset);
  const rowsToRun = Number.isFinite(args.limit) ? dataset.slice(0, args.limit) : dataset;
  const kb = loadKnowledge();

  console.log(`Running ${rowsToRun.length} of ${dataset.length} rows from ${path.basename(args.dataset)} through the regression suite (model: ${REGRESSION_MODEL})...`);

  const results = [];
  for (const row of rowsToRun) {
    process.stdout.write(`  ${row.id}... `);
    try {
      const { reply, toolCalls } = await askAssistant(row.message, [], REGRESSION_MODEL);
      const evaluation = evaluateRow(row, reply, toolCalls, kb);
      results.push({ ...row, reply, toolCalls, ...evaluation });
      console.log(evaluation.overall);
    } catch (err) {
      results.push({ ...row, error: err.message, overall: 'error', failureType: 'raw_error_returned' });
      console.log(`ERROR (${err.message})`);
    }
  }

  const summary = summarize(results);
  const output = { dataset: path.basename(args.dataset), summary, results };
  fs.writeFileSync(args.out, JSON.stringify(output, null, 2));

  console.log('\n--- Summary ---');
  console.log(summary);
  console.log(`\nFull results written to ${args.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
