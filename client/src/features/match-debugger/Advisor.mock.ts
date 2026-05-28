import type { AdvisorResolution } from '@/types/domain';

export const advisorMock: AdvisorResolution = {
  transactionId: 'BT-1048',
  action:
    'Release the existing match on <em>BT-1031</em> to free the SAP entry, ' +
    'then re-run the automatic matcher. GROVE FLEET SERVICES has a 94% match-success rate ' +
    'once the conflicting lock is cleared.',
  actionType: 'release_match',
  reasoning:
    'The SAP entry for $192.83 is locked by BT-1031, which was matched in error ' +
    'during the March close. Releasing it resolves this case without any GL entry.',
  steps: [
    { order: 1, instruction: 'Open BT-1031 in the match log and click "Release Match".' },
    { order: 2, instruction: 'Wait for the SAP entry to become available (auto-refresh in ~10 s).' },
    { order: 3, instruction: 'Return here and click Accept to apply the auto-match.' },
  ],
  risk: 'low',
  confidenceScore: 0.94,
  brainBasis: 'Based on 5 identical GROVE FLEET SERVICES conflicts resolved the same way in the last 6 months.',
  provenance: {
    historicalAccuracy: { rate: 0.94, matchCount: 5 },
    patternSource: { hitCount: 5, windowSize: 6, windowUnit: 'closes' },
    lastSimilarAction: { occurredAt: '2026-03-15', outcome: 'accepted' },
  },
};
