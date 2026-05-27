import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext, loadBrain } from '../services/brain.js';
import { loadBankTransactions, loadMatchedRecords, loadUnmatchedCases, loadSession } from '../services/data.js';
import { narratorSchema, type Narrative } from '../schemas/narrator.js';
import { narratorPrompt } from '../prompts/narrator.js';
import { narratorMock } from '../mocks/narrator.js';
import { parseBody } from '../utils/validate.js';
import { computeCloseProbability, computeNextCloseProjection } from '../utils/closeProbability.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  sessionId: z.string(),
  resolvedBlockers: z.number().int().nonnegative().optional().default(0),
});

export const narratorRouter = Router();

narratorRouter.post('/', async (req, res) => {
  const body = parseBody(InputSchema, req, res);
  if (!body) return;

  if (env.DEMO_MODE) {
    return res.json({ ...narratorMock, sessionId: body.sessionId });
  }

  try {
    const [unmatched, matched, bank, brain, brainData, session] = await Promise.all([
      loadUnmatchedCases(),
      loadMatchedRecords(),
      loadBankTransactions(),
      brainAsPromptContext(),
      loadBrain(),
      loadSession(),
    ]);

    const accountPattern = brainData.accountPatterns[session.account];
    const historicalCloseRate = accountPattern?.historicalCloseRate ?? 0.75;

    const closeProbabilityInput = {
      historicalCloseRate,
      matchedCount: matched.length,
      totalBankTxns: bank.length,
      unmatchedCases: unmatched,
    };
    const closeProbability = computeCloseProbability(closeProbabilityInput);
    const projection = computeNextCloseProjection(closeProbability, closeProbabilityInput);

    const { system, user } = narratorPrompt({
      brain,
      sessionId: body.sessionId,
      stats: {
        matched: matched.length,
        unmatched: unmatched.length,
        totalBankTxns: bank.length,
        closeProbability,
        resolvedBlockers: body.resolvedBlockers,
      },
      unmatchedSummary: unmatched.map((c) => ({
        bankId: c.bankId,
        failureReason: c.failureReason,
        details: c.details,
      })),
    });

    const text = await callClaude({
      system,
      user,
      model: env.CLAUDE_MODEL_NARRATOR,
      maxTokens: 2048,
      timeoutMs: 15000,
    });

    const partial = narratorSchema
      .omit({ stats: true, nextCloseProbability: true, nextCloseDelta: true, sessionsToTarget: true })
      .parse(extractJson(text));

    const validated: Narrative = {
      ...partial,
      stats: {
        matched: matched.length,
        unmatched: unmatched.length,
        closeProbability,
        resolvedBlockers: body.resolvedBlockers,
      },
      ...projection,
    };

    return res.json(validated);
  } catch (err) {
    logger.warn('narrator.fallback', { error: String(err) });
    return res.json({ ...narratorMock, sessionId: body.sessionId });
  }
});
