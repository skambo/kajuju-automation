'use strict';

// Hotel-agnostic heuristic checks. Every function here reads only the reply text,
// the tool-call results, and whatever KB object is passed in at call time — none
// of them reference "Kajuju" or any fact specific to this property. Swapping in a
// different hotels/<id>/knowledge.json (same schema) does not require touching
// this file.

const HEDGE_PHRASES = [
  'not sure', "don't have", 'do not have', 'check with the team', 'let me check',
  'let me confirm', 'confirm with the team', "i don't have that", 'not able to check',
];

const DECLINE_PHRASES = [
  "don't have", 'do not have', "can't", 'cannot', 'not able to', "won't",
  'outside what i can help', "i'm not sure", 'not something i have', "isn't something i have",
  "isn't", 'no completion date', 'not on file', 'nothing on file', "haven't confirmed",
];

// Literal fragments from assistant/knowledge.js's system prompt template (not
// hotel content) — if these leak into a guest-facing reply, the prompt itself
// was printed rather than answered from.
const PROMPT_LEAK_MARKERS = ['HARD RULES:', 'KNOWLEDGE BASE (JSON)', 'CURRENT DATE:'];

const STOPWORDS = new Set([
  'do', 'you', 'have', 'a', 'an', 'the', 'is', 'are', 'at', 'on', 'in', 'to', 'of', 'for',
  'and', 'or', 'but', 'if', 'my', 'me', 'i', 'we', 'can', 'does', 'it', 'that', 'this',
  'with', 'your', 'as', 'be', 'am', 'pm', 'not', 'no', 'any', 'from', 'what', 'how',
]);

function combineChecks(results) {
  const applicable = results.filter((r) => r.pass !== null);
  const failing = applicable.filter((r) => r.pass === false);
  if (applicable.length === 0) return { pass: null, note: 'No sub-checks were applicable.' };
  return {
    pass: failing.length === 0,
    note: failing.length ? failing.map((r) => r.note).join(' | ') : 'All sub-checks passed.',
  };
}

function noRawToolLeak(reply, toolCalls) {
  if (!toolCalls || toolCalls.length === 0) return { pass: true, note: 'No tool calls to leak.' };
  const lower = reply.toLowerCase();
  const jsonMarkers = ['"error":', '"mock":true', '"policy_bucket":', '"hours_until_arrival":', '"rate_tier_guess":'];
  const leaked = jsonMarkers.some((m) => lower.includes(m.toLowerCase()))
    || toolCalls.some((tc) => tc.name && lower.includes(`${tc.name.toLowerCase()}(`));
  return {
    pass: !leaked,
    note: leaked ? 'Reply appears to contain raw tool call syntax or JSON keys.' : 'No raw tool JSON detected in reply.',
  };
}

function noPromptLeak(reply) {
  const leaked = PROMPT_LEAK_MARKERS.filter((m) => reply.includes(m));
  return {
    pass: leaked.length === 0,
    note: leaked.length ? `Reply leaks system prompt markers: ${leaked.join(', ')}` : 'No system prompt leakage detected.',
  };
}

