import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext } from '../services/brain.js';
import { loadBankTransactions, loadMatchedRecords, loadUnmatchedCases } from '../services/data.js';
import { briefSchema, type Brief } from '../schemas/brief.js';
import { briefPrompt } from '../prompts/brief.js';
import { briefMock } from '../mocks/brief.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  sessionId: z.string(),
});

export const briefRouter = Router();

briefRouter.post('/', async (req, res) => {
  const parsed = InputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
  }

  if (env.DEMO_MODE) {
    return res.json({ ...briefMock, sessionId: parsed.data.sessionId });
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
      sessionId: parsed.data.sessionId,
      unmatchedCount: unmatched.length,
      matchedCount: matched.length,
      totalBankTxns: bank.length,
    });

    const text = await callClaude({ system, user, temperature: 0, maxTokens: 1024 });
    const validated: Brief = briefSchema.parse(extractJson(text));

    return res.json(validated);
  } catch (err) {
    logger.warn('brief.fallback', { error: String(err) });
    return res.json({ ...briefMock, sessionId: parsed.data.sessionId });
  }
});
