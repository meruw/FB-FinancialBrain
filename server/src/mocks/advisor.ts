import type { AdvisorOutput } from '../schemas/advisor.js';

export const advisorMock: AdvisorOutput = {
  transactionId: 'BNK-001',
  action: 'Raise date tolerance and re-run match',
  actionType: 'manual_match',
  reasoning:
    'APEX SYSTEMS INC has a known average posting delay of 4.2 days. The current 3-day tolerance is too narrow for this vendor. SAP-005 is the correct counterpart — amounts match exactly and the memo aligns with the bank description.',
  steps: [
    {
      order: 1,
      instruction: 'Open the matching rule configuration for vendor APEX SYSTEMS INC.',
    },
    {
      order: 2,
      instruction: 'Raise the date tolerance from 3 days to 5 days.',
    },
    {
      order: 3,
      instruction: 'Re-run the automatic match for BNK-001 against SAP-005 ($15,420).',
    },
    {
      order: 4,
      instruction: 'Confirm the match and mark the item as resolved.',
    },
  ],
  risk: 'low',
  confidenceScore: 0.85,
  brainBasis:
    'APEX SYSTEMS INC has triggered date_tolerance_miss 6 times in the last 6 months. The Brain recommends a permanent 5-day tolerance for this vendor.',
  provenance: {
    historicalAccuracy: { rate: 0.73, matchCount: 17 },
    patternSource: { hitCount: 6, windowSize: 7, windowUnit: 'closes' },
    lastSimilarAction: { occurredAt: '2026-03-28T00:00:00Z', outcome: 'accepted' },
  },
};
