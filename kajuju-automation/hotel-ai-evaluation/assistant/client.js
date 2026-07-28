'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt } = require('./knowledge');
const { getTools, executeTool } = require('./tools');
const { CHAT_MODEL } = require('./config');

const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 4;

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to hotel-ai-evaluation/.env before starting the server.',
      );
    }
    client = new Anthropic();
  }
  return client;
}

// history: array of {role: 'user'|'assistant', content: string} from prior turns.
// model: optional override (e.g. REGRESSION_MODEL for bulk automated runs);
// defaults to CHAT_MODEL, the model the interactive server uses.
// Returns { reply: string, toolCalls: Array<{name, input, result}> }.
async function askAssistant(userMessage, history = [], model = CHAT_MODEL) {
  const anthropic = getClient();
  const system = buildSystemPrompt();
  const tools = getTools();

  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: userMessage });

  const toolCalls = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'disabled' },
      system,
      tools,
      messages,
    });

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find((b) => b.type === 'text');
      return { reply: textBlock ? textBlock.text : '', toolCalls };
    }

    // Append the assistant turn (including tool_use blocks) before the tool results.
    messages.push({ role: 'assistant', content: response.content });

    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
    const toolResultBlocks = [];

    for (const block of toolUseBlocks) {
      const result = executeTool(block.name, block.input);
      toolCalls.push({ name: block.name, input: block.input, result });
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
        is_error: Boolean(result && result.error),
      });
    }

    messages.push({ role: 'user', content: toolResultBlocks });
  }

  return {
    reply:
      "I'm having trouble finishing that request after checking availability — could you try rephrasing, or I can have the team follow up directly?",
    toolCalls,
  };
}

module.exports = { askAssistant, CHAT_MODEL };
