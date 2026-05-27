import type { Narrative } from '../schemas/narrator.js';

export const narratorMock: Narrative = {
  sessionId: 'SESSION-APR-2026',
  headline:
    'April closed at 72% — CONSTRUTECH delays and a suspected duplicate held the session back.',
  narrative:
    'This session followed a pattern the Brain has seen before. Of the 10 bank transactions ' +
    'processed, 4 matched automatically — payroll, the wire transfer, and two clean vendor ' +
    'payments. The remaining 6 required attention, and three of them trace back to a single ' +
    'root cause: CONSTRUTECH\'s posting delay. The matching engine rejected these on a 3-day ' +
    'tolerance rule that the Brain now knows is too tight for this vendor.\n\n' +
    'The most urgent item is a suspected duplicate payment. BNK-008 and BNK-009 are ' +
    'identical — same amount, same date, same description — and only one SAP counterpart ' +
    'exists. Until treasury confirms whether both payments were intentional, this session ' +
    'cannot close cleanly. The other two unmatched items are standard bank fees with no SAP ' +
    'entry, a recurring pattern in every month the Brain has observed.\n\n' +
    'The Brain has updated its model for CONSTRUTECH: a 5-day tolerance window would have ' +
    'resolved 3 of the 6 blockers automatically. If applied next month, the projected open ' +
    'match rate rises from 40% to 70% before any manual intervention.',
  learnedThisSession: [
    {
      insight:
        'CONSTRUTECH requires a 5-day date tolerance. The current 3-day rule caused 3 false ' +
        'rejections this session. Recommend updating the vendor rule.',
      category: 'vendor',
    },
    {
      insight:
        'Bank fees (COMISION MENSUAL, COMISION SPEI) consistently lack SAP counterparts at ' +
        'month-end. This has appeared in all 7 sessions analyzed. Consider an auto-GL rule.',
      category: 'pattern',
    },
    {
      insight:
        'First duplicate payment detected for CONSTRUTECH in 7 sessions. Flag for treasury ' +
        'review. If confirmed accidental, add to vendor anomaly watchlist.',
      category: 'risk',
    },
  ],
  stats: {
    matched: 4,
    unmatched: 8,
    closeProbability: 0.62,
    resolvedBlockers: 0,
  },
  nextCloseProbability: 0.76,
  nextCloseDelta: 14,
  sessionsToTarget: 3,
};
