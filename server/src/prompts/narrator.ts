import { buildSystemPrompt } from './_shared.js';

export interface NarratorPromptInput {
  brain: string;
  sessionId: string;
  // Pre-computed so Claude doesn't do arithmetic
  stats: {
    matched: number;
    unmatched: number;
    totalBankTxns: number;
    closeProbability: number;
    resolvedBlockers: number;
  };
  // Summary of what went wrong — Claude narrates these, not re-diagnoses them
  unmatchedSummary: Array<{
    bankId: string;
    failureReason: string;
    details: string;
  }>;
}

const JSON_SHAPE = `{
  "sessionId": string,
  "headline": string (one punchy sentence: what defined this session),
  "narrative": string (2-3 paragraphs separated by \\n\\n, plain English, reference specific vendors and amounts),
  "learnedThisSession": [
    {
      "insight": string (what the Brain would update about this customer, specific and actionable),
      "category": "vendor" | "pattern" | "risk"
    }
  ],
  "stats": {
    "matched": number (integer),
    "unmatched": number (integer),
    "closeProbability": number (0.0 to 1.0),
    "resolvedBlockers": number (integer)
  }
}`;

const RULES = [
  'headline must name the biggest blocker or win of the session.',
  'narrative must reference at least 2 specific transaction IDs or vendor names.',
  'learnedThisSession must have 2-4 items. Each insight must be actionable, not generic.',
  'stats must exactly match the numbers provided — do not invent or round.',
  'Tone: smart colleague giving a debrief — specific, warm, useful. Not corporate or robotic.',
];

export function narratorPrompt(input: NarratorPromptInput): { system: string; user: string } {
  const system = buildSystemPrompt(
    'At the end of a reconciliation session, you produce a plain-English summary for the accountant.',
    JSON_SHAPE,
    RULES,
  );

  const user = `
Financial Brain (customer context):
${input.brain}

Session ID: ${input.sessionId}
Results: ${input.stats.matched} matched, ${input.stats.unmatched} unmatched out of ${input.stats.totalBankTxns} bank transactions.
Close probability: ${Math.round(input.stats.closeProbability * 100)}%
Resolved blockers this session: ${input.stats.resolvedBlockers}

Unmatched cases to narrate:
${JSON.stringify(input.unmatchedSummary, null, 2)}

Produce the session narrative now.
`.trim();

  return { system, user };
}
