import { Router } from 'express';
import { loadBrain } from '../services/brain.js';
import {
  loadBankTransactions,
  loadSapTransactions,
  loadUnmatchedCases,
  loadMatchedRecords,
  loadSession,
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
