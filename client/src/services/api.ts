/**
 * API client.
 *
 * Single entry point for all server calls. Every feature should add a
 * function here, NOT call fetch from components. That gives you:
 *   - one place to add auth/headers later
 *   - one place to add error handling and retries
 *   - one place to swap in fixtures during tests
 */
import type {
  Brief,
  DebugDiagnosis,
  RiskAssessment,
  Narrative,
  AdvisorResolution,
  ResolveResult,
  FinancialBrain,
  ReconciliationSession,
  BankTransaction,
  SapTransaction,
  MatchedRecord,
  UnmatchedCase,
} from '@/types/domain';

async function postJson<TBody, TResponse>(
  path: string,
  body: TBody
): Promise<TResponse> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TResponse;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: async (): Promise<{ ok: boolean; demoMode: boolean; model: string }> => {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('health check failed');
    return res.json();
  },

   // AI feature endpoints
  getBrief: (sessionId: string) =>
    postJson<{ sessionId: string }, Brief>('/api/brief', { sessionId }),

  getDebugDiagnosis: (transactionId: string) =>
    postJson<{ transactionId: string }, DebugDiagnosis>('/api/debug', { transactionId }),

  getRiskAssessment: (transactionId: string) =>
    postJson<{ transactionId: string }, RiskAssessment>('/api/risk', { transactionId }),

  getNarrative: (sessionId: string) =>
    postJson<{ sessionId: string }, Narrative>('/api/narrate', { sessionId }),

  getAdvisor: (transactionId: string) =>
    postJson<{ transactionId: string }, AdvisorResolution>('/api/advisor', { transactionId }),

  resolve: (transactionId: string, actionType: string) =>
    postJson<{ transactionId: string; actionType: string }, ResolveResult>('/api/resolve', { transactionId, actionType }),
  
// Data endpoints
  getBrain: () => getJson<FinancialBrain>('/api/data/brain'),
  getSession: () => getJson<ReconciliationSession>('/api/data/session'),
  getBankTransactions: () => getJson<BankTransaction[]>('/api/data/transactions/bank'),
  getSapTransactions: () => getJson<SapTransaction[]>('/api/data/transactions/sap'),
  getMatches: () => getJson<MatchedRecord[]>('/api/data/matches'),
  getUnmatched: () => getJson<UnmatchedCase[]>('/api/data/unmatched'),
  // Feature endpoints get added here as they ship:
  //
  // brief: (sessionId: string) =>
  //   postJson<{ sessionId: string }, Brief>('/api/brief', { sessionId }),
  //
  // debug: (transactionId: string) =>
  //   postJson<{ transactionId: string }, DebugDiagnosis>('/api/debug', { transactionId }),
  //
  // advise: (transactionId: string) =>
  //   postJson<{ transactionId: string }, Advice>('/api/advise', { transactionId }),
  //
  // narrate: (sessionId: string) =>
  //   postJson<{ sessionId: string }, Narrative>('/api/narrate', { sessionId }),
};

