import { Router } from 'express';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext } from '../services/brain.js';
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
  // 1. Validate input — bad request shape gets a 400, not a 500
  const parsed = InputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
  }

  // 2. DEMO_MODE short-circuit — never calls Claude, returns mock instantly
  if (env.DEMO_MODE) {
    return res.json({ ...briefMock, sessionId: parsed.data.sessionId });
  }

  try {
    // 3. Load session and transaction data to compute counts for the prompt.
    //    Claude doesn't do math — we do it here and pass the numbers in.
    const [sessionRaw, unmatchedRaw, matchedRaw, bankRaw] = await Promise.all([
      readFile(resolve(process.cwd(), '../data/reconciliation-session.json'), 'utf-8'),
      readFile(resolve(process.cwd(), '../data/unmatched-cases.json'), 'utf-8'),
      readFile(resolve(process.cwd(), '../data/matched-records.json'), 'utf-8'),
      readFile(resolve(process.cwd(), '../data/bank-transactions.json'), 'utf-8'),
    ]);

    const unmatched = JSON.parse(unmatchedRaw) as unknown[];
    const matched = JSON.parse(matchedRaw) as unknown[];
    const bank = JSON.parse(bankRaw) as unknown[];

    // 4. Build the prompt — pure function, no side effects
    const brain = await brainAsPromptContext();
    const { system, user } = briefPrompt({
      brain,
      sessionId: parsed.data.sessionId,
      unmatchedCount: unmatched.length,
      matchedCount: matched.length,
      totalBankTxns: bank.length,
    });

    // 5. Call Claude — throws on failure, caught below
    const text = await callClaude({ system, user, temperature: 0, maxTokens: 1024 });

    // 6. Extract and validate — if Claude returned garbage JSON, Zod throws here
    const json = extractJson(text);
    const validated: Brief = briefSchema.parse(json);

    return res.json(validated);
  } catch (err) {
    // 7. Any failure → fallback mock. The demo never breaks.
    logger.warn('brief.fallback', { error: String(err) });
    return res.json({ ...briefMock, sessionId: parsed.data.sessionId });
  }
});
