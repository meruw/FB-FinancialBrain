import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { loadBrain, findVendorProfile, buildBriefContext } from '../services/brain.js';
import { loadBankTransactions, loadMatchedRecords, loadUnmatchedCases, loadSession } from '../services/data.js';
import { briefSchema, type Brief } from '../schemas/brief.js';
import { briefPrompt } from '../prompts/brief.js';
import { briefMock } from '../mocks/brief.js';
import { parseBody } from '../utils/validate.js';
import { computeCloseProbability } from '../utils/closeProbability.js';
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

  let closeProbability: number | null = null;

  try {
    const [unmatched, matched, bank, brainData, session] = await Promise.all([
      loadUnmatchedCases(),
      loadMatchedRecords(),
      loadBankTransactions(),
      loadBrain(),
      loadSession(),
    ]);

    const accountPattern = brainData.accountPatterns[session.account];
    const historicalCloseRate = accountPattern?.historicalCloseRate ?? 0.75;

    // Only vendor profiles that appear in this session's unmatched cases.
    const relevantVendors = unmatched
      .map((c) => bank.find((t) => t.id === c.bankId))
      .filter((t): t is (typeof bank)[number] => t !== undefined)
      .map((t) => findVendorProfile(brainData, t.description))
      .filter((vp): vp is NonNullable<typeof vp> => vp !== null)
      .filter((vp, i, arr) => arr.findIndex((v) => v.vendor === vp.vendor) === i);

    const brain = buildBriefContext(brainData, session.account, relevantVendors);

    closeProbability = computeCloseProbability({
      historicalCloseRate,
      matchedCount: matched.length,
      totalBankTxns: bank.length,
      unmatchedCases: unmatched,
    });

    logger.info('brief.closeProbability', {
      historicalCloseRate,
      account: session.account,
      relevantVendors: relevantVendors.map((v) => v.vendor),
      closeProbability,
    });

    const { system, user } = briefPrompt({
      brain,
      sessionId: body.sessionId,
      closeProbability,
      unmatchedCount: unmatched.length,
      matchedCount: matched.length,
      totalBankTxns: bank.length,
    });

    // Haiku: faster for structured JSON with a clear schema, Sonnet not needed here.
    const text = await callClaude({
      system,
      user,
      model: 'claude-haiku-4-5-20251001',
      temperature: 0,
      maxTokens: 1024,
    });
    const partial = briefSchema.omit({ closeProbability: true }).parse(extractJson(text));
    const validated: Brief = { ...partial, closeProbability };

    return res.json(validated);
  } catch (err) {
    logger.warn('brief.fallback', { error: String(err) });
    const fallback = { ...briefMock, sessionId: body.sessionId };
    if (closeProbability !== null) fallback.closeProbability = closeProbability;
    return res.json(fallback);
  }
});
