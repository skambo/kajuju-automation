'use strict';

const path = require('path');

// Which hotel folder under hotels/ this instance is grounded on. Change this
// (or set the HOTEL_ID env var) to point the assistant at a different
// hotel's data — no other code needs to change.
const HOTEL_ID = process.env.HOTEL_ID || 'kajuju';

const HOTELS_DIR = path.join(__dirname, '..', 'hotels');
const HOTEL_DIR = path.join(HOTELS_DIR, HOTEL_ID);
const KNOWLEDGE_PATH = path.join(HOTEL_DIR, 'knowledge.json');

// Two independent model config values, so cost can match the use case:
// - CHAT_MODEL: the local chat server used for manual interactive testing.
//   Keeps the stronger model since a human is driving it turn by turn.
// - REGRESSION_MODEL: the regression suite and any bulk automated dataset
//   run (adversarial/hallucination passes included). These are high-volume,
//   grounded FAQ-style conversations that don't need the most expensive
//   model, so this defaults to a faster/cheaper one. Either can be changed
//   independently via its env var without touching code.
const CHAT_MODEL = process.env.CHAT_MODEL || 'claude-sonnet-5';
const REGRESSION_MODEL = process.env.REGRESSION_MODEL || 'claude-haiku-4-5';

module.exports = { HOTEL_ID, HOTELS_DIR, HOTEL_DIR, KNOWLEDGE_PATH, CHAT_MODEL, REGRESSION_MODEL };
