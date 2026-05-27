import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { loadBrain, findVendorProfile } from '../services/brain.js';
import { loadBankTransactions, loadSapTransactions, loadUnmatchedCases } from '../services/data.js';
import { advisorSchema, type AdvisorOutput } from '../schemas/advisor.js';
import { advisorPrompt } from '../prompts/advisor.js';
import { advisorMock } from '../mocks/advisor.js';
import { findSapCandidates } from '../utils/matching.js';
import { resolveTransaction } from '../utils/transaction.js';
import { parseBody } from '../utils/validate.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  transactionId: z.string(),
});

export const advisorRouter = Router();

advisorRouter.post('/', async (req, res) => {
  const body = parseBody(InputSchema, req, res);
  if (!body) return;

  const { transactionId } = body;

  if (env.DEMO_MODE) {
    return res.json({ ...advisorMock, transactionId });
  }

  try {
    const [bankTxns, unmatchedCases, sapTxns, brainData] = await Promise.all([
      loadBankTransactions(),
      loadUnmatchedCases(),
      loadSapTransactions(),
      loadBrain(),
    ]);

    const resolved = resolveTransaction(transactionId, bankTxns, unmatchedCases, res);
    if (!resolved) return;

    const { bankTxn, unmatchedCase } = resolved;
    const vendorProfile = findVendorProfile(brainData, bankTxn.description);
    const sapCandidates = findSapCandidates(bankTxn, sapTxns);

    const { system, user } = advisorPrompt({
      vendorProfile,
      brainMeta: {
        customerId: brainData.customerId,
        sessionsAnalyzed: brainData.sessionsAnalyzed,
      },
      bankTransaction: {
        id: bankTxn.id,
        date: bankTxn.date,
        amount: bankTxn.amount,
        description: bankTxn.description,
        reference: bankTxn.reference,
      },
      unmatchedCase: {
        failureReason: unmatchedCase.failureReason,
        details: unmatchedCase.details,
      },
      sapCandidates: sapCandidates.map((s) => ({
        id: s.id,
        postingDate: s.postingDate,
        amount: s.amount,
        memo: s.memo,
      })),
    });

    const text = await callClaude({ system, user, temperature: 0, maxTokens: 1024, timeoutMs: 12000 });
    const validated: AdvisorOutput = advisorSchema.parse(extractJson(text));

    return res.json(validated);
  } catch (err) {
    logger.warn('advisor.fallback', { transactionId, error: String(err) });
    return res.json({ ...advisorMock, transactionId });
  }
});
