import type { Response } from 'express';
import type { BankTransaction, UnmatchedCase } from '../services/data.js';

export interface ResolvedTransaction {
  bankTxn: BankTransaction;
  unmatchedCase: UnmatchedCase;
}

/**
 * Finds a bank transaction and its unmatched case by transactionId.
 * Sends a 404 response and returns null if either is missing.
 * Used by debug, risk, and advisor routes — all three need both records.
 */
export function resolveTransaction(
  transactionId: string,
  bankTxns: BankTransaction[],
  unmatchedCases: UnmatchedCase[],
  res: Response,
): ResolvedTransaction | null {
  const bankTxn = bankTxns.find((t) => t.id === transactionId);
  if (!bankTxn) {
    res.status(404).json({ error: `Transaction ${transactionId} not found` });
    return null;
  }

  const unmatchedCase = unmatchedCases.find((c) => c.bankId === transactionId);
  if (!unmatchedCase) {
    res.status(404).json({ error: `No unmatched case found for ${transactionId}` });
    return null;
  }

  return { bankTxn, unmatchedCase };
}
