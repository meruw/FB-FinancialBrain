/**
 * Domain types shared across the client.
 * Mirror the Zod schemas in server/src/schemas/ — keep in sync.
 */

// ─── Core data types ────────────────────────────────────────────────────────

export type RuleId = 'ExactDate' | 'ExactCheckNumber' | 'DateWithRange' | 'NACHA' | 'FastBank' | 'ManualMatch';

export type FailureReason =
  | 'date_tolerance_miss'
  | 'no_sap_counterpart'
  | 'sap_already_matched'
  | 'amount_mismatch'
  | 'likely_duplicate';

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
  failureReason: FailureReason;
  details: string;
}

export interface ReconciliationSession {
  id: string;
  period: string;
  periodStart?: string;
  periodEnd?: string;
  account: string;
  accountNumber?: string;
  currency?: string;
  status: 'open' | 'in_progress' | 'closed';
  openedAt: string;
  endingBalance: number;
  sapBalance?: number;
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

// ─── Financial Brain ─────────────────────────────────────────────────────────

export interface VendorProfile {
  vendor: string;
  avgPostingDelay: number;
  commonIssue: FailureReason;
  occurrencesLast6Months: number;
  recommendedTolerance: number;
  matchSuccessRate: number;
}

export interface FinancialBrain {
  customerId: string;
  learningSince: string;
  sessionsAnalyzed: number;
  vendorProfiles: VendorProfile[];
  accountPatterns: Record<
    string,
    { avgCloseTime: number; typicalMonthlyFees: number; historicalCloseRate: number }
  >;
  closeProbability: {
    current: number;
    blockers: string[];
    formula: string;
  };
}

// ─── Feature output types (mirrors server/src/schemas/) ─────────────────────

export interface BriefBlocker {
  description: string;
  severity: 'high' | 'medium' | 'low';
  vendor: string | null;
  knownPattern: boolean;
}

export interface BriefRecommendation {
  action: string;
  expectedImpact: string;
  priority: 1 | 2 | 3;
}

export interface Brief {
  sessionId: string;
  closeProbability: number;
  closeProbabilityLabel: string;
  blockers: BriefBlocker[];
  recommendations: BriefRecommendation[];
  estimatedResolutionMinutes: number;
  brainInsight: string;
}

export interface DebugDiagnosis {
  transactionId: string;
  diagnosis: string;
  rootCause: FailureReason;
  vendorContext: string | null;
  suggestedFix: string;
  suggestedToleranceDays: number | null;
  confidence: 'high' | 'medium' | 'low';
}

export type RiskFlag = {
  type:
    | 'duplicate_payment'
    | 'unusual_amount'
    | 'vendor_anomaly'
    | 'timing_anomaly'
    | 'missing_sap_entry'
    | 'policy_violation';
  description: string;
};

export interface RiskAssessment {
  transactionId: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskLabel: string;
  flags: RiskFlag[];
  recommendation: 'escalate' | 'review' | 'auto_resolve' | 'ignore';
  brainBasis: string;
}

export interface NarrativeInsight {
  insight: string;
  category: 'vendor' | 'pattern' | 'risk';
}

export interface Narrative {
  sessionId: string;
  headline: string;
  narrative: string;
  learnedThisSession: NarrativeInsight[];
  stats: {
    matched: number;
    unmatched: number;
    closeProbability: number;
    resolvedBlockers: number;
  };
  nextCloseProbability: number;
  nextCloseDelta: number;
  sessionsToTarget: number;
}

export type AdvisorActionType =
  | 'release_match'
  | 'mark_fee'
  | 'manual_match'
  | 'escalate'
  | 'flag_duplicate';

export interface AdvisorStep {
  order: number;
  instruction: string;
}

export interface AdvisorProvenance {
  historicalAccuracy: {
    rate: number;
    matchCount: number;
  };
  patternSource: {
    hitCount: number;
    windowSize: number;
    windowUnit: 'closes';
  };
  lastSimilarAction: {
    occurredAt: string;
    outcome: 'accepted' | 'rejected' | 'modified' | 'skipped';
  } | null;
}

export interface AdvisorResolution {
  transactionId: string;
  action: string;
  actionType: AdvisorActionType;
  reasoning: string;
  steps: AdvisorStep[];
  risk: 'critical' | 'high' | 'medium' | 'low';
  confidenceScore: number;
  brainBasis: string;
  provenance: AdvisorProvenance | null;
}

export type SimulationScenario = 'tolerance_change' | 'vendor_fix' | 'threshold_change';

export interface ResolveResult {
  transactionId: string;
  actionType: AdvisorActionType;
  resolved: true;
  updatedStats: {
    matched: number;
    unmatched: number;
    closeProbability: number;
    nextCloseProbability: number;
    nextCloseDelta: number;
    sessionsToTarget: number;
  };
}

export interface SimulationResult {
  scenarioLabel: string;
  projectedCloseProbability: number;
  projectedDelta: number;
  casesResolved: number;
  casesRemaining: number;
  financialImpact: number;
  narrative: string;
  brainBasis: string;
}

// One row of the archived PDF list returned by GET /api/export/reports.
// `url` is a time-limited SAS URL — opening it streams the PDF without auth.
export interface ClosingReport {
  name: string;
  url: string;
  sizeBytes: number;
  lastModified: string;
}
