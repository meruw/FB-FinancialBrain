import type { Narrative } from '../schemas/narrator.js';

export const narratorMock: Narrative = {
  sessionId: 'SESSION-APR-2026',
  headline:
    'APEX SYSTEMS INC\'s posting lag blocked 3 matches and a suspected duplicate put $9,800 on hold — April closed at 62%.',
  narrative:
    'Of the 12 bank transactions this session, 4 matched automatically — payroll, the wire ' +
    'transfer, and two clean vendor payments. The remaining 8 required attention. Three of them ' +
    'trace to a single root cause: APEX SYSTEMS INC\'s posting delay. BNK-001, BNK-011, and BNK-012 ' +
    'all fell just outside the 3-day tolerance — a rule the Brain now knows is too tight for ' +
    'this vendor\'s 4.2-day average.\n\n' +
    'The most urgent item is BNK-008 and BNK-009: two identical $9,800 debits to APEX SYSTEMS INC ' +
    'on the same date with only one SAP counterpart. One of these is likely a duplicate payment ' +
    'and needs treasury sign-off before either entry can close. The remaining 3 items are a ' +
    'locked GROVE FLEET SERVICES document and two recurring bank fees with no GL entry — both known ' +
    'patterns the Brain has flagged across multiple sessions.',
  learnedThisSession: [
    {
      insight:
        'APEX SYSTEMS INC requires a 5-day date tolerance. The current 3-day rule caused 3 false ' +
        'rejections this session. Recommend updating the vendor rule.',
      category: 'vendor',
    },
    {
      insight:
        'Bank fees (monthly account fee, wire transfer fee) consistently lack SAP counterparts at ' +
        'month-end. This has appeared in all 7 sessions analyzed. Consider an auto-GL rule.',
      category: 'pattern',
    },
    {
      insight:
        'First duplicate payment detected for APEX SYSTEMS INC in 7 sessions. Flag for treasury ' +
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
