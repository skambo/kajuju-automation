import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { renderMarkdown, writeSummary, maybeSendEmail, type AgenticReport } from './report.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 8000;
const MAX_TOOL_TURNS = 20;

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
    const pagesVisited = new Set<string>();

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
        console.error('[agentic] Treat this as a bug to investigate, not something to raise the cap for — see agentic/TESTING.md.');
        exitCode = 1;
        break;
      }

      console.log(`[agentic] turn ${toolTurns}/${MAX_TOOL_TURNS}: ${toolUseBlocks.map((b) => b.name).join(', ')}`);

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
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
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: [{ type: 'text', text: `Tool call failed: ${err instanceof Error ? err.message : String(err)}` }],
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }

    const usage = { totalInputTokens, totalOutputTokens };
    const inputCost = (totalInputTokens / 1_000_000) * 2;
    const outputCost = (totalOutputTokens / 1_000_000) * 10;
    console.log('\n[agentic] --- token usage ---');
    console.log(`  input tokens:  ${totalInputTokens}`);
    console.log(`  output tokens: ${totalOutputTokens}`);
    console.log(`  estimated cost: $${(inputCost + outputCost).toFixed(4)} (Sonnet 5 @ $2/$10 per MTok)`);

    if (!finalReport) {
      // Hard cap or malformed JSON — still emit a minimal failure report so
      // the workflow summary/email has something concrete to show.
      finalReport = {
        outcome: 'failure',
        pagesVisited: Array.from(pagesVisited),
        questionsAnswered: persona.questions.map((q) => ({ q, answer: '', found: false })),
        missingInfo: ['The agent did not produce a valid final report — see the run console output.'],
        confusions: [],
        recommendations: [],
      };
      exitCode = 1;
    }

    const markdown = renderMarkdown(finalReport, persona.name, usage);
    writeSummary(markdown);
    await maybeSendEmail(markdown, finalReport, { send: sendEmail });
  } finally {
    await mcpClient.close().catch(() => {});
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[agentic] fatal error:', err);
  process.exit(1);
});
