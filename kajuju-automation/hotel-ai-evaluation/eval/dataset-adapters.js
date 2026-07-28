'use strict';

// Normalizes any dataset CSV into one common row shape the regression suite and
// behaviour templates can consume, regardless of which of the two column shapes
// currently in use (guest_questions.csv's richer shape, or the leaner
// hotel,question,expected_tool,expected_behaviour shape used by
// hallucination_pack.csv and adversarial_tests.csv). This is a schema adapter,
// not a hotel adapter — it knows nothing about Kajuju specifically, only about
// column names.

function detectShape(header) {
  if (header.includes('user_message') && header.includes('expected_intent') && header.includes('tool_required')) {
    return 'guest_questions';
  }
  if (header.includes('question') && header.includes('expected_tool') && header.includes('expected_behaviour')) {
    return 'lean';
  }
  throw new Error(`Unrecognized dataset header shape: ${header.join(',')}`);
}

function normalizeRow(raw, index, { datasetName, shape }) {
  if (shape === 'guest_questions') {
    return {
      hotel: raw.hotel,
      id: raw.id || `${datasetName}_${String(index + 1).padStart(3, '0')}`,
      message: raw.user_message,
      expectedIntent: raw.expected_intent || null,
      expectedTool: String(raw.tool_required).toLowerCase() === 'true' ? 'check_availability' : 'none',
      notes: raw.notes || '',
      datasetName,
    };
  }
  return {
    hotel: raw.hotel,
    id: `${datasetName}_${String(index + 1).padStart(3, '0')}`,
    message: raw.question,
    expectedIntent: null,
    expectedTool: raw.expected_tool || 'none',
    notes: raw.expected_behaviour || '',
    datasetName,
  };
}

module.exports = { detectShape, normalizeRow };
