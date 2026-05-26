import { Router } from 'express';
import type { Response } from 'express';
import { loadBrain, clearBrainCache } from '../services/brain.js';
import {
  loadBankTransactions,
  loadSapTransactions,
  loadUnmatchedCases,
  loadMatchedRecords,
  loadSession,
  loadHistoricalPatterns,
  warmupCache,
  clearDataCache,
} from '../services/data.js';
import { logger } from '../utils/logger.js';

export const dataRouter = Router();

// ─── Fallbacks ────────────────────────────────────────────────────────────────
//
// If a data file fails to load, these are returned instead of a 500.
// They keep the UI alive with empty/minimal state so the demo doesn't crash.

const FALLBACKS = {
  brain: {
    customerId: 'UNKNOWN',
    learningSince: '',
    sessionsAnalyzed: 0,
    vendorProfiles: [],
    accountPatterns: {},
    closeProbability: { current: 0, blockers: [], formula: '' },
  },
  session: {
    id: '',
    period: '',
    account: '',
    status: 'open' as const,
    openedAt: '',
    endingBalance: 0,
    difference: 0,
    totals: { bank: { count: 0, sum: 0 }, sap: { count: 0, sum: 0 } },
    matchSummary: { matched: 0, unmatched: 0, matchRate: 0 },
  },
  historical: {
    customerId: '',
    generatedAt: '',
    monthlyCloseHistory: [],
    topRecurringIssues: [],
  },
};

// Runs a loader, falls back to a static value on failure.
// Consistent behavior across all data endpoints — no 500s in the demo.
async function serve<T>(loader: () => Promise<T>, fallback: T, res: Response): Promise<void> {
  try {
    res.json(await loader());
  } catch (err) {
    logger.warn('data.serve.fallback', { error: String(err) });
    res.json(fallback);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

dataRouter.get('/brain', (_req, res) => serve(loadBrain, FALLBACKS.brain, res));
dataRouter.get('/session', (_req, res) => serve(loadSession, FALLBACKS.session, res));
dataRouter.get('/transactions/bank', (_req, res) => serve(loadBankTransactions, [], res));
dataRouter.get('/transactions/sap', (_req, res) => serve(loadSapTransactions, [], res));
dataRouter.get('/matches', (_req, res) => serve(loadMatchedRecords, [], res));
dataRouter.get('/unmatched', (_req, res) => serve(loadUnmatchedCases, [], res));
dataRouter.get('/historical', (_req, res) => serve(loadHistoricalPatterns, FALLBACKS.historical, res));

// ─── Cache reload ─────────────────────────────────────────────────────────────

// Guard against concurrent reloads. Without this, two simultaneous calls would
// clear the cache twice and race to repopulate it — requests in between would
// see an empty cache and re-read from disk in an inconsistent state.
let isReloading = false;

dataRouter.post('/reload', async (_req, res) => {
  if (isReloading) {
    return res.status(409).json({ ok: false, message: 'Reload already in progress' });
  }

  isReloading = true;
  try {
    clearDataCache();
    clearBrainCache();
    await Promise.all([warmupCache(), loadBrain()]);
    logger.info('data.cache.reloaded');
    return res.json({ ok: true, message: 'Cache reloaded' });
  } catch (err) {
    logger.error('data.reload.fail', { error: String(err) });
    return res.status(500).json({ ok: false, message: 'Reload failed', error: String(err) });
  } finally {
    isReloading = false;
  }
});
