import { appendFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

export interface QuestionResult {
  q: string;
  answer: string;
  found: boolean;
}

export interface AgenticReport {
  outcome: 'success' | 'partial' | 'failure';
  pagesVisited: string[];
  questionsAnswered: QuestionResult[];
  missingInfo: string[];
  confusions: string[];
  recommendations: string[];
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
}

const OUTCOME_EMOJI: Record<AgenticReport['outcome'], string> = {
  success: '✅',
  partial: '⚠️',
  failure: '❌',
};

// Claude Sonnet 5 introductory pricing per SKILL.md — revisit after 2026-08-31.
const INPUT_PRICE_PER_MTOK = 2;
const OUTPUT_PRICE_PER_MTOK = 10;

export function estimateCost(usage: UsageSummary): number {
  const inputCost = (usage.totalInputTokens / 1_000_000) * INPUT_PRICE_PER_MTOK;
  const outputCost = (usage.totalOutputTokens / 1_000_000) * OUTPUT_PRICE_PER_MTOK;
  return inputCost + outputCost;
}

export function renderMarkdown(report: AgenticReport, personaName: string, usage: UsageSummary): string {
  const totalCost = estimateCost(usage);

  const lines: string[] = [];
  lines.push(`# Agentic Discovery Test — ${personaName}`);
  lines.push('');
  lines.push(`**Outcome:** ${OUTCOME_EMOJI[report.outcome]} ${report.outcome.toUpperCase()}`);
  lines.push('');
  lines.push(`**Pages visited:** ${report.pagesVisited.length ? report.pagesVisited.join(', ') : '_none recorded_'}`);
  lines.push('');
  lines.push('## Questions');
  lines.push('');
  for (const qa of report.questionsAnswered) {
    lines.push(`- ${qa.found ? '✅' : '❌'} **${qa.q}**`);
    lines.push(`  ${qa.answer || '_no answer given_'}`);
  }
  lines.push('');

  if (report.missingInfo.length) {
    lines.push('## Missing information');
    lines.push('');
    for (const item of report.missingInfo) lines.push(`- ${item}`);
    lines.push('');
  }

  if (report.confusions.length) {
    lines.push('## Points of confusion');
    lines.push('');
    for (const item of report.confusions) lines.push(`- ${item}`);
    lines.push('');
  }

  if (report.recommendations.length) {
    lines.push('## Recommendations');
    lines.push('');
    for (const item of report.recommendations) lines.push(`- ${item}`);
    lines.push('');
  }

  lines.push('## Run cost');
  lines.push('');
  lines.push(`- Input tokens: ${usage.totalInputTokens.toLocaleString()}`);
  lines.push(`- Output tokens: ${usage.totalOutputTokens.toLocaleString()}`);
  lines.push(
    `- Estimated cost: $${totalCost.toFixed(4)} (Claude Sonnet 5 @ $${INPUT_PRICE_PER_MTOK}/$${OUTPUT_PRICE_PER_MTOK} per MTok)`,
  );
  lines.push('');

  return lines.join('\n');
}

/** Writes to $GITHUB_STEP_SUMMARY in CI, or stdout locally. */
export function writeSummary(markdown: string): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (process.env.CI && summaryPath) {
    appendFileSync(summaryPath, markdown + '\n');
    console.log('[agentic] report written to $GITHUB_STEP_SUMMARY');
  } else {
    console.log('\n' + markdown);
  }
}

export interface EmailOptions {
  send: boolean;
}

/**
 * Skipped by default everywhere (local and CI) — the caller must opt in via
 * --send-email or SEND_EMAIL=true, so routine local runs never touch the
 * real alert inbox.
 */
export async function maybeSendEmail(
  markdown: string,
  report: AgenticReport,
  options: EmailOptions,
): Promise<void> {
  if (!options.send) {
    console.log('[agentic] email skipped (pass --send-email or set SEND_EMAIL=true to enable)');
    return;
  }

  const { GMAIL_USERNAME, GMAIL_APP_PASSWORD, ALERT_EMAIL } = process.env;
  if (!GMAIL_USERNAME || !GMAIL_APP_PASSWORD || !ALERT_EMAIL) {
    console.log(
      '[agentic] email requested but GMAIL_USERNAME/GMAIL_APP_PASSWORD/ALERT_EMAIL are not all set — skipping.',
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USERNAME, pass: GMAIL_APP_PASSWORD },
  });

  const subjectEmoji = report.outcome === 'success' ? '✅' : report.outcome === 'partial' ? '⚠️' : '🚨';

  await transporter.sendMail({
    from: `Kajuju Agentic Tester <${GMAIL_USERNAME}>`,
    to: ALERT_EMAIL,
    subject: `${subjectEmoji} Agentic discovery test: ${report.outcome}`,
    text: markdown,
  });

  console.log(`[agentic] report emailed to ${ALERT_EMAIL}`);
}
