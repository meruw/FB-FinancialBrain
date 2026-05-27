import type { RiskAssessment } from '@/types/domain';

// Client-side fallback. Mirrors the shape of server/src/mocks/risk.ts — keep in sync.
export const riskMock: RiskAssessment = {
  transactionId: 'BT-1048',
  riskLevel: 'high',
  riskLabel: 'Payment of $1,247.50 to CONSTRUTECH — possible duplicate. Similar payment processed May 18th, same vendor, amount within $2.00.',
  flags: [
    {
      type: 'duplicate_payment',
      description: 'Near-identical payment to CONSTRUTECH found within 7 days (BT-1031, $1,249.50)',
    },
  ],
  recommendation: 'escalate',
  brainBasis: 'Review May 18th payment before proceeding. Brain flagged 2 prior CONSTRUTECH duplicates in the last 6 months.',
};
