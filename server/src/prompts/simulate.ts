import { buildSystemPrompt } from './_shared.js';
import type { VendorProfile } from '../services/brain.js';

export interface SimulatePromptInput {
  sessionId: string;
  scenarioType: 'tolerance_change' | 'vendor_fix' | 'threshold_change';
  vendorName?: string;
  proposedToleranceDays?: number;
  vendorProfile: VendorProfile | null;
  brainMeta: {
    customerId: string;
    sessionsAnalyzed: number;
  };
  metrics: {
    currentCloseProbability: number;
    projectedCloseProbability: number;
    projectedDelta: number;
    casesResolved: number;
    casesRemaining: number;
    financialImpact: number;
  };
}

const JSON_SHAPE = `{
  "scenarioLabel": string (short title for this scenario, e.g. "5-day tolerance for CONSTRUTECH"),
  "narrative": string (2-3 sentences explaining what would change if this scenario is applied, in plain language for an accountant),
  "brainBasis": string (one sentence: what Brain history supports this projection)
}`;

const RULES = [
  'scenarioLabel must be concise — under 60 characters. Describe the change, not the result.',
  'narrative must reference the specific numbers provided (projectedDelta, casesResolved, financialImpact). Do not invent numbers.',
  'brainBasis must reference specific data from the vendor profile or Brain metadata provided — not generic statements.',
  'Do NOT include projectedCloseProbability, casesResolved, or other numeric fields in your JSON — they are injected from code.',
  'Tone is confident and data-driven. This is a recommendation, not a guess.',
];

export function simulatePrompt(input: SimulatePromptInput): { system: string; user: string } {
  const system = buildSystemPrompt(
    'Your job is to write a narrative explanation for a reconciliation what-if scenario.\nAll numeric projections are pre-computed and provided — your role is language and judgment only.',
    JSON_SHAPE,
    RULES,
  );

  const vendorSection = input.vendorProfile
    ? `Vendor profile from Brain:\n${JSON.stringify(input.vendorProfile, null, 2)}`
    : input.vendorName
    ? `Vendor "${input.vendorName}" not found in Brain history.`
    : 'No specific vendor — account-level scenario.';

  const scenarioDescription =
    input.scenarioType === 'tolerance_change'
      ? `Raise date tolerance for ${input.vendorName ?? 'vendor'} from current to ${input.proposedToleranceDays} days`
      : input.scenarioType === 'vendor_fix'
      ? `Apply all Brain recommendations for ${input.vendorName ?? 'vendor'}`
      : `Apply all Brain recommendations across all vendors this session`;

  const user = `
Brain metadata:
Customer: ${input.brainMeta.customerId}
Sessions analyzed: ${input.brainMeta.sessionsAnalyzed}

${vendorSection}

Scenario being simulated:
Type: ${input.scenarioType}
Description: ${scenarioDescription}

Pre-computed projection results (use these exact numbers in your narrative):
- Current close probability: ${Math.round(input.metrics.currentCloseProbability * 100)}%
- Projected close probability: ${Math.round(input.metrics.projectedCloseProbability * 100)}%
- Improvement: +${input.metrics.projectedDelta} percentage points
- Cases that would be resolved: ${input.metrics.casesResolved}
- Cases still remaining: ${input.metrics.casesRemaining}
- Financial value of resolved cases: $${input.metrics.financialImpact.toLocaleString()}

Write the scenarioLabel, narrative, and brainBasis now.
`.trim();

  return { system, user };
}
