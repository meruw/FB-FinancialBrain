import type { DebugDiagnosis } from '@/types/domain';

// Client-side fallback. Mirrors the shape of server/src/mocks/debug.ts — keep in sync.
export const debugMock: DebugDiagnosis = {
  transactionId: 'BT-1048',
  diagnosis:
    'SAP entry for $192.83 exists but was already matched to BT-1031 on May 18th. ' +
    'This is the 5th BRAUTOTEST conflict of this type in the last 6 months.',
  rootCause: 'sap_already_matched',
  vendorContext: 'BRAUTOTEST — recurring SAP conflict (5th occurrence in 6 months)',
  suggestedFix:
    'Review BT-1031. Releasing it would resolve this transaction automatically.',
  suggestedToleranceDays: null,
  confidence: 'high',
};
