import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Sparkles, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSessionStore } from '@/store/session';
import { Spinner } from '@/components/ui/Spinner';
import { Typewriter } from '@/components/effects/Typewriter';
import { useCloseGuarantee } from './useCloseGuarantee';
import { briefMock } from './CloseGuarantee.mock';
import type { BriefBlocker, CloseGuaranteeProps } from './CloseGuarantee.types';
import { Gauge } from './Gauge';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const PURPLE = '#8E31B5';
const BLUE   = '#5793EC';

// ── Static data ───────────────────────────────────────────────────────────────
const BLOCKER_STYLE: Record<BriefBlocker['severity'], { Icon: LucideIcon; iconClass: string; bgClass: string }> = {
  high:   { Icon: XCircle,     iconClass: 'text-red-500',   bgClass: 'bg-red-50'   },
  medium: { Icon: AlertCircle, iconClass: 'text-amber-500', bgClass: 'bg-amber-50' },
  low:    { Icon: AlertCircle, iconClass: 'text-amber-400', bgClass: 'bg-amber-50' },
};

const STATS = [
  { label: 'SESSIONS',   value: '7',   sub: 'analyzed' },
  { label: 'AVG CLOSE',  value: '34m', sub: 'last 3'   },
  { label: 'MATCH RATE', value: '89%', sub: 'auto'     },
];

const STEPS = [
  { n: '01', label: 'Briefing' },
  { n: '02', label: 'Session'  },
  { n: '03', label: 'Closing'  },
  { n: '04', label: 'Narrator' },
];

