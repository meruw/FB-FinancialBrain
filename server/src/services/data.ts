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
    matchCount: number | null;
    lastOccurrence: string | null;
    recommendation: string;
  }>;
}

// ─── Path resolver ────────────────────────────────────────────────────────────

function dataPath(file: string): string {
  return resolve(process.cwd(), `../data/${file}`);
}

// ─── Loader primitive ─────────────────────────────────────────────────────────

async function readDataFile<T>(file: string): Promise<T> {
  try {
    const raw = await readFile(dataPath(file), 'utf-8');
    const parsed = JSON.parse(raw) as T;
    logger.info('data.loaded', { file });
    return parsed;
  } catch (err) {
    logger.error('data.load.fail', { file, error: String(err) });
    throw new Error(`Could not load ${file}. Run the server from the repo root.`);
  }
}

// ─── Per-type caches ──────────────────────────────────────────────────────────
//
// One nullable variable per type — same pattern as brain.ts.
// Fully type-safe: no generics, no @ts-expect-error, no runtime surprises.

let cachedBankTransactions: BankTransaction[] | null = null;
let cachedSapTransactions: SapTransaction[] | null = null;
let cachedUnmatchedCases: UnmatchedCase[] | null = null;
let cachedMatchedRecords: MatchedRecord[] | null = null;
let cachedSession: ReconciliationSession | null = null;
let cachedHistoricalPatterns: HistoricalPatterns | null = null;

// ─── Public loaders ───────────────────────────────────────────────────────────

export async function loadBankTransactions(): Promise<BankTransaction[]> {
  if (cachedBankTransactions) return cachedBankTransactions;
  cachedBankTransactions = await readDataFile<BankTransaction[]>('bank-transactions.json');
  return cachedBankTransactions;
}

export async function loadSapTransactions(): Promise<SapTransaction[]> {
  if (cachedSapTransactions) return cachedSapTransactions;
  cachedSapTransactions = await readDataFile<SapTransaction[]>('sap-transactions.json');
  return cachedSapTransactions;
}

export async function loadUnmatchedCases(): Promise<UnmatchedCase[]> {
  if (cachedUnmatchedCases) return cachedUnmatchedCases;
  cachedUnmatchedCases = await readDataFile<UnmatchedCase[]>('unmatched-cases.json');
  return cachedUnmatchedCases;
}

export async function loadMatchedRecords(): Promise<MatchedRecord[]> {
  if (cachedMatchedRecords) return cachedMatchedRecords;
  cachedMatchedRecords = await readDataFile<MatchedRecord[]>('matched-records.json');
  return cachedMatchedRecords;
}

export async function loadSession(): Promise<ReconciliationSession> {
  if (cachedSession) return cachedSession;
  cachedSession = await readDataFile<ReconciliationSession>('reconciliation-session.json');
  return cachedSession;
}

export async function loadHistoricalPatterns(): Promise<HistoricalPatterns> {
  if (cachedHistoricalPatterns) return cachedHistoricalPatterns;
  cachedHistoricalPatterns = await readDataFile<HistoricalPatterns>('historical-patterns.json');
  return cachedHistoricalPatterns;
}

// ─── Cache management ─────────────────────────────────────────────────────────

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

export function clearDataCache(): void {
  cachedBankTransactions = null;
  cachedSapTransactions = null;
  cachedUnmatchedCases = null;
  cachedMatchedRecords = null;
  cachedSession = null;
  cachedHistoricalPatterns = null;
}
