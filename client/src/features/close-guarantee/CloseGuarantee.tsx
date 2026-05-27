import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { useSessionStore } from '@/store/session';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useCloseGuarantee } from './useCloseGuarantee';
import { briefMock } from './CloseGuarantee.mock';
import type { BriefBlocker, CloseGuaranteeProps } from './CloseGuarantee.types';

const SEVERITY_VARIANT: Record<BriefBlocker['severity'], 'danger' | 'warn' | 'ok'> = {
  high: 'danger',
  medium: 'warn',
  low: 'ok',
};

export function CloseGuarantee({ sessionId }: CloseGuaranteeProps) {
  const openSession = useSessionStore((s) => s.openSession);
  const { data, loading, error } = useCloseGuarantee(sessionId);

  // Fall back to mock on error so the demo never shows an empty screen
  const brief = data ?? (error !== null ? briefMock : null);

  const [gaugePct, setGaugePct] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [typing, setTyping] = useState(false);

  // Animate gauge + start typewriter once brief arrives
  useEffect(() => {
    if (!brief) return;

    const target = Math.round(brief.closeProbability * 100);

    // Framer Motion imperative animate: number from 0 to target over 1.5 s
    const gaugeAnimation = animate(0, target, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (v) => setGaugePct(Math.round(v)),
    });

    // Typewriter: one character every 30 ms via setInterval
    let i = 0;
    setDisplayedText('');
    setTyping(true);
    const timerId = setInterval(() => {
      i += 1;
      setDisplayedText(brief.brainInsight.slice(0, i));
      if (i >= brief.brainInsight.length) {
        clearInterval(timerId);
        setTyping(false);
      }
    }, 30);

    return () => {
      gaugeAnimation.stop();
      clearInterval(timerId);
    };
  }, [brief]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 px-4 py-8">
      {/* Gauge — top semicircle, fills left→top→right */}
      <div className="relative" style={{ width: 280, height: 160 }}>
        <RadialBarChart
          width={280}
          height={160}
          cx={140}
          cy={148}
          innerRadius={96}
          outerRadius={128}
          startAngle={180}
          endAngle={0}
          data={[{ value: gaugePct }]}
          barCategoryGap={0}
        >
          {/* Domain [0,100] ensures 72 fills 72% of the arc, not 100% */}
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            background={{ fill: '#1e293b' }}
            cornerRadius={8}
            fill="#7F77DD"
          />
        </RadialBarChart>

        {/* Number + label sit below the semicircle centre */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className="text-5xl font-bold tabular-nums text-white">{gaugePct}%</span>
          <span className="mt-0.5 text-[10px] text-brain-muted">
            {brief.closeProbabilityLabel}
          </span>
        </div>
      </div>

      {/* Typewriter brief */}
      <p className="min-h-[2.5rem] text-center text-sm italic text-brain-muted">
        {displayedText}
        {typing && <span className="animate-pulse">|</span>}
      </p>

      {/* Blocker list */}
      <div className="w-full space-y-2">
        {brief.blockers.map((blocker, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-md border border-slate-800 bg-brain-surface p-3"
          >
            <Badge label={blocker.severity} variant={SEVERITY_VARIANT[blocker.severity]} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-300">{blocker.description}</p>
              {blocker.vendor !== null && (
                <p className="mt-0.5 text-xs text-brain-muted">{blocker.vendor}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={openSession}
        className="mt-2 w-full rounded-lg bg-brain-accent px-6 py-3 text-sm font-semibold text-brain-bg transition-opacity hover:opacity-80 active:opacity-70"
      >
        Start Session →
      </button>
    </div>
  );
}
