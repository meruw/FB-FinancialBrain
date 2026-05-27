import { Router } from 'express';
import {
  loadBankTransactions,
  loadUnmatchedCases,
  loadMatchedRecords,
  loadSession,
  markResolved,
} from '../services/data.js';
import { loadBrain } from '../services/brain.js';
import { resolveInputSchema, type ResolveResult } from '../schemas/resolve.js';
import { resolveTransaction } from '../utils/transaction.js';
import { parseBody } from '../utils/validate.js';
import {
  computeCloseProbability,
  computeNextCloseProjection,
} from '../utils/closeProbability.js';
import { logger } from '../utils/logger.js';

export const resolveRouter = Router();

resolveRouter.post('/', async (req, res) => {
  const body = parseBody(resolveInputSchema, req, res);
  if (!body) return;

  const { transactionId, actionType } = body;

  try {
    const [bankTxns, unmatchedCases, matched, brainData, session] = await Promise.all([
      loadBankTransactions(),
      loadUnmatchedCases(),
      loadMatchedRecords(),
      loadBrain(),
      loadSession(),
    ]);

    const resolved = resolveTransaction(transactionId, bankTxns, unmatchedCases, res);
    if (!resolved) return;

    const { bankTxn } = resolved;

    // Persist the resolution in process memory — survives until reload or restart
    markResolved(bankTxn.id);

    // Compute post-resolve stats without re-loading (filter in place)
    const postUnmatched = unmatchedCases.filter((c) => c.bankId !== bankTxn.id);
    const postMatchedCount = matched.length + 1;

    const accountPattern = brainData.accountPatterns[session.account];
    const historicalCloseRate = accountPattern?.historicalCloseRate ?? 0.85;

    const probInput = {
      historicalCloseRate,
      matchedCount: postMatchedCount,
      totalBankTxns: bankTxns.length,
      unmatchedCases: postUnmatched,
    };

    const closeProbability = computeCloseProbability(probInput);
    const { nextCloseProbability, nextCloseDelta, sessionsToTarget } =
      computeNextCloseProjection(closeProbability, probInput);

    const result: ResolveResult = {
      transactionId,
      actionType,
      resolved: true,
      updatedStats: {
        matched: postMatchedCount,
        unmatched: postUnmatched.length,
        closeProbability,
        nextCloseProbability,
        nextCloseDelta,
        sessionsToTarget,
      },
    };

    logger.info('resolve.accepted', { transactionId, actionType, closeProbability });
    return res.json(result);
  } catch (err) {
    logger.error('resolve.error', { transactionId, error: String(err) });
    return res.status(500).json({ error: 'Failed to resolve transaction', message: String(err) });
  }
});
