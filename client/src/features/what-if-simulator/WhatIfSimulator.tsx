import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useSessionStore } from '@/store/session';
import { useDataStore } from '@/store/data';
import { Gauge } from '@/features/close-guarantee/Gauge';
import { Typewriter } from '@/components/effects/Typewriter';
import { Spinner } from '@/components/ui/Spinner';
import { useWhatIfSimulator } from './useWhatIfSimulator';
import type { ScenarioOption } from './WhatIfSimulator.types';

const PURPLE = '#8E31B5';
const CARD = 'rounded-xl border border-slate-100 bg-white p-4 shadow-sm';
const POP  = { type: 'spring' as const, stiffness: 260, damping: 22, mass: 0.8 };

// Demo vendor — Session 5 renamed CONSTRUTECH → APEX SYSTEMS INC. Keep in sync
// with data/financial-brain.json and server/src/services/brain.ts vendor profiles.
const FOCUS_VENDOR = 'APEX SYSTEMS INC';

const SCENARIOS: ScenarioOption[] = [
  {
    id: 'apply-all',
    title: 'Apply all Brain recommendations',
    hint: 'Hero scenario · clears every blocker',
    hero: true,
    request: { scenarioType: 'threshold_change' },
  },
  {
    id: 'tolerance',
    title: `Raise ${FOCUS_VENDOR} tolerance to 5 days`,
    hint: 'Closes 3 date-window misses',
    request: {
      scenarioType: 'tolerance_change',
      vendorName: FOCUS_VENDOR,
      proposedToleranceDays: 5,
    },
  },
  {
    id: 'vendor-fix',
    title: `Resolve every ${FOCUS_VENDOR} case`,
    hint: 'Hits tolerance misses + duplicate flag',
    request: { scenarioType: 'vendor_fix', vendorName: FOCUS_VENDOR },
  },
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function WhatIfSimulator() {
  const sessionId        = useSessionStore((s) => s.sessionId);
  const closeProbability = useDataStore((s) => s.closeProbability);
  const unmatchedCases   = useDataStore((s) => s.unmatchedCases);

  const { data, loading, runScenario, reset } = useWhatIfSimulator();

  const [activeId, setActiveId]             = useState<string | null>(null);
  const [narrativeReady, setNarrativeReady] = useState(false);

  // When a new result arrives, defer the typewriter so the gauge animation
  // gets the room to breathe first.
  useEffect(() => {
    setNarrativeReady(false);
    if (!data) return;
    const t = window.setTimeout(() => setNarrativeReady(true), 900);
    return () => clearTimeout(t);
  }, [data]);

  const currentPct   = closeProbability !== null ? Math.round(closeProbability * 100) : 0;
  const projectedPct = data ? Math.round(data.projectedCloseProbability * 100) : currentPct;

  // ── Idle state — no cases at all ──
  if (unmatchedCases.length === 0 && !data && !loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <CheckCircle2 size={28} className="text-green-300" />
        <p className="text-sm text-gray-400">All cases resolved — nothing to simulate.</p>
      </div>
    );
  }

  function pickScenario(option: ScenarioOption) {
    setActiveId(option.id);
    void runScenario({ sessionId, ...option.request });
  }

  function tryAnother() {
    reset();
    setActiveId(null);
    setNarrativeReady(false);
  }

  return (
    <div className="flex h-full flex-col gap-0 overflow-y-auto">
      <motion.div
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
          <Sparkles size={14} style={{ color: PURPLE }} />
          <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: PURPLE }}>
            What if?
          </span>
          <span className="ml-auto rounded bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
            {unmatchedCases.length} open
          </span>
        </motion.div>

        {/* Intro */}
        {!data && !loading && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, ...POP }}
            className="text-sm leading-relaxed text-gray-600"
          >
            Simulate the impact of applying Brain recommendations <em className="font-medium text-gray-700">before</em> touching anything.
          </motion.p>
        )}

        {/* Scenario picker */}
        <AnimatePresence mode="wait">
          {!data && !loading && (
            <motion.div
              key="picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2"
            >
              {SCENARIOS.map((option, i) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07, ...POP }}
                  onClick={() => pickScenario(option)}
                  className={`group flex items-center gap-3 rounded-xl border ${
                    option.hero
                      ? 'border-purple-200 bg-purple-50/60 hover:border-purple-300 hover:bg-purple-50'
                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                  } px-4 py-3 text-left transition-colors`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      option.hero ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {option.hero ? <Sparkles size={14} /> : option.request.scenarioType === 'tolerance_change'
                      ? <TrendingUp size={14} />
                      : <Wrench size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{option.title}</p>
                    <p className="truncate text-[11px] text-gray-400">{option.hint}</p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-purple-500"
                  />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading — Brain thinking */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`${CARD} flex flex-col items-center justify-center gap-4 py-10`}
            >
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full opacity-60 blur-xl"
                  style={{ background: 'radial-gradient(circle, rgba(142,49,181,0.45), transparent 70%)' }}
                />
                <Spinner size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Brain simulating…</p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Replaying 7 months of close history against this scenario.
                </p>
              </div>
              {activeId !== null && (
                <p className="max-w-[240px] text-center text-[11px] italic text-gray-400">
                  {SCENARIOS.find((s) => s.id === activeId)?.title}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {data && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={POP}
              className="flex flex-col gap-4"
            >
              {/* Scenario label */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Scenario</span>
                <span className="truncate text-xs font-medium text-gray-700">{data.scenarioLabel}</span>
              </div>

              {/* Gauge — animates from current → projected */}
              <div className="flex flex-col items-center gap-3 rounded-xl border border-purple-100 bg-purple-50/30 px-3 py-5">
                <Gauge value={projectedPct} size={200} title="PROJECTED CLOSE" />
                <div className="flex items-center gap-2 rounded-full border border-purple-200 bg-white px-3 py-1">
                  <TrendingUp size={11} style={{ color: PURPLE }} />
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: PURPLE }}>
                    +{data.projectedDelta}% from today's {currentPct}%
                  </span>
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 gap-2">
                <div className={CARD}>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Cases resolved</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-gray-800">{data.casesResolved}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{data.casesRemaining} require manual review</p>
                </div>
                <div className={CARD}>
                  <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    <Wallet size={10} /> Unblocked
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-gray-800">
                    {formatCurrency(data.financialImpact)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Cash freed by this scenario</p>
                </div>
              </div>

              {/* Narrative */}
              <div className={CARD}>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Brain narrative</p>
                <p className="min-h-[3rem] text-sm leading-relaxed text-gray-700">
                  {narrativeReady && (
                    <Typewriter
                      text={data.narrative}
                      speed={12}
                      highlights={[
                        /\$[\d,]+/,
                        /\d+%/,
                        new RegExp(FOCUS_VENDOR),
                      ]}
                    />
                  )}
                </p>
              </div>

              {/* Brain basis */}
              <p className="text-[11px] italic text-gray-400">{data.brainBasis}</p>

              {/* Reset CTA */}
              <button
                onClick={tryAnother}
                className="group inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:border-purple-200 hover:text-purple-600"
              >
                <RotateCcw size={11} className="transition-transform group-hover:-rotate-45" />
                Try another scenario
                <ArrowRight size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
