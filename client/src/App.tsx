import { useEffect } from 'react';
import { useSessionStore } from '@/store/session';
import { useDataStore } from '@/store/data';
import { CloseGuarantee } from '@/features/close-guarantee/CloseGuarantee';
import { TransactionTable } from '@/components/reconciliation/TransactionTable';
import { MatchDebugger } from '@/features/match-debugger/MatchDebugger';
import { RiskFirewall } from '@/features/risk-firewall/RiskFirewall';
import { Narrator } from '@/features/narrator/Narrator';
import type { BankTransaction, SapTransaction } from '@/types/domain';

function normalizeSap(sap: SapTransaction[]): BankTransaction[] {
  return sap.map((s) => ({
    id: s.id,
    date: s.postingDate,
    amount: s.amount,
    description: s.memo,
    reference: s.docNumber,
    type: s.type === 'incoming_payment' ? 'credit' : 'debit',
  }));
}

function App() {
  const status              = useSessionStore((s) => s.status);
  const sessionId           = useSessionStore((s) => s.sessionId);
  const closeSession        = useSessionStore((s) => s.closeSession);
  const selectedId          = useSessionStore((s) => s.selectedTransactionId);
  const selectTransaction   = useSessionStore((s) => s.selectTransaction);

  const isLoading           = useDataStore((s) => s.isLoading);
  const error               = useDataStore((s) => s.error);
  const loadAll             = useDataStore((s) => s.loadAll);
  const transactions        = useDataStore((s) => s.transactions);
  const sapTransactions     = useDataStore((s) => s.sapTransactions);
  const matchedRecords      = useDataStore((s) => s.matchedRecords);
  const unmatchedCases      = useDataStore((s) => s.unmatchedCases);

  const bankMatchedIds      = matchedRecords.map((m) => m.bankId);
  const bankUnmatchedIds    = unmatchedCases.map((u) => u.bankId);
  const sapMatchedIds       = matchedRecords.map((m) => m.sapId);
  // SAP entries not appearing in any matched pair are unmatched
  const sapMatchedSet       = new Set(sapMatchedIds);
  const sapUnmatchedIds     = normalizeSap(sapTransactions)
    .map((s) => s.id)
    .filter((id) => !sapMatchedSet.has(id));

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#EDF2FA]">
        <svg
          className="h-8 w-8 animate-spin text-purple-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm text-gray-400">Financial Brain initializing...</span>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#EDF2FA]">
        <span className="text-sm text-red-500">{error}</span>
      </div>
    );
  }


  if (status === 'briefing') {
    return <CloseGuarantee sessionId={sessionId} />;
  }

  const isClosed = status === 'closed';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#EDF2FA]">

      {/* ── Left zone — reconciliation workspace (65 %) ── */}
      <div className="flex h-full w-[65%] flex-col gap-4 overflow-y-auto bg-[#EDF2FA] p-6">

        {/* Close session button — visible only while working */}
        {status === 'working' && (
          <div className="flex items-center justify-end">
            <button
              onClick={closeSession}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50"
            >
              Close session
            </button>
          </div>
        )}

        {/* Risk banner + tables — muted when session is closed */}
        <div className={`flex flex-col gap-4 transition-opacity duration-300 ${isClosed ? 'pointer-events-none opacity-40' : ''}`}>
          <RiskFirewall />
          <TransactionTable
            title="Bank Transactions"
            transactions={transactions}
            onSelect={selectTransaction}
            selectedId={selectedId}
            matchedIds={bankMatchedIds}
            unmatchedIds={bankUnmatchedIds}
          />
          <TransactionTable
            title="SAP Entries"
            transactions={normalizeSap(sapTransactions)}
            onSelect={selectTransaction}
            selectedId={selectedId}
            matchedIds={sapMatchedIds}
            unmatchedIds={sapUnmatchedIds}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px shrink-0 bg-slate-200" />

      {/* ── Right zone — Brain Panel (35 %) ── */}
      <div className="flex h-full w-[35%] flex-col bg-white">
        {isClosed ? <Narrator /> : <MatchDebugger />}
      </div>

    </div>
  );
}

export default App;
