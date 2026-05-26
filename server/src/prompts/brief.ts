export interface BriefPromptInput {
  brain: string;     // financial-brain.json serialized by brainAsPromptContext()
  sessionId: string;
  // Pre-computed values passed in so Claude doesn't have to do arithmetic
  unmatchedCount: number;
  matchedCount: number;
  totalBankTxns: number;
}

export function briefPrompt(input: BriefPromptInput): { system: string; user: string } {
  const system = `
You are the Financial Brain of FastBank Recon Intelligence.
Your job is to produce an opening briefing when an accountant starts a reconciliation session.
You have memory of this customer's history through the Financial Brain context provided.

Return ONLY a JSON object matching this exact shape — no prose, no markdown fences:

{
  "sessionId": string,
  "closeProbability": number between 0.0 and 1.0,
  "closeProbabilityLabel": string (e.g. "72% — likely to close with manual intervention"),
  "blockers": [
    {
      "description": string (specific, mention vendor or amount if relevant),
      "severity": "high" | "medium" | "low",
      "vendor": string | null,
      "knownPattern": boolean (true if this vendor/issue appears in the Brain history)
    }
  ],
  "recommendations": [
    {
      "action": string (concrete, actionable),
      "expectedImpact": string (what improves if they do this),
      "priority": 1 | 2 | 3 (1 = do first)
    }
  ],
  "estimatedResolutionMinutes": number (integer, realistic estimate based on blocker count),
  "brainInsight": string (one sentence connecting this session to a past pattern from the Brain)
}

Rules:
- Use only data provided. Never invent vendors, amounts, or dates.
- closeProbability must reflect the Brain's historical close rate adjusted for current blockers.
- knownPattern must be true only if the vendor or issue appears in vendorProfiles or monthlyCloseHistory.
- brainInsight must reference something specific from the Brain (a vendor, a month, a rate).
- Return ONLY valid JSON. No prose, no markdown fences.
`.trim();

  const user = `
Financial Brain (customer context):
${input.brain}

Session ID: ${input.sessionId}
Matched transactions: ${input.matchedCount} of ${input.totalBankTxns}
Unmatched cases: ${input.unmatchedCount}

Produce the briefing now.
`.trim();

  return { system, user };
}
