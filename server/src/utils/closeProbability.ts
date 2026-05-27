// How resolvable each failure type is, based on what the Brain knows.
// Higher = more likely the accountant can close it without escalation.
const RESOLVABILITY: Record<string, number> = {
  date_tolerance_miss: 0.80, // Known vendor pattern — tolerance tweak resolves it
  sap_already_matched: 0.70, // Admin fix — release the conflicting match
  no_sap_counterpart: 0.50, // May need a manual GL entry
  amount_mismatch: 0.30,    // Requires investigation before touching anything
  likely_duplicate: 0.10,   // Treasury sign-off needed before resolving
};

export interface CloseProbabilityInput {
  historicalCloseRate: number;
  matchedCount: number;
  totalBankTxns: number;
  unmatchedCases: Array<{ failureReason: string }>;
}

/**
 * Computes close probability from Brain history + current session state.
 *
 * Formula:
 *   base       = historicalCloseRate from Brain's accountPatterns
 *   matchRate  = already-matched / total (what's already clean)
 *   resolvability = weighted average of how fixable the remaining cases are
 *   result     = base × (matchRate + (1 - matchRate) × resolvability)
 *
 * Claude receives this number and writes the label. It does not generate the number.
 */
export function computeCloseProbability(input: CloseProbabilityInput): number {
  const { historicalCloseRate, matchedCount, totalBankTxns, unmatchedCases } = input;

  const matchRate = totalBankTxns > 0 ? matchedCount / totalBankTxns : 0;

  const avgResolvability =
    unmatchedCases.length > 0
      ? unmatchedCases.reduce(
          (sum, c) => sum + (RESOLVABILITY[c.failureReason] ?? 0.5),
          0,
        ) / unmatchedCases.length
      : 1.0;

  const raw = historicalCloseRate * (matchRate + (1 - matchRate) * avgResolvability);

  // Round to 2 decimal places and clamp — never show 0% or 100% on a demo screen.
  return Math.min(0.95, Math.max(0.50, Math.round(raw * 100) / 100));
}