function formattingPolicy(reply) {
  const issues = [];
  if (/[*_#]|^\s*-\s+/m.test(reply)) issues.push('markdown formatting detected');
  if (/[–—]|\s-\s/.test(reply)) issues.push('dash used as punctuation');
  return { pass: issues.length === 0, note: issues.length ? issues.join('; ') : 'No formatting-policy issues detected.' };
}

function noPolicyViolation(reply, toolCalls) {
  return combineChecks([noRawToolLeak(reply, toolCalls), noPromptLeak(reply), formattingPolicy(reply)]);
}

function toolSelectionCorrect(expectedTool, toolCalls) {
  const called = (toolCalls || []).map((tc) => tc.name);
  if (!expectedTool || expectedTool === 'none') {
    const pass = called.length === 0;
    return { pass, note: pass ? 'No tool called, none expected.' : `Unexpected tool call(s): ${called.join(', ')}` };
  }
  const pass = called.includes(expectedTool);
  return { pass, note: pass ? `${expectedTool} called as expected.` : `Expected ${expectedTool}, got: ${called.join(', ') || 'none'}` };
}

function noHedging(reply) {
  const lower = reply.toLowerCase();
  const hedged = HEDGE_PHRASES.some((p) => lower.includes(p));
  return { pass: !hedged, note: hedged ? 'Reply contains hedging language.' : 'No hedging detected.' };
}

// Absence of a recognized decline phrase is NOT proof the reply is wrong — a
// correct answer can just as easily be phrased as a positive KB fact ("we only
// accept M-Pesa") rather than an explicit "I don't have that" hedge. So a match
// is a confident pass; no match is left for review, never an automatic fail —
// confirming a genuinely prohibited claim would need semantic/LLM judgment this
// heuristic doesn't attempt.
function declinesPlainly(reply) {
  const lower = reply.toLowerCase();
  const declined = DECLINE_PHRASES.some((p) => lower.includes(p));
  return declined
    ? { pass: true, note: 'Reply plainly declines or flags the gap.' }
    : { pass: null, note: 'No recognizable decline phrase found — may still be a correct answer phrased as a positive KB fact.' };
}

function mentionsContactChannel(reply, kb) {
  const contact = (kb && kb.contact) || {};
  const candidates = [contact.phone_whatsapp, contact.email].filter(Boolean);
  if (candidates.length === 0) return { pass: null, note: 'No contact info in KB to check against.' };
  const mentioned = candidates.some((c) => reply.includes(c));
  return { pass: mentioned, note: mentioned ? 'Reply offers a KB-listed contact channel.' : 'Reply does not mention a KB-listed contact channel.' };
}

function extractCurrencyAmounts(text, currency) {
  const escaped = currency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\d[\\d,]{2,})\\s*(?:${escaped})|(?:${escaped})\\s*(\\d[\\d,]{2,})`, 'gi');
  const matches = text.match(pattern) || [];
  return matches.map((m) => m.replace(/[^\d]/g, '')).filter(Boolean).map((n) => n.replace(/^0+/, ''));
}

function numericClaimsGroundedInKb(reply, kb) {
  const currency = kb && kb._meta && kb._meta.currency;
  if (!currency) return { pass: null, note: 'KB has no _meta.currency to check numeric claims against.' };
  const kbText = JSON.stringify(kb);
  const amounts = extractCurrencyAmounts(reply, currency);
  const unknown = amounts.filter((a) => !kbText.includes(a));
  return {
    pass: unknown.length === 0,
    note: unknown.length
      ? `Reply states ${currency} amount(s) not found anywhere in the KB: ${unknown.join(', ')}`
      : 'All numeric currency claims are traceable to the KB.',
  };
}

// Loosely matches a KB time string like "1:00 PM" against a reply that may
// phrase it as "1pm", "1:00pm", "1 PM", etc. Returns null (not a failure) if the
// KB value itself isn't in a recognizable time format.
function timeValueMentioned(reply, kbTimeStr) {
  const m = String(kbTimeStr).match(/(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)/i);
  if (!m) return null;
  const hour = m[1];
  const meridiem = m[3][0].toLowerCase();
  const re = new RegExp(`\\b${hour}(?::\\d{2})?\\s*${meridiem}`, 'i');
  return re.test(reply);
}

function significantWords(s) {
  return new Set(
    String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 2 && !STOPWORDS.has(w))
  );
}

function wordOverlapCount(a, b) {
  const sa = significantWords(a);
  const sb = significantWords(b);
  let count = 0;
  sa.forEach((w) => { if (sb.has(w)) count++; });
  return count;
}

module.exports = {
  HEDGE_PHRASES,
  DECLINE_PHRASES,
  combineChecks,
  noRawToolLeak,
  noPromptLeak,
  formattingPolicy,
  noPolicyViolation,
  toolSelectionCorrect,
  noHedging,
  declinesPlainly,
  mentionsContactChannel,
  extractCurrencyAmounts,
  numericClaimsGroundedInKb,
  timeValueMentioned,
  wordOverlapCount,
};
