// How resolvable each failure type is, based on what the Brain knows.
// Higher = more likely the accountant can close it without escalation.
export const RESOLVABILITY: Record<string, number> = {
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
 *   base          = historicalCloseRate from Brain's accountPatterns
 *   matchRate     = already-matched / total (what's already clean)
 *   resolvability = weighted average of how fixable the remaining cases are
 *   result        = base × (matchRate + (1 - matchRate) × resolvability)
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

export interface NextCloseProjection {
  nextCloseProbability: number;
  nextCloseDelta: number;      // integer percentage points (e.g. 14 means +14%)
  sessionsToTarget: number;    // sessions to reach 95%+ at this improvement rate
}

// Cases at or above this resolvability are assumed fixed next session when
// Brain recommendations are followed. Below = requires escalation/treasury.
export const RESOLUTION_THRESHOLD = 0.50;

/**
 * Projects next session's close probability assuming all advisor recommendations
 * with resolvability >= RESOLUTION_THRESHOLD are applied this session.
 * Used by the Narrator closing panel — all fields injected from code, not Claude.
 */
export function computeNextCloseProjection(
  currentProbability: number,
  input: CloseProbabilityInput,
): NextCloseProjection {
  const { historicalCloseRate, matchedCount, totalBankTxns, unmatchedCases } = input;

  const nextUnmatched = unmatchedCases.filter(
    (c) => (RESOLVABILITY[c.failureReason] ?? 0.5) < RESOLUTION_THRESHOLD,
  );
  const nextMatched = matchedCount + (unmatchedCases.length - nextUnmatched.length);

  const nextCloseProbability = computeCloseProbability({
    historicalCloseRate,
    matchedCount: nextMatched,
    totalBankTxns,
    unmatchedCases: nextUnmatched,
  });

  const nextCloseDelta = Math.round((nextCloseProbability - currentProbability) * 100);

  const sessionsToTarget =
    currentProbability >= 0.95
      ? 0
      : nextCloseProbability <= currentProbability
      ? 99
      : Math.ceil(
          Math.log(0.95 / currentProbability) /
          Math.log(nextCloseProbability / currentProbability),
        );

  return { nextCloseProbability, nextCloseDelta, sessionsToTarget };
}
