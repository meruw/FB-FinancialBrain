import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { useSessionStore } from '@/store/session';
import { useRiskFirewall } from './useRiskFirewall';
import type { RiskAssessment } from '@/types/domain';

// ── Severity config ────────────────────────────────────────────────────────────
type VisibleLevel = 'critical' | 'high' | 'medium';

const LEVEL_STYLE: Record<VisibleLevel, {
  bg: string;
  border: string;
  iconClass: string;
  Icon: typeof ShieldAlert;
}> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconClass: 'text-red-500',
    Icon: ShieldAlert,
  },
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconClass: 'text-red-500',
    Icon: ShieldAlert,
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconClass: 'text-amber-500',
    Icon: AlertTriangle,
  },
};

function isVisible(level: RiskAssessment['riskLevel']): level is VisibleLevel {
  return level === 'critical' || level === 'high' || level === 'medium';
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RiskFirewall() {
  const selectedId       = useSessionStore((s) => s.selectedTransactionId);
  const { data }         = useRiskFirewall();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed whenever the selected transaction changes
  useEffect(() => {
    setDismissed(false);
  }, [selectedId]);

  const visible = data !== null && isVisible(data.riskLevel) && !dismissed;
  const style   = data && isVisible(data.riskLevel) ? LEVEL_STYLE[data.riskLevel] : null;

  return (
    <AnimatePresence>
      {visible && style && data && (
        <motion.div
          key={data.transactionId}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${style.bg} ${style.border}`}
        >
          {/* Icon */}
          <style.Icon size={18} className={`shrink-0 ${style.iconClass}`} />

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-700">{data.riskLabel}</p>
            {data.brainBasis && (
              <p className="mt-0.5 text-xs text-slate-500">{data.brainBasis}</p>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
