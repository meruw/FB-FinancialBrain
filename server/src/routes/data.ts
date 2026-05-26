import { Router } from 'express';
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

export const dataRouter = Router();

// Financial Brain — drives the Brain panel in the UI
dataRouter.get('/brain', async (_req, res, next) => {
  try {
    res.json(await loadBrain());
  } catch (err) {
    next(err);
  }
});

// Reconciliation session metadata
dataRouter.get('/session', async (_req, res, next) => {
  try {
    res.json(await loadSession());
  } catch (err) {
    next(err);
  }
});

// Transactions
dataRouter.get('/transactions/bank', async (_req, res, next) => {
  try {
    res.json(await loadBankTransactions());
  } catch (err) {
    next(err);
  }
});

dataRouter.get('/transactions/sap', async (_req, res, next) => {
  try {
    res.json(await loadSapTransactions());
  } catch (err) {
    next(err);
  }
});

// Match results
dataRouter.get('/matches', async (_req, res, next) => {
  try {
    res.json(await loadMatchedRecords());
  } catch (err) {
    next(err);
  }
});

dataRouter.get('/unmatched', async (_req, res, next) => {
  try {
    res.json(await loadUnmatchedCases());
  } catch (err) {
    next(err);
  }
});

// Historical close patterns — used by the Brain panel trend chart
dataRouter.get('/historical', async (_req, res, next) => {
  try {
    res.json(await loadHistoricalPatterns());
  } catch (err) {
    next(err);
  }
});

// Cache reload — edit a JSON file in /data, then hit this endpoint to pick
// up the changes without restarting the server. Useful during demo prep.
dataRouter.post('/reload', async (_req, res, next) => {
  try {
    clearDataCache();
    clearBrainCache();
    await warmupCache();
    res.json({ ok: true, message: 'Cache reloaded' });
  } catch (err) {
    next(err);
  }
});
