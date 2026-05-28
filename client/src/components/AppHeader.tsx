import { motion } from 'framer-motion';
import { Brain, TrendingUp, X } from 'lucide-react';
import type { ReconciliationSession } from '@/types/domain';

const PURPLE = '#8E31B5';
const BLUE   = '#5793EC';

function fmtCurrency(amount: number | undefined, currency = 'MXN'): string {
  if (amount === undefined) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface KpiProps {
  label: string;
  value: string;
  valueClass?: string;
}

function Kpi({ label, value, valueClass = 'text-gray-800' }: KpiProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

export interface AppHeaderProps {
  session: ReconciliationSession | null;
  unmatchedCount: number;
  isClosed?: boolean;
  onCloseSession?: () => void;
  // Live probability chip
  closeProbability?: number | null;
  initialCloseProbability?: number | null;
  gaugeOpen?: boolean;
  onGaugeOpen?: () => void;
  onGaugeLeave?: () => void;
  onGaugeToggle?: () => void;
}

export function AppHeader({
  session,
  unmatchedCount,
  isClosed,
  onCloseSession,
  closeProbability,
  initialCloseProbability,
  gaugeOpen = false,
  onGaugeOpen,
  onGaugeLeave,
  onGaugeToggle,
}: AppHeaderProps) {
  const currency    = session?.currency ?? 'MXN';
  const bankBalance = session?.endingBalance;
  const sapBalance  = session?.sapBalance;
  const difference  = session?.difference;
  const account     = session?.account ?? 'Main Checking';
  const accountNum  = session?.accountNumber;
  const period      = session?.period ?? '—';

  const diffClass = difference !== undefined && difference < 0
    ? 'text-red-500'
    : 'text-emerald-600';

  const showChip = closeProbability !== null && closeProbability !== undefined;
  const hasDelta = showChip
    && initialCloseProbability != null
    && closeProbability! > initialCloseProbability;

  return (
    <div className="flex w-full shrink-0 flex-col">
      {/* Brand gradient strip */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="h-[2px] w-full origin-left"
        style={{ background: `linear-gradient(90deg, ${PURPLE}, ${BLUE})` }}
      />

      {/* Main bar — 56px */}
      <div className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-6">

        {/* ── Left: brand + session meta ── */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-base font-bold tracking-tight">
            <span style={{ color: PURPLE }}>fast</span>
            <span className="text-gray-900">bank</span>
            <span className="ml-1.5 text-sm font-normal text-gray-400">Memories</span>
          </span>

          {session && (
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="h-3 w-px bg-slate-200" />
              <span className="font-medium text-gray-600">{account}</span>
              {accountNum && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                  {accountNum}
                </span>
              )}
              <span className="h-3 w-px bg-slate-200" />
              <span>{period}</span>
            </div>
          )}
        </div>

        {/* ── Center: KPI stats ── */}
        {session && (
          <div className="flex flex-1 items-center justify-center gap-6">
            <Kpi label="Bank Balance" value={fmtCurrency(bankBalance, currency)} />
            <div className="h-5 w-px bg-slate-200" />
            <Kpi label="SAP Balance"  value={fmtCurrency(sapBalance, currency)} />
            <div className="h-5 w-px bg-slate-200" />
            <Kpi label="Difference"   value={fmtCurrency(difference, currency)} valueClass={diffClass} />
          </div>
        )}

        {/* ── Right: probability chip + pills + close ── */}
        <div className="flex shrink-0 items-center gap-2">

          {/* Unresolved count badge */}
          {unmatchedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-500">
              {unmatchedCount} unresolved
            </span>
          )}

          {/* Close probability chip — always visible, toggles the gauge panel */}
          {showChip && (
            <button
              onMouseEnter={onGaugeOpen}
              onMouseLeave={onGaugeLeave}
              onClick={onGaugeToggle}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all ${
                gaugeOpen
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'
              }`}
            >
              <span
                className="text-sm font-bold tabular-nums leading-none"
                style={{
                  background: `linear-gradient(90deg, ${PURPLE}, ${BLUE})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {Math.round(closeProbability! * 100)}%
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                close
              </span>
              {hasDelta && <TrendingUp size={10} style={{ color: PURPLE }} />}
            </button>
          )}

          {/* MEMORIES ACTIVE pill */}
          <span className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-600">
            <Brain size={10} />
            MEMORIES ACTIVE
          </span>

          {/* Close session */}
          {!isClosed && onCloseSession && (
            <button
              onClick={onCloseSession}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50"
            >
              <X size={12} />
              Close Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
