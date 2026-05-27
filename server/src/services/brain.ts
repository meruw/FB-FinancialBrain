import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { logger } from '../utils/logger.js';

/**
 * The Financial Brain.
 *
 * This is the central context object that gets injected into EVERY AI call.
 * It's what makes the demo feel like the system "remembers" things about the
 * customer. Without this, every feature produces generic output.
 *
 * For the hackathon: read once from data/financial-brain.json on demand.
 * In production: this would be backed by a DB per customer, updated after
 * each session. The shape stays the same.
 *
 * Keep this file as the ONLY place that knows where the brain lives. If we
 * later move to a DB or remote service, only this module changes.
 */

export interface VendorProfile {
  vendor: string;
  avgPostingDelay: number;
  commonIssue: string;
  occurrencesLast6Months: number;
  recommendedTolerance: number;
  matchSuccessRate: number;
}

export interface AccountPattern {
  avgCloseTime: number;
  typicalMonthlyFees: number;
  historicalCloseRate: number;
}

export interface CloseProbability {
  current: number;
  blockers: string[];
  /**
   * Human-readable formula for "how is this number computed".
   * Keep this short and defensible - the demo audience WILL ask.
   */
  formula: string;
}

export interface FinancialBrain {
  customerId: string;
  learningSince: string;
  sessionsAnalyzed: number;
  vendorProfiles: VendorProfile[];
  accountPatterns: Record<string, AccountPattern>;
  closeProbability: CloseProbability;
}

const BRAIN_PATH = resolve(process.cwd(), '../data/financial-brain.json');

let cached: FinancialBrain | null = null;

export async function loadBrain(): Promise<FinancialBrain> {
  if (cached) return cached;
  try {
    const raw = await readFile(BRAIN_PATH, 'utf-8');
    cached = JSON.parse(raw) as FinancialBrain;
    logger.info('brain.loaded', { customer: cached.customerId, sessions: cached.sessionsAnalyzed });
    return cached;
  } catch (err) {
    logger.error('brain.load.fail', { path: BRAIN_PATH, error: String(err) });
    throw new Error(`Could not load Financial Brain from ${BRAIN_PATH}. Run from the repo root.`);
  }
}

/**
 * Hot-reload the brain. Useful in dev if you tweak the JSON without restarting.
 */
export function clearBrainCache(): void {
  cached = null;
}

/**
 * Returns the brain serialized for prompt injection. Keep it compact - the
 * JSON itself IS the system context. No prose wrapper needed.
 */
export async function brainAsPromptContext(): Promise<string> {
  const brain = await loadBrain();
  return JSON.stringify(brain, null, 2);
}

/**
 * Finds the vendor profile for a bank transaction by matching vendor names
 * against the transaction description. Returns null if the vendor is unknown.
 * Used by any route that needs targeted vendor context instead of the full Brain.
 */
export function findVendorProfile(
  brain: FinancialBrain,
  transactionDescription: string,
): VendorProfile | null {
  return (
    brain.vendorProfiles.find((vp) =>
      transactionDescription.toUpperCase().includes(vp.vendor.toUpperCase()),
    ) ?? null
  );
}

/**
 * Builds a minimal Brain context for the brief endpoint.
 * Sends only the vendor profiles relevant to the current session's unmatched
 * cases + the account pattern for the session account. Omits closeProbability
 * (computed in code) and unrelated vendor/account data.
 * Keeps prompt tokens low → Haiku responds in ~1-2s instead of 6-10s.
 */
export function buildBriefContext(
  brain: FinancialBrain,
  account: string,
  relevantVendors: VendorProfile[],
): string {
  return JSON.stringify(
    {
      customerId: brain.customerId,
      sessionsAnalyzed: brain.sessionsAnalyzed,
      account,
      accountPattern: brain.accountPatterns[account] ?? null,
      relevantVendorProfiles: relevantVendors,
    },
    null,
    2,
  );
}

/**
 * Targeted Brain context for the narrator endpoint.
 * Like buildBriefContext but includes learningSince for the "N sessions" story
 * and limits vendorProfiles to those appearing in the current session.
 * Keeps input tokens low so Sonnet responds within the 15s timeout.
 */
export function buildNarratorContext(
  brain: FinancialBrain,
  account: string,
  relevantVendors: VendorProfile[],
): string {
  return JSON.stringify(
    {
      customerId: brain.customerId,
      learningSince: brain.learningSince,
      sessionsAnalyzed: brain.sessionsAnalyzed,
      account,
      accountPattern: brain.accountPatterns[account] ?? null,
      relevantVendorProfiles: relevantVendors,
    },
    null,
    2,
  );
}
