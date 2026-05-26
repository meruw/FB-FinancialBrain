import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext } from '../services/brain.js';
import {
  loadBankTransactions,
  loadSapTransactions,
  loadUnmatchedCases,
} from '../services/data.js';
import { debugSchema, type DebugDiagnosis } from '../schemas/debug.js';
import { debugPrompt } from '../prompts/debug.js';
import { debugMock } from '../mocks/debug.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  transactionId: z.string(),
});

export const debugRouter = Router();

debugRouter.post('/', async (req, res) => {
  const parsed = InputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
  }

  const { transactionId } = parsed.data;

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

    const bankTxn = bankTxns.find((t) => t.id === transactionId);
    if (!bankTxn) {
      return res.status(404).json({ error: `Transaction ${transactionId} not found` });
    }

    const unmatchedCase = unmatchedCases.find((c) => c.bankId === transactionId);
    if (!unmatchedCase) {
      return res.status(404).json({ error: `No unmatched case found for ${transactionId}` });
    }

    // SAP entries within 7 days and 1% amount difference — candidates the engine considered
    const txnDate = new Date(bankTxn.date).getTime();
    const sapCandidates = sapTxns.filter((s) => {
      const daysDiff = Math.abs(new Date(s.postingDate).getTime() - txnDate) / 86_400_000;
      const amountDiff = Math.abs(s.amount - bankTxn.amount) / bankTxn.amount;
      return daysDiff <= 7 && amountDiff <= 0.01;
    });

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
