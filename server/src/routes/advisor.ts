import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { loadBrain, findVendorProfile, type VendorProfile } from '../services/brain.js';
import {
  loadBankTransactions,
  loadSapTransactions,
  loadUnmatchedCases,
  loadHistoricalPatterns,
  type HistoricalPatterns,
} from '../services/data.js';
import { advisorSchema, type AdvisorOutput, type AdvisorProvenance } from '../schemas/advisor.js';
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

const RISK_TO_CONFIDENCE: Record<string, number> = {
  low: 0.85,
  medium: 0.65,
  high: 0.40,
  critical: 0.25,
};

function buildProvenance(
  vendorProfile: VendorProfile,
  brain: { sessionsAnalyzed: number },
  historical: HistoricalPatterns,
): AdvisorProvenance {
  const issue = historical.topRecurringIssues.find(
    (r) => r.vendor?.toUpperCase() === vendorProfile.vendor.toUpperCase(),
  );

  return {
    historicalAccuracy: {
      rate: vendorProfile.matchSuccessRate,
      matchCount: issue?.matchCount ?? Math.round(vendorProfile.occurrencesLast6Months * 2.5),
    },
    patternSource: {
      hitCount: vendorProfile.occurrencesLast6Months,
      windowSize: brain.sessionsAnalyzed,
      windowUnit: 'closes',
    },
    lastSimilarAction: issue?.lastOccurrence
      ? { occurredAt: issue.lastOccurrence, outcome: 'accepted' }
      : null,
  };
}

export const advisorRouter = Router();

advisorRouter.post('/', async (req, res) => {
  const body = parseBody(InputSchema, req, res);
  if (!body) return;

  const { transactionId } = body;

  if (env.DEMO_MODE) {
    return res.json({ ...advisorMock, transactionId });
  }

  try {
    const [bankTxns, unmatchedCases, sapTxns, brainData, historical] = await Promise.all([
      loadBankTransactions(),
      loadUnmatchedCases(),
      loadSapTransactions(),
      loadBrain(),
      loadHistoricalPatterns(),
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

    // Claude generates everything except confidenceScore and provenance — injected from code
    const claudeOutput = advisorSchema
      .omit({ confidenceScore: true, provenance: true })
      .parse(extractJson(text));

    const validated: AdvisorOutput = {
      ...claudeOutput,
      confidenceScore: RISK_TO_CONFIDENCE[claudeOutput.risk] ?? 0.65,
      provenance: vendorProfile ? buildProvenance(vendorProfile, brainData, historical) : null,
    };

    return res.json(validated);
  } catch (err) {
    logger.warn('advisor.fallback', { transactionId, error: String(err) });
    return res.json({ ...advisorMock, transactionId });
  }
});
