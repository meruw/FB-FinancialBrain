import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext } from '../services/brain.js';
import { loadBankTransactions, loadSapTransactions, loadUnmatchedCases } from '../services/data.js';
import { debugSchema, type DebugDiagnosis } from '../schemas/debug.js';
import { debugPrompt } from '../prompts/debug.js';
import { debugMock } from '../mocks/debug.js';
import { findSapCandidates } from '../utils/matching.js';
import { resolveTransaction } from '../utils/transaction.js';
import { parseBody } from '../utils/validate.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  transactionId: z.string(),
});

export const debugRouter = Router();

debugRouter.post('/', async (req, res) => {
  const body = parseBody(InputSchema, req, res);
  if (!body) return;

  const { transactionId } = body;

  if (env.DEMO_MODE) {
    return res.json({ ...debugMock, transactionId });
  }

  try {
    const [bankTxns, unmatchedCases, sapTxns, brain] = await Promise.all([
      loadBankTransactions(),
      loadUnmatchedCases(),
      loadSapTransactions(),
      brainAsPromptContext(),
    ]);

    const resolved = resolveTransaction(transactionId, bankTxns, unmatchedCases, res);
    if (!resolved) return;

    const { bankTxn, unmatchedCase } = resolved;
    const sapCandidates = findSapCandidates(bankTxn, sapTxns);

    const { system, user } = debugPrompt({
      brain,
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

    const text = await callClaude({ system, user, temperature: 0, maxTokens: 1024 });
    const validated: DebugDiagnosis = debugSchema.parse(extractJson(text));

    return res.json(validated);
  } catch (err) {
    logger.warn('debug.fallback', { transactionId, error: String(err) });
    return res.json({ ...debugMock, transactionId });
  }
});
