import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { logger } from '../utils/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  reference: string;
  type: 'debit' | 'credit';
}

export interface SapTransaction {
  id: string;
  postingDate: string;
  amount: number;
  memo: string;
  docNumber: string;
  type: 'incoming_payment' | 'gl_entry' | 'outgoing_payment';
}

export interface UnmatchedCase {
  id: string;
  bankId: string;
  failureReason: string;
  details: string;
}

export interface MatchedRecord {
  id: string;
  bankId: string;
  sapId: string;
  ruleUsed: string;
  matchedAt: string;
}

export interface ReconciliationSession {
  id: string;
  period: string;
  account: string;
  status: 'open' | 'in_progress' | 'closed';
  openedAt: string;
  endingBalance: number;
  difference: number;
  totals: {
    bank: { count: number; sum: number };
    sap: { count: number; sum: number };
  };
  matchSummary: {
    matched: number;
    unmatched: number;
    matchRate: number;
  };
}

// ─── Path resolver ────────────────────────────────────────────────────────────

// Single place that knows where data lives.
// If data ever moves, change only this function.
function dataPath(file: string): string {
  return resolve(process.cwd(), `../data/${file}`);
}

// ─── Historical patterns ──────────────────────────────────────────────────────

export interface MonthlyClose {
  period: string;
  daysToClose: number;
  unmatchedAtOpen: number;
  closedClean: boolean;
}

export interface HistoricalPatterns {
  customerId: string;
  generatedAt: string;
  monthlyCloseHistory: MonthlyClose[];
  topRecurringIssues: Array<{
    vendor: string | null;
    issue: string;
    monthsAppeared: number;
  }>;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

// Same pattern as brain.ts: read once, cache in memory.
// For this demo the data never changes at runtime, so this is safe.
const cache: Partial<{
  bankTransactions: BankTransaction[];
  sapTransactions: SapTransaction[];
  unmatchedCases: UnmatchedCase[];
  matchedRecords: MatchedRecord[];
  session: ReconciliationSession;
  historicalPatterns: HistoricalPatterns;
}> = {};

async function loadJson<T>(file: string, key: keyof typeof cache): Promise<T> {
  if (cache[key] !== undefined) return cache[key] as T;
  try {
    const raw = await readFile(dataPath(file), 'utf-8');
    const parsed = JSON.parse(raw) as T;
    // @ts-expect-error — generic assignment into discriminated cache
    cache[key] = parsed;
    logger.info('data.loaded', { file });
    return parsed;
  } catch (err) {
    logger.error('data.load.fail', { file, error: String(err) });
    throw new Error(`Could not load ${file}. Run the server from the repo root.`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const loadBankTransactions = () =>
  loadJson<BankTransaction[]>('bank-transactions.json', 'bankTransactions');

export const loadSapTransactions = () =>
  loadJson<SapTransaction[]>('sap-transactions.json', 'sapTransactions');

export const loadUnmatchedCases = () =>
  loadJson<UnmatchedCase[]>('unmatched-cases.json', 'unmatchedCases');

export const loadMatchedRecords = () =>
  loadJson<MatchedRecord[]>('matched-records.json', 'matchedRecords');

export const loadSession = () =>
  loadJson<ReconciliationSession>('reconciliation-session.json', 'session');

export const loadHistoricalPatterns = () =>
  loadJson<HistoricalPatterns>('historical-patterns.json', 'historicalPatterns');

// Warms up the entire cache at once. Call on server startup so the first
// real request is never the slow one.
export async function warmupCache(): Promise<void> {
  await Promise.all([
    loadBankTransactions(),
    loadSapTransactions(),
    loadUnmatchedCases(),
    loadMatchedRecords(),
    loadSession(),
    loadHistoricalPatterns(),
  ]);
  logger.info('data.cache.warm');
}

// Clears all cached data — used by the /api/data/reload endpoint so JSON
// edits during demo prep take effect without restarting the server.
export function clearDataCache(): void {
  for (const key of Object.keys(cache) as Array<keyof typeof cache>) {
    delete cache[key];
  }
}
