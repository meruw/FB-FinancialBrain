import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp, X } from 'lucide-react';
import { useSessionStore } from '@/store/session';
import { useDataStore } from '@/store/data';
import Landing from '@/pages/landing';
import { CloseGuarantee } from '@/features/close-guarantee/CloseGuarantee';
import { Gauge } from '@/features/close-guarantee/Gauge';
import { TransactionTable } from '@/components/reconciliation/TransactionTable';
import { MatchDebugger } from '@/features/match-debugger/MatchDebugger';
import { RiskFirewall } from '@/features/risk-firewall/RiskFirewall';
import { Narrator } from '@/features/narrator/Narrator';
import { AppHeader } from '@/components/AppHeader';
import type { BankTransaction, SapTransaction } from '@/types/domain';

const PURPLE = '#8E31B5';
const POP    = { type: 'spring' as const, stiffness: 300, damping: 26 };

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
  const status            = useSessionStore((s) => s.status);
  const sessionId         = useSessionStore((s) => s.sessionId);
  const startDemo         = useSessionStore((s) => s.startDemo);
  const closeSession      = useSessionStore((s) => s.closeSession);
  const selectedId        = useSessionStore((s) => s.selectedTransactionId);
  const selectTransaction = useSessionStore((s) => s.selectTransaction);

  const isLoading              = useDataStore((s) => s.isLoading);
  const error                  = useDataStore((s) => s.error);
  const loadAll                = useDataStore((s) => s.loadAll);
  const session                = useDataStore((s) => s.session);
  const transactions           = useDataStore((s) => s.transactions);
  const sapTransactions        = useDataStore((s) => s.sapTransactions);
  const matchedRecords         = useDataStore((s) => s.matchedRecords);
  const unmatchedCases         = useDataStore((s) => s.unmatchedCases);
  const closeProbability       = useDataStore((s) => s.closeProbability);
  const initialCloseProbability = useDataStore((s) => s.initialCloseProbability);

  // Gauge: open/close + hover + pin state
  const [gaugeOpen, setGaugeOpen]  = useState(false);
  const pinnedRef        = useRef(false);
  const closeTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCpRef        = useRef<number | null>(null);

  // Called on chip/panel mouseenter — cancels any pending close or auto-hide
  const openGauge = useCallback(() => {
    if (closeTimerRef.current !== null)    { clearTimeout(closeTimerRef.current);    closeTimerRef.current = null; }
    if (autoHideTimerRef.current !== null) { clearTimeout(autoHideTimerRef.current); autoHideTimerRef.current = null; }
    setGaugeOpen(true);
  }, []);

  // Called on chip/panel mouseleave — schedules a close unless pinned
  const leaveGauge = useCallback(() => {
    if (pinnedRef.current) return;
    closeTimerRef.current = setTimeout(() => setGaugeOpen(false), 250);
  }, []);

  // Click toggles pin: pinned = stays open until clicked again
  const togglePin = useCallback(() => {
    pinnedRef.current = !pinnedRef.current;
    if (pinnedRef.current) {
      if (autoHideTimerRef.current !== null) { clearTimeout(autoHideTimerRef.current); autoHideTimerRef.current = null; }
      setGaugeOpen(true);
    } else {
      closeTimerRef.current = setTimeout(() => setGaugeOpen(false), 250);
    }
  }, []);

  // Auto-open on probability increase; auto-hide after 4 s unless pinned/hovered
  useEffect(() => {
    if (closeProbability === null) return;
    if (prevCpRef.current !== null && closeProbability > prevCpRef.current) {
      if (autoHideTimerRef.current !== null) { clearTimeout(autoHideTimerRef.current); autoHideTimerRef.current = null; }
      pinnedRef.current = false;
      setGaugeOpen(true);
      autoHideTimerRef.current = setTimeout(() => {
        if (!pinnedRef.current) setGaugeOpen(false);
      }, 4000);
    }
    prevCpRef.current = closeProbability;
  }, [closeProbability]);

  const bankMatchedIds  = matchedRecords.map((m) => m.bankId);
  const bankUnmatchedIds = unmatchedCases.map((u) => u.bankId);
  const sapMatchedIds   = matchedRecords.map((m) => m.sapId);
  const sapMatchedSet   = new Set(sapMatchedIds);
  const sapUnmatchedIds = normalizeSap(sapTransactions)
    .map((s) => s.id)
    .filter((id) => !sapMatchedSet.has(id));

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#EDF2FA]">
        <svg className="h-8 w-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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

  if (status === 'landing') {
    return <Landing onStart={startDemo} onHow={startDemo} onLogoClick={() => {}} />;
  }

  if (status === 'briefing') {
    return <CloseGuarantee sessionId={sessionId} />;
  }

  const isClosed = status === 'closed';
  const delta    = (closeProbability !== null && initialCloseProbability !== null)
    ? Math.round((closeProbability - initialCloseProbability) * 100)
    : 0;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#EDF2FA]">

      {/* ── Top chrome ── */}
      <AppHeader
        session={session}
        unmatchedCount={unmatchedCases.length}
        isClosed={isClosed}
        onCloseSession={isClosed ? undefined : closeSession}
        closeProbability={closeProbability}
        initialCloseProbability={initialCloseProbability}
        gaugeOpen={gaugeOpen}
        onGaugeOpen={openGauge}
        onGaugeLeave={leaveGauge}
        onGaugeToggle={togglePin}
      />

      {/* ── Floating gauge panel — fixed so it clears overflow:hidden ── */}
      <AnimatePresence>
        {gaugeOpen && closeProbability !== null && (
          <motion.div
            initial={{ y: -12 }}
            animate={{ y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={POP}
            onMouseEnter={openGauge}
            onMouseLeave={leaveGauge}
            className="fixed right-6 z-50"
            style={{ top: 66 }}
          >
            {/* Close button */}
            <button
              onClick={() => { pinnedRef.current = false; setGaugeOpen(false); }}
              className="absolute right-0 top-0 rounded-full p-1 text-gray-300 transition-colors hover:text-gray-500"
            >
              <X size={14} />
            </button>

            <div className="flex flex-col items-center px-2 pb-3 pt-2">
              {/* Liquid glass lens — circular, sits behind gauge arcs */}
              <div className="relative">
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 138,
                    height: 138,
                    borderRadius: '50%',
                    backdropFilter: 'blur(28px) saturate(240%) brightness(108%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(240%) brightness(108%)',
                    background: 'linear-gradient(158deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 35%, rgba(255,255,255,0.08) 65%, rgba(142,49,181,0.06) 100%)',
                    border: '1px solid rgba(255,255,255,0.80)',
                    boxShadow: [
                      'inset 0 1.5px 0 rgba(255,255,255,1)',
                      'inset 0 3px 18px rgba(255,255,255,0.55)',
                      'inset 0 -3px 10px rgba(142,49,181,0.10)',
                      '0 10px 48px rgba(142,49,181,0.28)',
                      '0 3px 14px rgba(0,0,0,0.07)',
                    ].join(', '),
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
                <Gauge
                  value={Math.round(closeProbability * 100)}
                  size={220}
                  title="CLOSE PROBABILITY"
                />
              </div>

              {/* Delta chip — only after at least one resolve this session */}
              <AnimatePresence>
                {delta > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.25, ...POP }}
                    className="mt-3 flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50/70 px-3 py-1"
                  >
                    <TrendingUp size={11} style={{ color: PURPLE }} />
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: PURPLE }}
                    >
                      +{delta}% this session
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content row ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left zone — reconciliation workspace (65 %) */}
        <div className="flex h-full w-[65%] flex-col gap-4 overflow-y-auto bg-[#EDF2FA] p-6">
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

        {/* Right zone — Brain Panel (35 %) */}
        <div className="flex h-full w-[35%] flex-col bg-white">
          {isClosed ? <Narrator /> : <MatchDebugger />}
        </div>

      </div>
    </div>
  );
}

export default App;
