import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext, loadBrain } from '../services/brain.js';
import { loadBankTransactions, loadMatchedRecords, loadUnmatchedCases } from '../services/data.js';
import { narratorSchema, type Narrative } from '../schemas/narrator.js';
import { narratorPrompt } from '../prompts/narrator.js';
import { narratorMock } from '../mocks/narrator.js';
import { parseBody } from '../utils/validate.js';
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
    const [unmatched, matched, bank, brain, brainData] = await Promise.all([
      loadUnmatchedCases(),
      loadMatchedRecords(),
      loadBankTransactions(),
      brainAsPromptContext(),
      loadBrain(),
    ]);

    const { system, user } = narratorPrompt({
      brain,
      sessionId: body.sessionId,
      stats: {
        matched: matched.length,
        unmatched: unmatched.length,
        totalBankTxns: bank.length,
        closeProbability: brainData.closeProbability.current,
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
      temperature: 0.4,
      maxTokens: 2048,
    });

    const validated: Narrative = narratorSchema.parse(extractJson(text));

    return res.json(validated);
  } catch (err) {
    logger.warn('narrator.fallback', { error: String(err) });
    return res.json({ ...narratorMock, sessionId: body.sessionId });
  }
});
