import type { Brief } from '@/types/domain';

// Client-side fallback. Matches server/src/mocks/brief.ts — keep in sync.
export const briefMock: Brief = {
  sessionId: 'SESSION-MAY-2026',
  closeProbability: 0.62,
  closeProbabilityLabel: '62% — likely to close with manual intervention',
  blockers: [
    {
      description: '3 APEX SYSTEMS INC date tolerance misses (avg 4.2 day delay)',
      severity: 'medium',
      vendor: 'APEX SYSTEMS INC',
      knownPattern: true,
    },
    {
      description: '1 GROVE FLEET SERVICES SAP entry already matched to prior session',
      severity: 'high',
      vendor: 'GROVE FLEET SERVICES',
      knownPattern: true,
    },
    {
      description: '2 unclassified bank fees with no SAP counterpart',
      severity: 'low',
      vendor: null,
      knownPattern: true,
    },
    {
      description: '1 likely duplicate payment to APEX SYSTEMS INC ($9,800)',
      severity: 'high',
      vendor: 'APEX SYSTEMS INC',
      knownPattern: false,
    },
  ],
  recommendations: [
    {
      action: 'Raise APEX SYSTEMS INC date tolerance to 5 days',
      expectedImpact: 'Resolves 3 blockers, lifts close probability to ~85%',
      priority: 1,
    },
    {
      action: 'Verify duplicate payment BNK-008 / BNK-009 with treasury',
      expectedImpact: 'Prevents potential $9,800 double payment',
      priority: 1,
    },
    {
      action: 'Post bank fee GL entries in SAP for April',
      expectedImpact: 'Clears 2 low-severity unmatched items',
      priority: 2,
    },
  ],
  estimatedResolutionMinutes: 18,
  brainInsight:
    'This session matches the December 2025 exception profile — resolved in 8 days. ' +
    'The APEX SYSTEMS INC tolerance pattern has appeared in 5 of the last 6 months.',
};
