import { Router } from 'express';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext } from '../services/brain.js';
import { narratorSchema, type Narrative } from '../schemas/narrator.js';
import { narratorPrompt } from '../prompts/narrator.js';
import { narratorMock } from '../mocks/narrator.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  sessionId: z.string(),
});

interface UnmatchedCase {
  id: string;
  bankId: string;
  failureReason: string;
  details: string;
}

interface MatchedRecord {
  id: string;
}

interface BankTxn {
  id: string;
}

interface ReconciliationSession {
  id: string;
  closeProbability?: number;
}

export const narratorRouter = Router();

narratorRouter.post('/', async (req, res) => {
  const parsed = InputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
  }

  if (env.DEMO_MODE) {
    return res.json({ ...narratorMock, sessionId: parsed.data.sessionId });
  }

  try {
    const [unmatchedRaw, matchedRaw, bankRaw, sessionRaw] = await Promise.all([
      readFile(resolve(process.cwd(), '../data/unmatched-cases.json'), 'utf-8'),
      readFile(resolve(process.cwd(), '../data/matched-records.json'), 'utf-8'),
      readFile(resolve(process.cwd(), '../data/bank-transactions.json'), 'utf-8'),
      readFile(resolve(process.cwd(), '../data/reconciliation-session.json'), 'utf-8'),
    ]);

    const unmatched = JSON.parse(unmatchedRaw) as UnmatchedCase[];
    const matched = JSON.parse(matchedRaw) as MatchedRecord[];
    const bank = JSON.parse(bankRaw) as BankTxn[];
    const session = JSON.parse(sessionRaw) as ReconciliationSession;

    // Use Brain's closeProbability as the authoritative number
    const brain = await brainAsPromptContext();
    const brainData = JSON.parse(brain) as { closeProbability: { current: number } };
    const closeProbability = brainData.closeProbability.current;

    const { system, user } = narratorPrompt({
      brain,
      sessionId: parsed.data.sessionId,
      stats: {
        matched: matched.length,
        unmatched: unmatched.length,
        totalBankTxns: bank.length,
        closeProbability,
        resolvedBlockers: 0, // frontend will pass this once it tracks user actions
      },
      unmatchedSummary: unmatched.map((c) => ({
        bankId: c.bankId,
        failureReason: c.failureReason,
        details: c.details,
      })),
    });

    // Narrator uses Opus for better prose quality; falls back to default model if not set
    const text = await callClaude({
      system,
      user,
      model: env.CLAUDE_MODEL_NARRATOR,
      temperature: 0.4,
      maxTokens: 2048,
    });

    const json = extractJson(text);
    const validated: Narrative = narratorSchema.parse(json);

    return res.json(validated);
  } catch (err) {
    logger.warn('narrator.fallback', { error: String(err) });
    return res.json({ ...narratorMock, sessionId: parsed.data.sessionId });
  }
});
