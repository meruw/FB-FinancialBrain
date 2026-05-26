import type { DebugDiagnosis } from '../schemas/debug.js';

// Default mock uses BNK-001 (CONSTRUTECH date tolerance miss).
// The route spreads transactionId over this when returning, so the ID always matches.
export const debugMock: DebugDiagnosis = {
  transactionId: 'BNK-001',
  diagnosis:
    'The bank recorded this CONSTRUTECH payment on 2026-04-28, but the matching SAP entry ' +
    '(SAP-005, $15,420) was posted on 2026-05-02 — a 4-day gap. The current matching ' +
    'rule requires dates within 3 days, so the match was rejected.',
  rootCause: 'date_tolerance_miss',
  vendorContext:
    'CONSTRUTECH has an average posting delay of 4.2 days across the last 6 months. ' +
    'This exact pattern appeared 4 times in that period. The Brain recommends a ' +
    '5-day tolerance window for this vendor.',
  suggestedFix:
    'Raise the date tolerance for CONSTRUTECH to 5 days. This would resolve this item ' +
    'and prevent the same issue in future sessions.',
  suggestedToleranceDays: 5,
  confidence: 'high',
};
