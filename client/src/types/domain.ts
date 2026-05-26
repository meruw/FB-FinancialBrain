/**
 * Domain types shared across the client.
 *
 * These mirror the mock data shapes in /data/*.json. Keep them in sync with
 * the JSON. If you later switch to generated types from Zod, replace this
 * file and re-export from there - nothing else should care.
 */

export type RuleId =
  | 'ExactDate'
  | 'ExactCheckNumber'
  | 'DateWithRange'
  | 'NACHA'
  | 'FastBank';

export interface BankTransaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
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

export interface MatchedRecord {
  id: string;
  bankId: string;
  sapId: string;
  ruleUsed: RuleId;
  matchedAt: string;
}

export interface UnmatchedCase {
  id: string;
  bankId: string;
  failureReason:
    | 'date_tolerance_miss'
    | 'no_sap_counterpart'
    | 'sap_already_matched'
    | 'amount_mismatch'
    | 'likely_duplicate';
  details: string;
}

export interface ReconciliationSession {
  id: string;
  period: string;
  account: string;
  status: 'open' | 'in_progress' | 'closed';
  endingBalance: number;
  difference: number;
  totals: {
    bank: { count: number; sum: number };
    sap: { count: number; sum: number };
  };
}
