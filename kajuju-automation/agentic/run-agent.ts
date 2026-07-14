import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { renderMarkdown, writeSummary, maybeSendEmail, type AgenticReport } from './report.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 8000;
// Lowered from 20 based on a real CI transcript: a well-scoped session
// answers all persona questions in ~8-10 turns. 15 leaves headroom without
// bankrolling an open-ended task (e.g. completing an actual reservation)
// that was never part of the job.
const MAX_TOOL_TURNS = 15;
// How many tool-use turns before the hard cap to inject an explicit,
// proximate stop-now warning as a real message (see the turn-budget
// enforcement block below) — a rule stated once in the system prompt at the
// start of a long session isn't reliably followed; an immediate instruction
// close to the cap is.
const TURN_WARNING_REMAINING = 3;

interface Persona {
  name: string;
  description: string;
  goal: string;
  questions: string[];
}

function buildSystemPrompt(persona: Persona, targetUrl: string, maxTurns: number): string {
  return `You are role-playing as a website visitor, testing whether the site actually works for a real person — not whether buttons technically function, but whether a human could understand it and accomplish their goal.

# Your persona
Name: ${persona.name}
Description: ${persona.description}
Goal: ${persona.goal}

# Rules
- You have browser tools (Playwright MCP). Use them to navigate and read the page the way a real visitor would. You were not given selectors, a sitemap, or any hint about the page structure — discover it yourself, the same way a first-time visitor would.
- Answer every question below using ONLY information you actually find on the site. If you cannot find an answer after a genuine attempt, say so in the answer and set "found" to false — do not guess, and do not fill gaps from outside knowledge about the property, the region, or hospitality in general.
- Note anything confusing, slow, broken, or unclear as you go — these observations matter as much as the answers.
- Booking links on this site may show a brief notice or tooltip warning that you're about to leave for an external booking site before or as the page navigates there. That notice is expected, working-as-intended behavior — do not treat it as a bug or dead end; follow it through to see where it leads.
- For any question about how to complete a booking, you only need to click through to the external booking site and observe what's there — room list, pricing, date/guest selectors. Describe what you see. Do NOT attempt to select specific dates, fill in guest counts, click through a calendar, or otherwise complete an actual reservation. Once you can describe what the booking flow looks like and confirm it's functional, that's sufficient to answer the question.
- You have a hard limit of ${maxTurns} tool-use turns for this entire session. Pace yourself: if you are past turn ${Math.max(
    1,
    maxTurns - 5,
  )} and have not reached a conclusion, stop exploring immediately and write your best-effort final report using what you have found so far.

# Questions to answer
${persona.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

# Final output
When you are done investigating (or forced to stop by the turn limit), your final message must contain ONLY a single JSON object — no markdown code fences, no prose before or after it — matching exactly this shape:

{
  "outcome": "success" | "partial" | "failure",
  "pagesVisited": string[],
  "questionsAnswered": [{ "q": string, "answer": string, "found": boolean }],
  "missingInfo": string[],
  "confusions": string[],
  "recommendations": string[]
}

- "outcome": "success" if you found everything you needed to accomplish your goal, "partial" if you found some but not all of it, "failure" if the site left you stuck or confused.
- "questionsAnswered" must have exactly one entry per question above, in the same order.
- Do not call any more tools once you produce this final message.

Start by navigating to ${targetUrl}.`;
}

// Tool calls whose result tells us what page/state the browser is actually
// on — used for both the console preview log and loop detection below.
const PAGE_STATE_TOOLS = new Set(['browser_snapshot', 'browser_navigate']);
const STUCK_TURN_THRESHOLD = 3;

function extractResultText(items: any[] | undefined): string {
  return (items ?? [])
    .filter((item) => item.type === 'text')
    .map((item) => item.text ?? '')
    .join('\n');
}

type ToolResultContent = Exclude<Anthropic.Messages.ToolResultBlockParam['content'], string | undefined>;

function mcpContentToClaudeBlocks(items: any[] | undefined): ToolResultContent {
  const blocks: ToolResultContent = [];
  for (const item of items ?? []) {
    if (item.type === 'text') {
      blocks.push({ type: 'text', text: item.text ?? '' });
    } else if (item.type === 'image') {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: item.mimeType || 'image/png', data: item.data },
      });
    } else {
      // resource/audio/other block types we don't render specially — pass through as text
      // so the model still sees something rather than silently losing the result.
      blocks.push({ type: 'text', text: JSON.stringify(item) });
    }
  }
  if (blocks.length === 0) {
    blocks.push({ type: 'text', text: '(tool call returned no content)' });
  }
  return blocks;
}

