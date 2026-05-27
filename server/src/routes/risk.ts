import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { loadBrain } from '../services/brain.js';
import { loadBankTransactions, loadUnmatchedCases } from '../services/data.js';
import { riskSchema, type RiskAssessment } from '../schemas/risk.js';
import { riskPrompt } from '../prompts/risk.js';
import { riskMock } from '../mocks/risk.js';
import { parseBody } from '../utils/validate.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  transactionId: z.string(),
});

export const riskRouter = Router();

riskRouter.post('/', async (req, res) => {
  const body = parseBody(InputSchema, req, res);
  if (!body) return;

  const { transactionId } = body;

  if (env.DEMO_MODE) {
    return res.json({ ...riskMock, transactionId });
  }

  try {
    const [bankTxns, unmatchedCases, brainData] = await Promise.all([
      loadBankTransactions(),
      loadUnmatchedCases(),
      loadBrain(),
    ]);

    const bankTxn = bankTxns.find((t) => t.id === transactionId);
    if (!bankTxn) {
      return res.status(404).json({ error: `Transaction ${transactionId} not found` });
    }

    const unmatchedCase = unmatchedCases.find((c) => c.bankId === transactionId) ?? null;

    const potentialDuplicates = bankTxns.filter(
      (t) => t.id !== transactionId && t.date === bankTxn.date && t.amount === bankTxn.amount
    );

    const vendorProfile =
      brainData.vendorProfiles.find((vp) =>
        bankTxn.description.toUpperCase().includes(vp.vendor.toUpperCase())
      ) ?? null;

    const accountPatterns = Object.values(brainData.accountPatterns);
    const historicalCloseRate =
      accountPatterns.length > 0
        ? accountPatterns.reduce((sum, a) => sum + a.historicalCloseRate, 0) / accountPatterns.length
        : 0;

    const { system, user } = riskPrompt({
      vendorProfile,
      brainMeta: {
        customerId: brainData.customerId,
        sessionsAnalyzed: brainData.sessionsAnalyzed,
        historicalCloseRate,
      },
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
    const validated: RiskAssessment = riskSchema.parse(extractJson(text));

    return res.json(validated);
  } catch (err) {
    logger.warn('risk.fallback', { transactionId, error: String(err) });
    return res.json({ ...riskMock, transactionId });
  }
});
