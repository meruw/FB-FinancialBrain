import { motion } from 'framer-motion';
import { CheckCircle2, SkipForward, RefreshCw, Loader2, Brain } from 'lucide-react';
import type { AdvisorStep, AdvisorActionType } from '@/types/domain';

const PURPLE = '#8E31B5';

const POP = { type: 'spring' as const, stiffness: 260, damping: 22, mass: 0.8 };

const ACTION_LABEL: Record<AdvisorActionType, string> = {
  release_match:  'Release Match',
  mark_fee:       'Mark as Fee',
  manual_match:   'Manual Match',
  escalate:       'Escalate',
  flag_duplicate: 'Flag as Duplicate',
};

// Parse `<em>…</em>` in text into styled React elements.
function parseEm(text: string): React.ReactNode[] {
  const parts = text.split(/(<em>[\s\S]*?<\/em>)/g);
  return parts.map((part, i) => {
    const match = /^<em>([\s\S]*?)<\/em>$/.exec(part);
    if (match) {
      return (
        <em key={i} className="not-italic font-semibold" style={{ color: PURPLE }}>
          {match[1]}
        </em>
      );
    }
    return part;
  });
}

export interface RecommendationCardProps {
  action: string;
  actionType: AdvisorActionType;
  steps: AdvisorStep[];
  risk: 'critical' | 'high' | 'medium' | 'low';
  confidenceScore: number;
  brainBasis?: string;
  onAccept?: () => void;
  onSkip?: () => void;
  accepting?: boolean;
}

export function RecommendationCard({
  action,
  actionType,
  steps,
  confidenceScore,
  brainBasis,
  onAccept,
  onSkip,
  accepting = false,
}: RecommendationCardProps) {
  const confPct = Math.round(confidenceScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={POP}
      className="rounded-xl border border-purple-200 bg-purple-50 p-4"
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-1.5">
        <Brain size={12} style={{ color: PURPLE }} />
        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: PURPLE }}>
          Brain Recommendation · {ACTION_LABEL[actionType]}
        </p>
        <span className="ml-auto text-[10px] font-medium tabular-nums text-gray-400">
          {confPct}% confidence
        </span>
      </div>

      {/* Action text with <em> auto-styling */}
      <p className="recommendation-text mb-3 text-sm leading-relaxed text-gray-700">
        {parseEm(action)}
      </p>

      {/* Steps */}
      {steps.length > 0 && (
        <ol className="mb-3 space-y-1.5">
          {steps.map((step) => (
            <li key={step.order} className="flex items-start gap-2 text-[12px] text-gray-600">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: PURPLE }}
              >
                {step.order}
              </span>
              {step.instruction}
            </li>
          ))}
        </ol>
      )}

      {/* Brain basis */}
      {brainBasis && (
        <p className="mb-3 text-[11px] text-gray-400">{brainBasis}</p>
      )}

      {/* Confidence bar */}
      <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-purple-200">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${confPct}%`, backgroundColor: PURPLE }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          disabled={accepting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: PURPLE }}
        >
          {accepting
            ? <Loader2 size={12} className="animate-spin" />
            : <CheckCircle2 size={12} />
          }
          {accepting ? 'Applying…' : 'Accept'}
        </button>

        <button
          onClick={onSkip}
          disabled={accepting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <SkipForward size={12} />
          Skip
        </button>

        <button
          disabled={accepting}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
          title="Alternatives"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </motion.div>
  );
}