// Reusable spring preset — gives a pleasant "pop" without excessive bounce
const POP = { type: 'spring' as const, stiffness: 260, damping: 20, mass: 0.8 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function minuteEstimate(
  severity: BriefBlocker['severity'],
  total: number,
  all: BriefBlocker[],
): string {
  const W = { high: 3, medium: 2, low: 1 } as const;
  const totalW = all.reduce((s, b) => s + W[b.severity], 0);
  if (totalW === 0) return '';
  return `~${Math.max(1, Math.round((W[severity] / totalW) * total))} min`;
}


// ── Component ─────────────────────────────────────────────────────────────────
export function CloseGuarantee({ sessionId }: CloseGuaranteeProps) {
  const openSession = useSessionStore((s) => s.openSession);
  const { data, loading, error } = useCloseGuarantee(sessionId);

  // Silently fall back to mock on error — demo must never show a broken state.
  const brief = data ?? (error !== null ? briefMock : null);

  const [typewriterReady, setTypewriterReady] = useState(false);
  const [blockersVisible, setBlockersVisible] = useState(false);

  const delayRef = useRef(0);

  useEffect(() => {
    if (!brief) return;

    setTypewriterReady(false);
    setBlockersVisible(false);

    // Mount the Typewriter 1 600 ms after the brief loads — matches gauge entrance timing.
    delayRef.current = window.setTimeout(() => setTypewriterReady(true), 1600);

    return () => clearTimeout(delayRef.current);
  }, [brief]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#EDF2FA]">
        <Spinner />
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#EDF2FA]">

      {/* ── 1. Top accent bar — custom easing slide-in ── */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="h-[3px] origin-left"
        style={{ background: `linear-gradient(90deg, ${PURPLE}, ${BLUE})` }}
      />

      {/* ── 2. Main two-column area ── */}
      <div className="flex flex-1 gap-12 px-16 pb-8 pt-12">

        {/* ─── Left column (55 %) ─── */}
        <div className="flex min-w-0 flex-col gap-8" style={{ flex: 55 }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, ...POP }}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1"
          >
            <Sparkles size={11} className="text-purple-500" />
            <span className="text-[11px] font-medium tracking-wide text-purple-600">
              PRE-SESSION BRIEFING
            </span>
          </motion.div>

          {/* Title + subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, ...POP }}
          >
            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              <span style={{ color: PURPLE }}>fast</span>
              <span className="text-gray-900">bank</span>
              <span className="ml-3 font-normal text-gray-700">Memories</span>
            </h1>
            <p className="mt-3 text-xs text-gray-400">
              Learning since Oct 2025 · 7 sessions analyzed · v2.4
            </p>
          </motion.div>

          {/* Brain insight card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, ...POP }}
            className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <p className="min-h-[3.5rem] text-sm leading-relaxed text-gray-700">
              {typewriterReady && (
                <Typewriter
                  text={brief.brainInsight}
                  speed={14}
                  highlights={[
                    /\$[\d,]+(?:\.\d+)?/,
                    /[A-Z]{3,}(?:\s+[A-Z]{3,})*/,
                    /±?\d+(?:\.\d+)?\s+(?:days?|minutes?|months?|weeks?)/,
                  ]}
                  onDone={() => setBlockersVisible(true)}
                />
              )}
            </p>
          </motion.div>

          {/* Blocker rows — slide in from the left, 120 ms stagger */}
          <div className="space-y-2">
            <AnimatePresence>
              {blockersVisible &&
                brief.blockers.map((blocker, i) => {
                  const { Icon, iconClass, bgClass } = BLOCKER_STYLE[blocker.severity];
                  return (
                    <motion.div
                      key={blocker.description}
                      initial={{ opacity: 0, x: -16, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: i * 0.12, ...POP }}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className={`shrink-0 rounded-full p-1.5 ${bgClass}`}>
                        <Icon size={14} className={iconClass} />
                      </div>
                      <p className="flex-1 text-sm text-gray-700">{blocker.description}</p>
                      <span className="shrink-0 text-xs text-gray-400">
                        {minuteEstimate(blocker.severity, brief.estimatedResolutionMinutes, brief.blockers)}
                      </span>
                    </motion.div>
                  );
                })
              }
            </AnimatePresence>
          </div>

          {/* CTA — scales + fades in last */}
          {blockersVisible && (
            <motion.button
              initial={{ opacity: 0, scale: 0.88, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: brief.blockers.length * 0.12 + 0.18, ...POP }}
              whileHover={{
                scale: 1.04,
                boxShadow: `0 10px 28px rgba(142,49,181,0.4)`,
                transition: { duration: 0.18 },
              }}
              whileTap={{ scale: 0.96 }}
              onClick={openSession}
              className="inline-flex w-fit items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: PURPLE }}
            >
              Start Session
              <ArrowRight size={16} />
            </motion.button>
          )}
        </div>

        {/* ─── Right column (45 %) — gauge centred vertically ─── */}
        <div
          className="flex flex-col items-center justify-center gap-6"
          style={{ flex: 45 }}
        >

          {/* Gauge — springs in from slightly below-scale */}
          <motion.div
            initial={{ scale: 0.78, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.28, type: 'spring', stiffness: 90, damping: 13 }}
            className="flex flex-col items-center gap-2"
          >
            <Gauge value={Math.round(brief.closeProbability * 100)} size={300} />
            <p className="text-center text-xs text-gray-400" style={{ width: 300 }}>
              {brief.closeProbabilityLabel}
            </p>
          </motion.div>

          {/* Stats cards — staggered spring pop */}
          <div className="grid grid-cols-3 gap-3" style={{ width: 300 }}>
            {STATS.map(({ label, value, sub }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 14, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.85 + i * 0.14, ...POP }}
                className="flex flex-col items-center rounded-xl border border-slate-100 bg-white py-3 shadow-sm"
              >
                <span className="text-[9px] font-medium uppercase tracking-wider text-gray-400">{label}</span>
                <span className="mt-0.5 text-2xl font-bold text-gray-800">{value}</span>
                <span className="text-[9px] text-gray-400">{sub}</span>
              </motion.div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Liquid glass step indicator ── */}
      <div className="flex justify-center pb-10 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.45, ...POP }}
          className="relative flex items-center rounded-full px-2 py-1.5"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.42) 100%)',
            backdropFilter: 'blur(22px) saturate(190%) brightness(108%)',
            WebkitBackdropFilter: 'blur(22px) saturate(190%) brightness(108%)',
            border: '1px solid rgba(255,255,255,0.88)',
            boxShadow: [
              '0 8px 32px rgba(0,0,0,0.07)',
              '0 2px 8px rgba(142,49,181,0.07)',
              'inset 0 1.5px 0 rgba(255,255,255,0.95)',
              'inset 0 -1px 0 rgba(0,0,0,0.04)',
            ].join(', '),
          }}
        >
          {/* Top-edge highlight — simulates the glass light refraction */}
          <div
            className="pointer-events-none absolute inset-x-4 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)' }}
          />

          {STEPS.map(({ n, label }, idx) => (
            <span
              key={n}
              className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                idx === 0 ? 'text-white' : 'text-gray-500'
              }`}
              style={idx === 0 ? {
                background: `linear-gradient(135deg, ${PURPLE} 0%, ${BLUE} 100%)`,
                boxShadow: `0 2px 14px rgba(142,49,181,0.38), inset 0 1px 0 rgba(255,255,255,0.25)`,
              } : undefined}
            >
              {n} · {label}
            </span>
          ))}
        </motion.div>
      </div>

    </div>
  );
}
