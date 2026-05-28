import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { BankTransaction } from '@/types/domain';

export interface TransactionTableProps {
  title: string;
  transactions: BankTransaction[];
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  matchedIds: string[];
  unmatchedIds: string[];
  showReference?: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function formatAmount(amount: number): string {
  const prefix = amount >= 0 ? '+' : '';
  return `${prefix}${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
}


// ── animation variants ────────────────────────────────────────────────────────

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const row: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

// ── grid column templates ─────────────────────────────────────────────────────
// icon | date | description | [reference |] type | amount
const COLS_WITH_REF    = 'grid-cols-[20px_88px_1fr_132px_90px_128px]';
const COLS_WITHOUT_REF = 'grid-cols-[20px_88px_1fr_90px_128px]';
const CELL = 'flex items-center px-3 py-3';

// ── component ─────────────────────────────────────────────────────────────────

export function TransactionTable({
  title,
  transactions,
  onSelect,
  selectedId,
  matchedIds,
  unmatchedIds,
  showReference = true,
}: TransactionTableProps) {
  const unmatchedCount = transactions.filter((t) => unmatchedIds.includes(t.id)).length;
  const COLS = showReference ? COLS_WITH_REF : COLS_WITHOUT_REF;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

      {/* ── section header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          {title}
        </span>
        <span className="text-xs text-slate-400">
          {transactions.length} entries · {unmatchedCount} unmatched
        </span>
      </div>

      {/* ── column headers ── */}
      <div className={`grid ${COLS} border-b border-slate-100 bg-slate-50/70`}>
        <div className="px-3 py-2.5" />
        {(['Date', 'Description', ...(showReference ? ['Reference'] : []), 'Type'] as const).map((h) => (
          <div
            key={h}
            className="px-3 py-2.5 text-[10.5px] font-medium uppercase tracking-wider text-slate-400"
          >
            {h}
          </div>
        ))}
        <div className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
          Amount
        </div>
      </div>

      {/* ── rows ── */}
      <motion.div variants={container} initial="hidden" animate="visible">
        {transactions.map((txn) => {
          const isMatched   = matchedIds.includes(txn.id);
          const isUnmatched = unmatchedIds.includes(txn.id);
          const isSelected  = txn.id === selectedId;
          const isPositive  = txn.amount >= 0;

          const bgClass = isSelected
            ? 'bg-violet-50/60'
            : isUnmatched
            ? 'bg-red-50/50'
            : '';

          const hoverClass = isSelected
            ? 'hover:bg-violet-100/50'
            : isUnmatched
            ? 'hover:bg-red-50/80'
            : 'hover:bg-slate-50/80';

          const mutedText  = isMatched && !isSelected ? 'text-slate-400' : 'text-slate-700';
          const mutedSmall = isMatched && !isSelected ? 'text-slate-400' : 'text-slate-500';

          return (
            <motion.div
              key={txn.id}
              variants={row}
              className={`relative grid ${COLS} cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${bgClass} ${hoverClass}`}
              onClick={() => onSelect(isSelected ? null : txn.id)}
            >
              {/* Left accent bar — only rendered for the selected row */}
              {isSelected && (
                <div className="absolute inset-y-0 left-0 w-[3px] rounded-r-sm bg-violet-600" />
              )}

              {/* Status icon */}
              <div className={`${CELL} pl-3`}>
                {isMatched   && <CheckCircle2 size={14} className="text-green-500" strokeWidth={2.5} />}
                {isUnmatched && <XCircle      size={14} className="text-red-500"   strokeWidth={2.5} />}
              </div>

              {/* Date */}
              <div className={`${CELL} text-sm ${mutedText}`}>
                {formatDate(txn.date)}
              </div>

              {/* Description */}
              <div className={`${CELL} min-w-0 text-sm ${mutedText}`}>
                <span className="truncate">{txn.description}</span>
              </div>

              {/* Reference — hidden for SAP entries */}
              {showReference && (
                <div className={`${CELL} font-mono text-xs ${mutedSmall}`}>
                  {txn.reference}
                </div>
              )}

              {/* Type badge */}
              <div className={CELL}>
                <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                  {txn.type}
                </span>
              </div>

              {/* Amount */}
              <div
                className={`${CELL} justify-end pr-4 text-sm font-medium tabular-nums ${
                  isPositive ? 'text-emerald-600' : mutedText
                }`}
              >
                {formatAmount(txn.amount)}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

    </div>
  );
}
