import { Router } from 'express';
import { callClaude, extractJson } from '../services/claude.js';
import { loadBrain, findVendorProfile } from '../services/brain.js';
import {
  loadBankTransactions,
  loadUnmatchedCases,
  loadMatchedRecords,
  loadSession,
} from '../services/data.js';
import {
  simulateInputSchema,
  simulateClaudeSchema,
  type SimulationResult,
} from '../schemas/simulate.js';
import { simulatePrompt } from '../prompts/simulate.js';
import { simulateMock } from '../mocks/simulate.js';
import { parseBody } from '../utils/validate.js';
import {
  computeCloseProbability,
  RESOLVABILITY,
  RESOLUTION_THRESHOLD,
} from '../utils/closeProbability.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

export const simulateRouter = Router();

simulateRouter.post('/', async (req, res) => {
  const body = parseBody(simulateInputSchema, req, res);
  if (!body) return;

  if (env.DEMO_MODE) {
    return res.json(simulateMock);
  }

  try {
    const [unmatched, matched, bank, brainData, session] = await Promise.all([
      loadUnmatchedCases(),
      loadMatchedRecords(),
      loadBankTransactions(),
      loadBrain(),
      loadSession(),
    ]);

    const bankById = new Map(bank.map((b) => [b.id, b]));

    const accountPattern = brainData.accountPatterns[session.account];
    const historicalCloseRate = accountPattern?.historicalCloseRate ?? 0.85;

    // Determine which cases get resolved under this scenario
    let resolvedCases: typeof unmatched;

    if (body.scenarioType === 'tolerance_change') {
      resolvedCases = unmatched.filter((c) => {
        if (c.failureReason !== 'date_tolerance_miss') return false;
        if (!body.vendorName) return true;
        const bankTxn = bankById.get(c.bankId);
        return bankTxn?.description.toUpperCase().includes(body.vendorName.toUpperCase()) ?? false;
      });
    } else if (body.scenarioType === 'vendor_fix') {
      resolvedCases = unmatched.filter((c) => {
        if (!body.vendorName) return false;
        const bankTxn = bankById.get(c.bankId);
        return bankTxn?.description.toUpperCase().includes(body.vendorName.toUpperCase()) ?? false;
      });
    } else {
      // threshold_change: apply all recommendations at or above the resolvability threshold
      resolvedCases = unmatched.filter(
        (c) => (RESOLVABILITY[c.failureReason] ?? 0.5) >= RESOLUTION_THRESHOLD,
      );
    }

    const remainingCases = unmatched.filter((c) => !resolvedCases.includes(c));

    const financialImpact = resolvedCases.reduce((sum, c) => {
      const bankTxn = bankById.get(c.bankId);
      return sum + (bankTxn?.amount ?? 0);
    }, 0);

    const currentCloseProbability = computeCloseProbability({
      historicalCloseRate,
      matchedCount: matched.length,
      totalBankTxns: bank.length,
      unmatchedCases: unmatched,
    });

    const projectedCloseProbability = computeCloseProbability({
      historicalCloseRate,
      matchedCount: matched.length + resolvedCases.length,
      totalBankTxns: bank.length,
      unmatchedCases: remainingCases,
    });

    const projectedDelta = Math.round((projectedCloseProbability - currentCloseProbability) * 100);

    const vendorProfile = body.vendorName
      ? findVendorProfile(brainData, body.vendorName)
      : null;

    const { system, user } = simulatePrompt({
      sessionId: body.sessionId,
      scenarioType: body.scenarioType,
      vendorName: body.vendorName,
      proposedToleranceDays: body.proposedToleranceDays,
      vendorProfile,
      brainMeta: {
        customerId: brainData.customerId,
        sessionsAnalyzed: brainData.sessionsAnalyzed,
      },
      metrics: {
        currentCloseProbability,
        projectedCloseProbability,
        projectedDelta,
        casesResolved: resolvedCases.length,
        casesRemaining: remainingCases.length,
        financialImpact,
      },
    });

    const text = await callClaude({
      system,
      user,
      temperature: 0,
      maxTokens: 512,
      timeoutMs: 8000,
    });

    const partial = simulateClaudeSchema.parse(extractJson(text));

    const validated: SimulationResult = {
      ...partial,
      projectedCloseProbability,
      projectedDelta,
      casesResolved: resolvedCases.length,
      casesRemaining: remainingCases.length,
      financialImpact,
    };

    return res.json(validated);
  } catch (err) {
    logger.warn('simulate.fallback', { error: String(err) });
    return res.json(simulateMock);
  }
});
