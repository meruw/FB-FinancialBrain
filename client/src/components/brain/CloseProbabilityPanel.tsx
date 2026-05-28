import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Gauge } from '@/features/close-guarantee/Gauge';
import { useDataStore } from '@/store/data';

const PURPLE = '#8E31B5';
const POP    = { type: 'spring' as const, stiffness: 260, damping: 22, mass: 0.8 };

export function CloseProbabilityPanel() {
  const cp      = useDataStore((s) => s.closeProbability);
  const initial = useDataStore((s) => s.initialCloseProbability);

  if (cp === null) return null;

  const pct   = Math.round(cp * 100);
  const delta = initial !== null ? Math.round((cp - initial) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, ...POP }}
      className="flex shrink-0 flex-col items-center gap-2 border-b border-slate-100 bg-white py-5"
    >
      <Gauge value={pct} size={180} title="CLOSE PROBABILITY" />

      {/* Delta chip — appears only after at least one resolve */}
      <AnimatePresence>
        {delta > 0 && (
          <motion.div
            key={delta}
            initial={{ opacity: 0, scale: 0.85, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={POP}
            className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1"
          >
            <TrendingUp size={11} style={{ color: PURPLE }} />
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: PURPLE }}>
              +{delta}% this session
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
