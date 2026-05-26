import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext } from '../services/brain.js';
import { loadBankTransactions, loadMatchedRecords, loadUnmatchedCases } from '../services/data.js';
import { briefSchema, type Brief } from '../schemas/brief.js';
import { briefPrompt } from '../prompts/brief.js';
import { briefMock } from '../mocks/brief.js';
import { parseBody } from '../utils/validate.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  sessionId: z.string(),
});

export const briefRouter = Router();

briefRouter.post('/', async (req, res) => {
  const body = parseBody(InputSchema, req, res);
  if (!body) return;

  if (env.DEMO_MODE) {
    return res.json({ ...briefMock, sessionId: body.sessionId });
  }

  try {
    const [unmatched, matched, bank, brain] = await Promise.all([
      loadUnmatchedCases(),
      loadMatchedRecords(),
      loadBankTransactions(),
      brainAsPromptContext(),
    ]);

    const { system, user } = briefPrompt({
      brain,
      sessionId: body.sessionId,
      unmatchedCount: unmatched.length,
      matchedCount: matched.length,
      totalBankTxns: bank.length,
    });

    const text = await callClaude({ system, user, temperature: 0, maxTokens: 1024 });
    const validated: Brief = briefSchema.parse(extractJson(text));

    return res.json(validated);
  } catch (err) {
    logger.warn('brief.fallback', { error: String(err) });
    return res.json({ ...briefMock, sessionId: body.sessionId });
  }
});
