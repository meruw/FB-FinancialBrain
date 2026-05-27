import type { Narrative } from '@/types/domain';

// Client-side fallback. Mirrors the shape of server/src/mocks/narrator.ts — keep in sync.
export const narratorMock: Narrative = {
  sessionId: 'SESSION-MAY-2026',
  headline: 'Bank Reconciliation Report — May 2026 · Main Checking',
  narrative:
    'The May 2026 reconciliation was completed on 05/31/2026. Of 127 bank transactions ' +
    'totaling $2,932,277.81, 119 were auto-matched by the rules engine. Six required ' +
    'manual review and were resolved during the session. Two transactions totaling $304.69 ' +
    'remain flagged for follow-up.',
  learnedThisSession: [
    {
      insight: 'CONSTRUTECH tolerance pattern confirmed (avg 4.1 day delay over 5 months)',
      category: 'pattern',
    },
    {
      insight: '2 bank fees classified to GL 6500 — recurring monthly pattern',
      category: 'vendor',
    },
    {
      insight: 'Duplicate flag on BT-1048 reviewed and accepted by treasury',
      category: 'risk',
    },
    {
      insight: 'BRAUTOTEST SAP conflict resolved via prior-session release',
      category: 'vendor',
    },
    {
      insight: 'Late-month CONSTRUTECH payments reliably post within 5 days',
      category: 'pattern',
    },
  ],
  stats: {
    matched: 119,
    unmatched: 2,
    closeProbability: 0.62,
    resolvedBlockers: 4,
  },
  nextCloseProbability: 0.76,
  nextCloseDelta: 0.14,
  sessionsToTarget: 3,
};
