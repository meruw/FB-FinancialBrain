import { buildSystemPrompt } from './_shared.js';

export interface DebugPromptInput {
  brain: string;
  // The specific bank transaction that failed to match
  bankTransaction: {
    id: string;
    date: string;
    amount: number;
    description: string;
    reference: string;
  };
  // The unmatched case record — already tells us the failure reason and details
  unmatchedCase: {
    failureReason: string;
    details: string;
  };
  // Closest SAP candidates found by the matching engine (may be empty)
  sapCandidates: Array<{
    id: string;
    postingDate: string;
    amount: number;
    memo: string;
  }>;
}

const JSON_SHAPE = `{
  "transactionId": string (the bank transaction ID provided),
  "diagnosis": string (2-3 sentences, plain English, specific to this transaction),
  "rootCause": one of: "date_tolerance_miss" | "no_sap_counterpart" | "sap_already_matched" | "amount_mismatch" | "likely_duplicate",
  "vendorContext": string | null (what the Brain knows about this vendor; null if vendor unknown),
  "suggestedFix": string (concrete action the accountant should take),
  "suggestedToleranceDays": number | null (only if rootCause is "date_tolerance_miss", otherwise null),
  "confidence": "high" | "medium" | "low"
}`;

const RULES = [
  'diagnosis must mention the specific date, amount, or reference from the transaction data.',
  'vendorContext must be drawn from the Brain\'s vendorProfiles. If the vendor is not in the Brain, return null.',
  'suggestedToleranceDays must equal the Brain\'s recommendedTolerance for that vendor if available.',
  'confidence is "high" if the rootCause matches a known Brain pattern, "medium" otherwise.',
];

export function debugPrompt(input: DebugPromptInput): { system: string; user: string } {
  const system = buildSystemPrompt(
    'Your job is to explain in plain English why a bank transaction failed to match a SAP entry,\nand what the accountant should do to fix it.',
    JSON_SHAPE,
    RULES,
  );

  const sapSection =
    input.sapCandidates.length > 0
      ? `Closest SAP candidates found:\n${JSON.stringify(input.sapCandidates, null, 2)}`
      : 'No SAP candidates found near this date/amount.';

  const user = `
Bank transaction to diagnose:
${JSON.stringify(input.bankTransaction, null, 2)}

AUTHORITATIVE FAILURE REASON (do not override): ${input.unmatchedCase.failureReason}
Matching engine details: ${input.unmatchedCase.details}

${sapSection}

Financial Brain (customer history for context):
${input.brain}

Diagnose the transaction above. Your rootCause MUST equal the authoritative failure reason stated above.
`.trim();

  return { system, user };
}
