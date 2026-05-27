import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, GitBranch, SearchX } from 'lucide-react';
import { useSessionStore } from '@/store/session';
import { Spinner } from '@/components/ui/Spinner';
import { Typewriter } from '@/components/effects/Typewriter';
import { RecommendationCard } from '@/components/ui/RecommendationCard';
import { useMatchDebugger } from './useMatchDebugger';
import { useAdvisor } from './useAdvisor';
import type { FailureReason } from '@/types/domain';

const PURPLE = '#8E31B5';

type TraceStep = { label: string; detail: string; status: 'ok' | 'warn' | 'fail' };

const TRACE_MAP: Record<FailureReason, TraceStep[]> = {
  sap_already_matched: [
    { label: 'Bank entry located',       detail: 'Amount and date matched in bank feed',         status: 'ok'   },
    { label: 'SAP candidate found',      detail: 'Matching SAP entry exists in the ledger',      status: 'ok'   },
    { label: 'Match eligibility check',  detail: 'SAP entry already linked to another record',   status: 'fail' },
    { label: 'Resolution required',      detail: 'Manual review needed to release prior match',  status: 'warn' },
  ],
  date_tolerance_miss: [
    { label: 'Bank entry located',       detail: 'Amount found in bank feed',                    status: 'ok'   },
    { label: 'SAP candidate found',      detail: 'Matching amount found in SAP ledger',          status: 'ok'   },
    { label: 'Date window check',        detail: 'Posting date outside configured tolerance',    status: 'fail' },
    { label: 'Tolerance rule applied',   detail: 'Consider widening date range for this vendor', status: 'warn' },
  ],
  no_sap_counterpart: [
    { label: 'Bank entry located',       detail: 'Transaction found in bank feed',               status: 'ok'   },
    { label: 'SAP search performed',     detail: 'Full ledger scan for matching amount',         status: 'ok'   },
    { label: 'SAP counterpart check',    detail: 'No matching entry found in SAP',               status: 'fail' },
    { label: 'GL posting required',      detail: 'Manual GL entry needed in SAP',                status: 'warn' },
  ],
  amount_mismatch: [
    { label: 'Bank entry located',       detail: 'Transaction found in bank feed',               status: 'ok'   },
    { label: 'SAP candidate found',      detail: 'Closest candidate identified by date',         status: 'ok'   },
    { label: 'Amount comparison',        detail: 'Bank and SAP amounts do not match exactly',    status: 'fail' },
    { label: 'Variance analysis',        detail: 'Check for partial payments or rounding issues',status: 'warn' },
  ],
  likely_duplicate: [
    { label: 'Bank entry located',       detail: 'Transaction found in bank feed',               status: 'ok'   },
    { label: 'Duplicate scan',           detail: 'Scanning for similar amounts within ±7 days',  status: 'ok'   },
    { label: 'Duplicate detected',       detail: 'Near-identical transaction found in same period', status: 'fail' },
    { label: 'Treasury escalation',      detail: 'Verify with treasury before any GL posting',   status: 'warn' },
  ],
};

const CONFIDENCE_VALUE: Record<'high' | 'medium' | 'low', number> = {
  high:   0.89,
  medium: 0.65,
  low:    0.35,
};

const STATUS_DOT: Record<TraceStep['status'], string> = {
  ok:   'bg-green-500',
  warn: 'bg-amber-400',
  fail: 'bg-red-500',
};

const CARD = 'rounded-xl border border-slate-100 bg-white p-4 shadow-sm';
const POP  = { type: 'spring' as const, stiffness: 260, damping: 22, mass: 0.8 };

