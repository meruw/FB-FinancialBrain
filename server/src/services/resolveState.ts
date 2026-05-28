import type { MatchedRecord } from './data.js';

// Tracks bank transactions accepted via POST /api/resolve.
// Lives for the server process lifetime — reset via POST /api/data/reload or server restart.
// In production this becomes a call to the FastBank matching engine (see CLAUDE.md §23).

const resolvedBankIds = new Set<string>();
const resolvedTimestamps = new Map<string, string>();

export function markResolved(bankId: string): void {
  resolvedBankIds.add(bankId);
  resolvedTimestamps.set(bankId, new Date().toISOString());
}

export function resetResolvedState(): void {
  resolvedBankIds.clear();
  resolvedTimestamps.clear();
}

export function isResolved(bankId: string): boolean {
  return resolvedBankIds.has(bankId);
}

export function buildSyntheticMatches(): MatchedRecord[] {
  return [...resolvedBankIds].map((bankId) => ({
    id: `MANUAL-${bankId}`,
    bankId,
    sapId: `SAP-MANUAL-${bankId}`,
    ruleUsed: 'ManualMatch',
    matchedAt: resolvedTimestamps.get(bankId) ?? new Date().toISOString(),
  }));
}
