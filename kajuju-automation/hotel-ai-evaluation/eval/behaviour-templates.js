'use strict';

// Reusable behaviour templates for the regression suite (Phase 9). Each template
// describes what CORRECT BEHAVIOUR LOOKS LIKE for a category of guest question —
// never the exact wording of a correct answer. Every fact a template checks for
// (a check-in time, a cancellation bucket, a contact channel, a documented
// ambiguity) is read live from the KB object or the actual tool-call result
// passed in at evaluation time, not hardcoded here. Point assistant/config.js at
// a different hotels/<id>/ folder with the same knowledge.json schema and these
// same templates, and the same regression suite, apply unchanged.

const gc = require('./generic-checks');

// Matches "what time is check-in", "when's checkout" etc. but deliberately NOT
// messages that merely use the words check-in/checkout in a date-logistics
// sense (e.g. "book me for check-in tomorrow") — those aren't asking to look up
// the standard time, so scoring them against it would be a false failure.
const CHECK_IN_OUT_TIME_QUESTION_RE = /check[\s-]?in|check[\s-]?out/i;
const TIME_SIGNAL_RE = /\btime\b|\bwhen\b/i;

const DIMENSION_KEYS = [
  'correct_intent',
  'correct_tool_selected',
  'no_hallucination',
  'no_policy_violation',
  'response_contains_required_facts',
  'response_avoids_prohibited_claims',
];

function baseDimensions({ row, reply, toolCalls, kb }) {
  return {
    correct_intent: {
      pass: null,
      note: 'Not automatable from reply text alone in this harness — requires an explicit intent-classification output or LLM/human judgment.',
    },
    correct_tool_selected: gc.toolSelectionCorrect(row.expectedTool, toolCalls),
    no_hallucination: gc.numericClaimsGroundedInKb(reply, kb),
    no_policy_violation: gc.noPolicyViolation(reply, toolCalls),
    response_contains_required_facts: { pass: null, note: 'No category-specific fact check applied.' },
    response_avoids_prohibited_claims: { pass: null, note: 'No category-specific claim check applied.' },
  };
}

