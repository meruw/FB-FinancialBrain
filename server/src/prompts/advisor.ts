import { buildSystemPrompt } from './_shared.js';
import type { VendorProfile } from '../services/brain.js';

export interface AdvisorPromptInput {
  vendorProfile: VendorProfile | null;
  brainMeta: {
    customerId: string;
    sessionsAnalyzed: number;
  };
  bankTransaction: {
    id: string;
    date: string;
    amount: number;
    description: string;
    reference: string;
  };
  unmatchedCase: {
    failureReason: string;
    details: string;
  };
  sapCandidates: Array<{
    id: string;
    postingDate: string;
    amount: number;
    memo: string;
  }>;
}

const JSON_SHAPE = `{
  "transactionId": string (the bank transaction ID provided),
  "action": string (short title for the recommended action, e.g. "Raise tolerance and re-run match"),
  "actionType": one of: "release_match" | "mark_fee" | "manual_match" | "escalate" | "flag_duplicate",
  "reasoning": string (2-3 sentences explaining why this action is correct for this transaction),
  "steps": [
    {
      "order": number (1-based),
      "instruction": string (one concrete step the accountant should take)
    }
  ],
  "risk": "critical" | "high" | "medium" | "low",
  "brainBasis": string (one sentence: what Brain history justifies this recommendation)
}`;

const RULES = [
  'actionType must map to the failure reason: date_tolerance_miss → manual_match, no_sap_counterpart → mark_fee, sap_already_matched → release_match, likely_duplicate → flag_duplicate, unknown → escalate.',
  'steps must be ordered, specific, and actionable. 2-5 steps max. No vague instructions like "review the transaction".',
  'risk reflects the financial exposure if this action is wrong, not the likelihood of the issue.',
  'reasoning must reference the specific amount, date, or vendor from the transaction data.',
  'brainBasis must reference specific data from the vendor profile or Brain metadata provided.',
  'Assess ONLY the transaction provided. Do not reference other transaction IDs.',
];

export function advisorPrompt(input: AdvisorPromptInput): { system: string; user: string } {
  const system = buildSystemPrompt(
    'Your job is to recommend a specific resolution action for an unmatched bank transaction.\nThe accountant will follow your steps to resolve it.',
    JSON_SHAPE,
    RULES,
  );

  const vendorSection = input.vendorProfile
    ? `Vendor profile from Brain:\n${JSON.stringify(input.vendorProfile, null, 2)}`
    : 'Vendor not found in Brain history — no prior data available.';

  const sapSection =
    input.sapCandidates.length > 0
      ? `Closest SAP candidates:\n${JSON.stringify(input.sapCandidates, null, 2)}`
      : 'No SAP candidates found near this date/amount.';

  const user = `
Brain metadata:
Customer: ${input.brainMeta.customerId}
Sessions analyzed: ${input.brainMeta.sessionsAnalyzed}

${vendorSection}

Transaction to resolve:
${JSON.stringify(input.bankTransaction, null, 2)}

Failure reason: ${input.unmatchedCase.failureReason}
Matching engine details: ${input.unmatchedCase.details}

${sapSection}

Recommend the resolution action now.
`.trim();

  return { system, user };
}
