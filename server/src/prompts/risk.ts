import type { VendorProfile } from '../services/brain.js';

export interface BrainMeta {
  customerId: string;
  sessionsAnalyzed: number;
  historicalCloseRate: number;
}

export interface RiskPromptInput {
  vendorProfile: VendorProfile | null;
  brainMeta: BrainMeta;
  bankTransaction: {
    id: string;
    date: string;
    amount: number;
    description: string;
    reference: string;
  };
  // null if the transaction is matched (low risk by default)
  unmatchedCase: {
    failureReason: string;
    details: string;
  } | null;
  // Other bank transactions on the same date with same amount — duplicate signal
  potentialDuplicates: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

export function riskPrompt(input: RiskPromptInput): { system: string; user: string } {
  const system = `
You are the Financial Brain of FastBank Recon Intelligence.
Your job is to assess the financial risk of an unmatched bank transaction
based on the customer's history and current session data.

Return ONLY a JSON object matching this exact shape — no prose, no markdown fences:

{
  "transactionId": string,
  "riskLevel": "critical" | "high" | "medium" | "low",
  "riskLabel": string (short, human-readable, e.g. "Critical — potential duplicate payment of $9,800"),
  "flags": [
    {
      "type": one of: "duplicate_payment" | "unusual_amount" | "vendor_anomaly" | "timing_anomaly" | "missing_sap_entry" | "policy_violation",
      "description": string (specific, mention amounts, dates, or vendor names)
    }
  ],
  "recommendation": "escalate" | "review" | "auto_resolve" | "ignore",
  "brainBasis": string (one sentence: what Brain history supports this risk rating)
}

Risk level rules:
- "critical": duplicate payment suspected, or amount > 3x vendor average
- "high": vendor anomaly with no Brain precedent, or SAP conflict
- "medium": known pattern with moderate impact (date tolerance miss, unclassified fee)
- "low": known recurring item with no financial risk (e.g. standard bank fee)

Recommendation rules:
- "escalate": critical risk, needs human decision before closing
- "review": high/medium risk, accountant should verify manually
- "auto_resolve": low risk, Brain has seen this before and it resolved itself
- "ignore": cosmetic issue, no financial impact

Rules:
- Assess ONLY the transaction provided. Do not reference any transaction IDs other than the one being assessed and those in the potentialDuplicates list.
- Only flag "duplicate_payment" if potentialDuplicates array is non-empty.
- brainBasis must reference specific data from the vendor profile or Brain metadata provided.
- Return ONLY valid JSON. No prose, no markdown fences.
`.trim();

  const duplicatesSection =
    input.potentialDuplicates.length > 0
      ? `Potential duplicates (same date + amount):\n${JSON.stringify(input.potentialDuplicates, null, 2)}`
      : 'No duplicate transactions detected.';

  const unmatchedSection = input.unmatchedCase
    ? `Failure reason: ${input.unmatchedCase.failureReason}\nDetails: ${input.unmatchedCase.details}`
    : 'Transaction is matched — assess residual risk only.';

  const vendorSection = input.vendorProfile
    ? `Vendor profile from Brain:\n${JSON.stringify(input.vendorProfile, null, 2)}`
    : 'Vendor not found in Brain history — no prior data available.';

  const user = `
Brain metadata:
Customer: ${input.brainMeta.customerId}
Sessions analyzed: ${input.brainMeta.sessionsAnalyzed}
Historical close rate: ${input.brainMeta.historicalCloseRate}

${vendorSection}

Transaction to assess:
${JSON.stringify(input.bankTransaction, null, 2)}

Matching status:
${unmatchedSection}

${duplicatesSection}

Assess the risk now.
`.trim();

  return { system, user };
}
