import type { RiskAssessment } from '../schemas/risk.js';

// Default mock uses BNK-009 (likely duplicate payment — most compelling demo case).
// Route spreads transactionId over this so the ID always matches the request.
export const riskMock: RiskAssessment = {
  transactionId: 'BNK-009',
  riskLevel: 'critical',
  riskLabel: 'Critical — potential duplicate payment of $9,800',
  flags: [
    {
      type: 'duplicate_payment',
      description:
        'BNK-009 is identical to BNK-008: same amount ($9,800), same date (2026-04-22), ' +
        'same description (CONSTRUTECH COMPLEMENTO). Only one SAP entry exists for this amount.',
    },
    {
      type: 'vendor_anomaly',
      description:
        'CONSTRUTECH has never had a duplicate payment in the last 6 months of Brain history. ' +
        'This is an anomaly, not a known pattern.',
    },
  ],
  recommendation: 'escalate',
  brainBasis:
    'CONSTRUTECH match success rate is 73% with a known date-delay pattern, but no prior ' +
    'duplicate payments recorded. The Brain has no precedent for this — escalation required.',
};