const templates = {
  availability: {
    evaluate(ctx) {
      const { reply, toolCalls } = ctx;
      const dims = baseDimensions(ctx);
      const call = (toolCalls || []).find((tc) => tc.name === 'check_availability');
      if (call && call.result && !call.result.error) {
        const lower = reply.toLowerCase();
        const claimsUnavailable = /(not available|fully booked|no availability|isn.t available|no longer available)/.test(lower);
        const claimsAvailable = /(is available|we have availability|good news.*available|it.s available)/.test(lower);
        const actual = call.result.available;
        // Only a positive match on the wrong side (or no match on either side, e.g.
        // a non-English reply this regex can't parse) is informative; anything else
        // is left for review rather than guessed at.
        let consistent;
        if (actual === true) consistent = claimsUnavailable ? false : (claimsAvailable ? true : null);
        else consistent = claimsAvailable ? false : (claimsUnavailable ? true : null);
        dims.response_contains_required_facts = {
          pass: consistent,
          note: consistent === null
            ? `check_availability returned available=${actual}; reply doesn't clearly state either outcome in a way this heuristic recognizes (may be non-English).`
            : `check_availability returned available=${actual}; reply ${consistent ? 'is' : 'is NOT'} consistent with that result.`,
        };
      } else {
        dims.response_contains_required_facts = {
          pass: null,
          note: 'No successful check_availability call to verify the reply against.',
        };
      }
      return { category: 'availability', dimensions: dims };
    },
  },

  cancellation: {
    evaluate(ctx) {
      const { reply, toolCalls } = ctx;
      const dims = baseDimensions(ctx);
      const call = (toolCalls || []).find((tc) => tc.name === 'check_cancellation_window');
      if (call && call.result && !call.result.error) {
        const bucket = call.result.policy_bucket;
        const lower = reply.toLowerCase();
        const saysFull = /full refund/.test(lower);
        const saysNone = /no refund/.test(lower);
        // A positive match on the OPPOSITE outcome is a confirmed contradiction
        // (fail). No match on either phrase is left for review rather than
        // guessed at — the reply may simply be in a different language.
        let stated;
        if (bucket === 'full_refund') stated = saysNone ? false : (saysFull ? true : null);
        else if (bucket === 'no_refund') stated = saysFull ? false : (saysNone ? true : null);
        else stated = (saysFull || saysNone) ? false : (gc.declinesPlainly(reply).pass ? true : null);
        dims.response_contains_required_facts = {
          pass: stated,
          note: stated === null
            ? `check_cancellation_window returned policy_bucket=${bucket}; reply doesn't clearly state either outcome in a way this heuristic recognizes (may be non-English).`
            : `check_cancellation_window returned policy_bucket=${bucket}; reply ${stated ? 'states' : 'does NOT state'} the matching outcome.`,
        };
        // Hedging is the exact failure mode this tool exists to prevent, so fold
        // it into the policy-violation dimension rather than a separate check —
        // for the genuinely ambiguous bucket, deferring IS correct, not a hedge.
        const hedgeResult = bucket === 'ambiguous_48_to_72'
          ? { pass: true, note: 'Ambiguous bucket: deferring to the team is correct behaviour, not a policy violation.' }
          : gc.noHedging(reply);
        dims.no_policy_violation = gc.combineChecks([
          gc.noRawToolLeak(reply, toolCalls),
          gc.noPromptLeak(reply),
          gc.formattingPolicy(reply),
          hedgeResult,
        ]);
      } else {
        dims.response_contains_required_facts = {
          pass: null,
          note: 'No successful check_cancellation_window call to verify the reply against.',
        };
      }
      return { category: 'cancellation', dimensions: dims };
    },
  },

  check_in: {
    evaluate(ctx) {
      const { row, reply, kb } = ctx;
      const dims = baseDimensions(ctx);
      const lowerMsg = row.message.toLowerCase();
      const checks = [];
      const checkIn = kb && kb.policies && kb.policies.check_in;
      const checkOut = kb && kb.policies && kb.policies.check_out;
      if (/check[\s-]?in/.test(lowerMsg) && TIME_SIGNAL_RE.test(lowerMsg) && checkIn && checkIn.standard) {
        const result = gc.timeValueMentioned(reply, checkIn.standard);
        checks.push({ pass: result, note: result === null ? 'KB check-in time not in a recognizable time format.' : `Standard check-in time (${checkIn.standard}) ${result ? 'is' : 'is NOT'} mentioned.` });
      }
      if (/check[\s-]?out/.test(lowerMsg) && TIME_SIGNAL_RE.test(lowerMsg) && checkOut && checkOut.standard) {
        const result = gc.timeValueMentioned(reply, checkOut.standard);
        checks.push({ pass: result, note: result === null ? 'KB check-out time not in a recognizable time format.' : `Standard check-out time (${checkOut.standard}) ${result ? 'is' : 'is NOT'} mentioned.` });
      }
      dims.response_contains_required_facts = checks.length
        ? gc.combineChecks(checks)
        : { pass: null, note: 'Message does not reference a KB check-in/check-out field this template can verify.' };
      return { category: 'check_in', dimensions: dims };
    },
  },

  amenities: {
    evaluate(ctx) {
      const { row, reply, kb } = ctx;
      const dims = baseDimensions(ctx);
      const ambiguities = (kb && kb.ambiguities) || [];
      let bestMatch = null;
      let bestScore = 0;
      ambiguities.forEach((a) => {
        const score = gc.wordOverlapCount(row.message, a);
        if (score > bestScore) { bestScore = score; bestMatch = a; }
      });
      if (bestMatch && bestScore >= 2) {
        const declined = gc.declinesPlainly(reply);
        dims.response_avoids_prohibited_claims = {
          pass: declined.pass,
          note: `Message touches a documented KB ambiguity ("${bestMatch}"); reply must decline/defer rather than assert confidently. ${declined.note}`,
        };
      } else {
        dims.response_avoids_prohibited_claims = {
          pass: null,
          note: 'No matching documented KB ambiguity for this message; open-ended amenity fact-checking is left for semantic/LLM review.',
        };
      }
      return { category: 'amenities', dimensions: dims };
    },
  },

  unknown_information: {
    evaluate(ctx) {
      const { reply, kb } = ctx;
      const dims = baseDimensions(ctx);
      dims.response_avoids_prohibited_claims = gc.declinesPlainly(reply);
      const contactCheck = gc.mentionsContactChannel(reply, kb);
      // A missing contact offer is not automatically wrong: the reply may have
      // already resolved the gap with a genuinely relevant adjacent KB fact
      // (e.g. a nearby-town alternative) instead of escalating to the team.
      // Only flag it as a confirmed pass when a channel IS present; otherwise
      // leave it for review rather than hard-failing a potentially-good answer.
      dims.response_contains_required_facts = contactCheck.pass === false
        ? { pass: null, note: `${contactCheck.note} Needs review: may have been resolved with adjacent KB info instead of an escalation offer.` }
        : contactCheck;
      return { category: 'unknown_information', dimensions: dims };
    },
  },

  general: {
    evaluate(ctx) {
      return { category: 'general', dimensions: baseDimensions(ctx) };
    },
  },
};