function parseFinalReport(text: string): AgenticReport | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    const parsed = JSON.parse(candidate);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.questionsAnswered) &&
      Array.isArray(parsed.pagesVisited) &&
      typeof parsed.outcome === 'string'
    ) {
      return parsed as AgenticReport;
    }
    console.error('[agentic] final response parsed as JSON but is missing expected fields:');
    console.error(candidate.slice(0, 2000));
    return null;
  } catch {
    console.error('[agentic] could not parse final response as JSON. Raw text:');
    console.error(trimmed.slice(0, 2000));
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const headed = args.includes('--headed');
  const sendEmail = args.includes('--send-email') || process.env.SEND_EMAIL === 'true';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[agentic] ANTHROPIC_API_KEY is not set. See agentic/TESTING.md for setup.');
    process.exit(1);
  }

  const persona: Persona = JSON.parse(
    readFileSync(path.join(__dirname, 'personas', 'first-time-guest.json'), 'utf-8'),
  );

  let targetUrl: string;
  if (dryRun) {
    targetUrl = pathToFileURL(path.resolve(__dirname, '../apps/landing-pages/dist/index.html')).href;
  } else {
    const siteUrl = process.env.TARGET_SITE_URL;
    if (!siteUrl) {
      console.error(
        '[agentic] TARGET_SITE_URL is not set. Set it in agentic/.env (see agentic/.env.example) to the site you want to test, or use --dry-run for a local smoke test.',
      );
      process.exit(1);
    }
    targetUrl = siteUrl;
  }

  console.log(`\n[agentic] persona: ${persona.name}`);
  console.log(
    `[agentic] target: ${targetUrl}${dryRun ? '  (dry run — local static copy, not the live site)' : ''}\n`,
  );

  const mcpArgs = ['playwright-mcp', '--isolated'];
  if (!headed) mcpArgs.push('--headless');
  if (dryRun) mcpArgs.push('--allow-unrestricted-file-access'); // required for file:// navigation

  const transport = new StdioClientTransport({ command: 'npx', args: mcpArgs });
  const mcpClient = new Client({ name: 'kajuju-agentic-tester', version: '1.0.0' });

  let exitCode = 0;

  try {
    await mcpClient.connect(transport);

    const { tools: mcpTools } = await mcpClient.listTools();
    const claudeTools: Anthropic.Messages.Tool[] = mcpTools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
    }));

    console.log(`[agentic] loaded ${claudeTools.length} browser tools from Playwright MCP\n`);

    const anthropic = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt(persona, targetUrl, MAX_TOOL_TURNS);

    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: 'user',
        content: `Begin the session as ${persona.name}.`,
      },
    ];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let toolTurns = 0;
    let finalReport: AgenticReport | null = null;
    let abortDiagnostic: string | null = null;
    const pagesVisited = new Set<string>();

    // Loop detection: if the page snapshot/navigate result comes back
    // identical several turns in a row, the agent is stuck (bot challenge,
    // blocking modal, dead link) rather than making progress — abort instead
    // of burning the full turn budget on a state that will never change.
    let lastPageFingerprint: string | null = null;
    let stuckTurns = 0;

    // Turn-budget enforcement: code-driven, not just a system-prompt
    // suggestion. Once only TURN_WARNING_REMAINING turns are left, an
    // explicit user-role message is injected into the conversation so the
    // model gets an immediate, proximate instruction to wrap up.
    let turnWarningInjected = false;

    while (true) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: claudeTools,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      messages.push({ role: 'assistant', content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        const textBlock = response.content.find((b): b is Anthropic.Messages.TextBlock => b.type === 'text');
        finalReport = parseFinalReport(textBlock?.text ?? '');
        break;
      }

      toolTurns += 1;
      if (toolTurns > MAX_TOOL_TURNS) {
        console.error(
          `\n[agentic] FAILED: hit the hard cap of ${MAX_TOOL_TURNS} tool-use turns without a final report.`,
        );
        console.error(
          turnWarningInjected
            ? '[agentic] Note: the turn-budget warning WAS injected earlier and the model still did not stop — the warning itself was ignored, not merely untriggered. Treat this as a stronger signal of a prompt-adherence bug.'
            : '[agentic] Note: the turn-budget warning was never triggered before the cap — check TURN_WARNING_REMAINING / MAX_TOOL_TURNS.',
        );
        console.error('[agentic] Treat this as a bug to investigate, not something to raise the cap for — see agentic/TESTING.md.');
        exitCode = 1;
        break;
      }

      console.log(`[agentic] turn ${toolTurns}/${MAX_TOOL_TURNS}: ${toolUseBlocks.map((b) => b.name).join(', ')}`);

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      let loopAborted = false;
      for (const block of toolUseBlocks) {
        const input = block.input as Record<string, unknown>;
        if (block.name === 'browser_navigate' && typeof input?.url === 'string') {
          pagesVisited.add(input.url);
        }
        try {
          const result = await mcpClient.callTool({ name: block.name, arguments: input });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: mcpContentToClaudeBlocks(result.content as any[]),
            is_error: Boolean((result as any).isError),
          });

          if (PAGE_STATE_TOOLS.has(block.name)) {
            const resultText = extractResultText(result.content as any[]);
            console.log(
              `[agentic] turn ${toolTurns} ${block.name} preview: ${resultText.slice(0, 300).replace(/\s+/g, ' ')}`,
            );

            const fingerprint = createHash('sha256').update(resultText).digest('hex');
            if (fingerprint === lastPageFingerprint) {
              stuckTurns += 1;
            } else {
              lastPageFingerprint = fingerprint;
              stuckTurns = 1;
            }
            if (stuckTurns >= STUCK_TURN_THRESHOLD) {
              loopAborted = true;
            }
          }
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: [{ type: 'text', text: `Tool call failed: ${err instanceof Error ? err.message : String(err)}` }],
            is_error: true,
          });
        }
      }

      const turnsRemaining = MAX_TOOL_TURNS - toolTurns;
      const content: Anthropic.Messages.ContentBlockParam[] = [...toolResults];
      if (!turnWarningInjected && turnsRemaining <= TURN_WARNING_REMAINING) {
        turnWarningInjected = true;
        const warningText = `You have ${turnsRemaining} tool-use turns left. Stop exploring now and produce your final JSON report using what you've already found, marking unanswered questions as found: false rather than continuing to search.`;
        content.push({ type: 'text', text: warningText });
        console.log(`[agentic] turn ${toolTurns}: injected turn-budget warning — "${warningText}"`);
      }

      messages.push({ role: 'user', content });

      if (loopAborted) {
        abortDiagnostic =
          'Aborted: page appears stuck at the same state for 3+ turns, likely a bot-challenge or modal blocking interaction. See transcript artifact.';
        console.error(`\n[agentic] ${abortDiagnostic}`);
        exitCode = 1;
        break;
      }
    }

    const usage = { totalInputTokens, totalOutputTokens };
    const inputCost = (totalInputTokens / 1_000_000) * 2;
    const outputCost = (totalOutputTokens / 1_000_000) * 10;
    console.log('\n[agentic] --- token usage ---');
    console.log(`  input tokens:  ${totalInputTokens}`);
    console.log(`  output tokens: ${totalOutputTokens}`);
    console.log(`  estimated cost: $${(inputCost + outputCost).toFixed(4)} (Sonnet 5 @ $2/$10 per MTok)`);

    if (!finalReport) {
      // Hard cap, loop-detection abort, or malformed JSON — still emit a
      // minimal failure report so the workflow summary/email has something
      // concrete to show.
      finalReport = {
        outcome: 'failure',
        pagesVisited: Array.from(pagesVisited),
        questionsAnswered: persona.questions.map((q) => ({ q, answer: '', found: false })),
        missingInfo: [abortDiagnostic ?? 'The agent did not produce a valid final report — see the run console output.'],
        confusions: [],
        recommendations: [],
      };
      exitCode = 1;
    }

    const markdown = renderMarkdown(finalReport, persona.name, usage);
    writeSummary(markdown);
    await maybeSendEmail(markdown, finalReport, { send: sendEmail });

    // Full raw transcript (every message sent to/from the API, including all
    // tool_use/tool_result blocks) — written on every run, not just failures,
    // so CI vs. local behavior can be diffed. Uploaded as a build artifact by
    // the workflow.
    const transcriptPath = path.join(__dirname, 'transcript.json');
    writeFileSync(
      transcriptPath,
      JSON.stringify({ persona: persona.name, targetUrl, systemPrompt, messages, usage, finalReport }, null, 2),
    );
    console.log(`[agentic] full transcript written to ${transcriptPath}`);
  } finally {
    await mcpClient.close().catch(() => {});
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[agentic] fatal error:', err);
  process.exit(1);
});