export function MatchDebugger() {
  const selectedId = useSessionStore((s) => s.selectedTransactionId);

  const { data, loading }          = useMatchDebugger();
  const { data: advisor, loading: advisorLoading, accepting, accepted, accept, skip } = useAdvisor();

  const [typewriterReady, setTypewriterReady] = useState(false);
  const [traceVisible, setTraceVisible]       = useState(false);
  const [confidencePct, setConfidencePct]     = useState(0);

  const delayRef = useRef<number>(0);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    setTypewriterReady(false);
    setTraceVisible(false);
    setConfidencePct(0);

    if (!data) return;

    delayRef.current = window.setTimeout(() => setTypewriterReady(true), 400);
    return () => clearTimeout(delayRef.current);
  }, [data]);

  useEffect(() => {
    if (!traceVisible || !data) return;

    const target = CONFIDENCE_VALUE[data.confidence];
    const start  = performance.now();
    const dur    = 800;

    function tick(now: number) {
      const t    = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setConfidencePct(Math.round(ease * target * 100));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [traceVisible, data]);

  // ── Empty state ──
  if (!selectedId && !loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <SearchX size={28} className="text-gray-300" />
        <p className="text-sm text-gray-400">Select a transaction to analyze</p>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Spinner />
        <p className="text-xs text-gray-400">Brain analyzing…</p>
      </div>
    );
  }

  if (!data) return null;

  const traceSteps = TRACE_MAP[data.rootCause] ?? TRACE_MAP['no_sap_counterpart'];
  const confValue  = CONFIDENCE_VALUE[data.confidence];
  const confColor  = confValue >= 0.8 ? 'text-green-600' : confValue >= 0.5 ? 'text-amber-500' : 'text-red-500';
  const confBar    = confValue >= 0.8 ? 'bg-green-500'   : confValue >= 0.5 ? 'bg-amber-400'   : 'bg-red-500';

  return (
    <div className="flex h-full flex-col gap-0 overflow-y-auto">

      {/* Accent bar */}
      <motion.div
        key={data.transactionId}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="h-[2px] shrink-0 origin-left"
        style={{ backgroundColor: PURPLE }}
      />

      <div className="flex flex-col gap-5 p-5">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, ...POP }}
          className="flex items-center gap-2"
        >
          <GitBranch size={14} style={{ color: PURPLE }} />
          <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: PURPLE }}>
            TRACE
          </span>
          <span className="ml-auto rounded bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
            {data.transactionId}
          </span>
        </motion.div>

        {/* Diagnosis */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ...POP }}
          className={CARD}
        >
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Diagnosis
          </p>
          <p className="min-h-[3rem] text-sm leading-relaxed text-gray-700">
            {typewriterReady && (
              <Typewriter
                text={data.diagnosis}
                speed={12}
                highlights={[
                  /\$[\d,]+(?:\.\d+)?/,
                  /BT-\d+/,
                  /[A-Z]{3,}(?:\s+[A-Z]{3,})*/,
                ]}
                onDone={() => setTraceVisible(true)}
              />
            )}
          </p>
        </motion.div>

        {/* TRACE timeline */}
        <AnimatePresence>
          {traceVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-0"
            >
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Match trace
              </p>
              {traceSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, ...POP }}
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  {i < traceSteps.length - 1 && (
                    <div className="absolute left-[5px] top-[13px] h-full w-px bg-slate-200" />
                  )}
                  <div className={`mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[step.status]}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800">{step.label}</p>
                    <p className="text-[11px] text-gray-400">{step.detail}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confidence bar */}
        <AnimatePresence>
          {traceVisible && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: traceSteps.length * 0.1 + 0.1, ...POP }}
              className={CARD}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  Confidence
                </p>
                <span className={`text-sm font-medium ${confColor}`}>{confidencePct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${confBar}`}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] capitalize text-gray-400">
                {data.confidence} confidence · {data.rootCause.replace(/_/g, ' ')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resolution Advisor */}
        <AnimatePresence>
          {traceVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: traceSteps.length * 0.1 + 0.25, ...POP }}
            >
              {advisorLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Spinner size={14} />
                  Advisor loading…
                </div>
              )}

              {!advisorLoading && advisor && (
                <RecommendationCard
                  action={advisor.action}
                  actionType={advisor.actionType}
                  steps={advisor.steps}
                  risk={advisor.risk}
                  confidenceScore={advisor.confidenceScore}
                  brainBasis={advisor.brainBasis}
                  onAccept={() => { void accept(); }}
                  onSkip={skip}
                  accepting={accepting}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accepted confirmation */}
        <AnimatePresence>
          {traceVisible && accepted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={POP}
              className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5"
            >
              <CheckCircle2 size={15} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">Recommendation applied</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