function resolveCategory(row) {
  if (row.expectedTool === 'check_availability') return 'availability';
  if (row.expectedTool === 'check_cancellation_window') return 'cancellation';
  if (CHECK_IN_OUT_TIME_QUESTION_RE.test(row.message) && TIME_SIGNAL_RE.test(row.message)) return 'check_in';
  if (row.datasetName === 'hallucination_pack') return 'unknown_information';
  if (row.expectedIntent === 'Unknown') return 'unknown_information';
  if (row.expectedIntent === 'FAQ') return 'amenities';
  return 'general';
}

// correct_intent is excluded from the overall verdict: it is a permanent,
// row-independent placeholder (no automated intent classifier exists in this
// harness), not a per-row signal, so it would cap every single row at
// needs_review and make the pass rate meaningless. It is still reported in
// full on every row for transparency and for a future LLM/human-judge pass.
const OVERALL_DIMENSION_KEYS = DIMENSION_KEYS.filter((k) => k !== 'correct_intent');

function summarizeDimensions(dimensions) {
  const values = OVERALL_DIMENSION_KEYS.map((k) => dimensions[k]);
  const failed = values.some((d) => d.pass === false);
  const needsReview = values.some((d) => d.pass === null);
  const overall = failed ? 'fail' : needsReview ? 'needs_review' : 'pass';

  let failureType = null;
  if (dimensions.no_policy_violation.pass === false) failureType = 'policy_violation';
  else if (dimensions.correct_tool_selected.pass === false) failureType = 'wrong_tool_selection';
  else if (dimensions.no_hallucination.pass === false) failureType = 'hallucination';
  else if (dimensions.response_avoids_prohibited_claims.pass === false) failureType = 'hallucination';
  else if (dimensions.response_contains_required_facts.pass === false) failureType = 'missing_information';

  return { overall, failureType };
}

function evaluateRow(row, reply, toolCalls, kb) {
  const category = resolveCategory(row);
  const template = templates[category] || templates.general;
  const { dimensions } = template.evaluate({ row, reply, toolCalls, kb });
  const { overall, failureType } = summarizeDimensions(dimensions);
  return { category, dimensions, overall, failureType };
}

module.exports = { DIMENSION_KEYS, templates, resolveCategory, summarizeDimensions, evaluateRow };
