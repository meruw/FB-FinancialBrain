import type { BankTransaction, SapTransaction } from '../services/data.js';

// Window used to find SAP candidates when debugging a failed bank match.
// Wider than the engine's 3-day tolerance to show the accountant near-misses.
const SAP_CANDIDATE_DAYS_WINDOW = 7;

// SAP entry is considered a candidate if the amount is within 1% of the bank transaction.
const SAP_CANDIDATE_AMOUNT_TOLERANCE = 0.01;

const MS_PER_DAY = 86_400_000;

/**
 * Returns SAP transactions that could plausibly be the counterpart for a
 * given bank transaction — used by the debug route to give Claude context.
 *
 * Guards against silent failures:
 * - Invalid date strings produce NaN; those entries are excluded rather than
 *   matching everything or crashing.
 * - Zero-amount transactions skip amount comparison entirely to avoid
 *   division by zero.
 */
export function findSapCandidates(
  bankTxn: BankTransaction,
  sapTxns: SapTransaction[]
): SapTransaction[] {
  const bankMs = new Date(bankTxn.date).getTime();
  if (isNaN(bankMs)) {
    return [];
  }

  return sapTxns.filter((s) => {
    const sapMs = new Date(s.postingDate).getTime();
    if (isNaN(sapMs)) return false;

    const daysDiff = Math.abs(sapMs - bankMs) / MS_PER_DAY;
    if (daysDiff > SAP_CANDIDATE_DAYS_WINDOW) return false;

    if (bankTxn.amount === 0) return true; // zero-amount: date match is enough
    const amountDiff = Math.abs(s.amount - bankTxn.amount) / bankTxn.amount;
    return amountDiff <= SAP_CANDIDATE_AMOUNT_TOLERANCE;
  });
}
