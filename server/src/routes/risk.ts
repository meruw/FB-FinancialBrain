import { Router } from 'express';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext } from '../services/brain.js';
import { riskSchema, type RiskAssessment } from '../schemas/risk.js';
import { riskPrompt } from '../prompts/risk.js';
import { riskMock } from '../mocks/risk.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  transactionId: z.string(),
});

interface BankTxn {
  id: string;
  date: string;
  amount: number;
  description: string;
  reference: string;
  type: string;
}

interface UnmatchedCase {
  id: string;
  bankId: string;
  failureReason: string;
  details: string;
}

export const riskRouter = Router();

riskRouter.post('/', async (req, res) => {
  const parsed = InputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
  }

  const { transactionId } = parsed.data;

  if (env.DEMO_MODE) {
    return res.json({ ...riskMock, transactionId });
  }

  try {
    const [bankRaw, unmatchedRaw] = await Promise.all([
      readFile(resolve(process.cwd(), '../data/bank-transactions.json'), 'utf-8'),
      readFile(resolve(process.cwd(), '../data/unmatched-cases.json'), 'utf-8'),
    ]);

    const bankTxns = JSON.parse(bankRaw) as BankTxn[];
    const unmatchedCases = JSON.parse(unmatchedRaw) as UnmatchedCase[];

    const bankTxn = bankTxns.find((t) => t.id === transactionId);
    if (!bankTxn) {
      return res.status(404).json({ error: `Transaction ${transactionId} not found` });
    }

    const unmatchedCase = unmatchedCases.find((c) => c.bankId === transactionId) ?? null;

    // Duplicate signal: other transactions with the exact same date and amount (excluding self)
    const potentialDuplicates = bankTxns.filter(
      (t) => t.id !== transactionId && t.date === bankTxn.date && t.amount === bankTxn.amount
    );

    const brain = await brainAsPromptContext();
    const { system, user } = riskPrompt({
      brain,
      bankTransaction: {
        id: bankTxn.id,
        date: bankTxn.date,
        amount: bankTxn.amount,
        description: bankTxn.description,
        reference: bankTxn.reference,
      },
      unmatchedCase: unmatchedCase
        ? { failureReason: unmatchedCase.failureReason, details: unmatchedCase.details }
        : null,
      potentialDuplicates: potentialDuplicates.map((t) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        description: t.description,
      })),
    });

    const text = await callClaude({ system, user, temperature: 0, maxTokens: 1024 });
    const json = extractJson(text);
    const validated: RiskAssessment = riskSchema.parse(json);

    return res.json(validated);
  } catch (err) {
    logger.warn('risk.fallback', { transactionId, error: String(err) });
    return res.json({ ...riskMock, transactionId });
  }
});
