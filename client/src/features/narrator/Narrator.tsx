import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  Cloud,
  Cpu,
  Download,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Typewriter } from '@/components/effects/Typewriter';
import { NerveCellsAnimation } from '@/components/effects/NerveCellsAnimation';
import { useNarrator } from './useNarrator';
import { PastClosingsModal } from './PastClosingsModal';
import { api } from '@/services/api';
import type { NarrativeInsight, Narrative } from '@/types/domain';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const PURPLE = '#8E31B5';

// ── Constants ─────────────────────────────────────────────────────────────────
const LOADING_TEXTS = [
  'Analyzing session data...',
  'Reviewing matched transactions...',
  'Composing audit narrative...',
  'Finalizing document...',
];

const CATEGORY_LABELS: Record<NarrativeInsight['category'], string> = {
  pattern: 'Patterns Identified',
  vendor:  'Vendor Activity',
  risk:    'Risk Review',
};

// Render in this order
const CATEGORY_ORDER: NarrativeInsight['category'][] = ['pattern', 'vendor', 'risk'];

const POP = { type: 'spring' as const, stiffness: 260, damping: 22, mass: 0.8 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupInsights(
  items: NarrativeInsight[],
): Partial<Record<NarrativeInsight['category'], string[]>> {
  const groups: Partial<Record<NarrativeInsight['category'], string[]>> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category]!.push(item.insight);
  }
  return groups;
}

function buildDocText(data: Narrative): string {
  const groups = groupInsights(data.learnedThisSession);
  const lines: string[] = [
    data.headline,
    '',
    data.narrative,
    '',
  ];
  for (const cat of CATEGORY_ORDER) {
    const insights = groups[cat];
    if (!insights?.length) continue;
    lines.push(CATEGORY_LABELS[cat].toUpperCase());
    for (const insight of insights) lines.push(`• ${insight}`);
    lines.push('');
  }
  if (data.stats.unmatched > 0) {
    lines.push('REQUIRES FOLLOW-UP');
    lines.push(`• ${data.stats.unmatched} transaction(s) remain unmatched — follow up with treasury before month-end.`);
    lines.push('');
  }
  lines.push('---');
  lines.push(
    `Next close projection: ${Math.round(data.nextCloseProbability * 100)}% (+${data.nextCloseDelta}%)`,
  );
  lines.push(`${data.sessionsToTarget} sessions until 95%+ close rate`);
  return lines.join('\n');
}

// ── Component ─────────────────────────────────────────────────────────────────
export function Narrator() {
  const { data, loading, generated, generate } = useNarrator();

  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [sectionsVisible, setSectionsVisible] = useState(false);
  const [actionsVisible, setActionsVisible]   = useState(false);
  const [copied, setCopied]                   = useState(false);
  const [pdfLoading, setPdfLoading]           = useState(false);
  const [pdfError, setPdfError]               = useState<string | null>(null);
  // SAS URL returned in the X-Blob-Url header after a successful PDF export.
  // Null when Azure isn't configured or the upload failed silently.
  const [pdfBlobUrl, setPdfBlobUrl]           = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen]         = useState(false);
  // True for ~700ms after `loading` flips false — lets the nerve animation
  // play its completion snap before the narrative content takes over.
  const [completing, setCompleting]           = useState(false);

  const fallbackRef    = useRef<number>(0);
  const actionsRef     = useRef<number>(0);
  const copyTimerRef   = useRef<number>(0);
  const completeRef    = useRef<number>(0);
  const wasLoadingRef  = useRef<boolean>(false);

  // Reset animation gates whenever generation fires
  useEffect(() => {
    if (!generated || !data) return;
    setSectionsVisible(false);
    setActionsVisible(false);

    // 6s fallback — sections appear even if Typewriter never fires onDone
    fallbackRef.current = window.setTimeout(() => setSectionsVisible(true), 6000);
    return () => clearTimeout(fallbackRef.current);
  }, [generated, data]);

  // Action buttons appear 600ms after sections
  useEffect(() => {
    if (!sectionsVisible) return;
    actionsRef.current = window.setTimeout(() => setActionsVisible(true), 600);
    return () => clearTimeout(actionsRef.current);
  }, [sectionsVisible]);

  // Bridge loading → generated with a brief "network fills completely" beat.
  // The nerve animation receives loading=false during this window so every
  // dendrite races to 100%; once the beat ends, the narrative content renders.
  useEffect(() => {
    if (loading) {
      wasLoadingRef.current = true;
      setCompleting(false);
      return;
    }
    if (wasLoadingRef.current && data) {
      wasLoadingRef.current = false;
      setCompleting(true);
      completeRef.current = window.setTimeout(() => setCompleting(false), 700);
      return () => clearTimeout(completeRef.current);
    }
  }, [loading, data]);

  // Cycle loading text while API call is in flight
  useEffect(() => {
    if (!loading) { setLoadingTextIdx(0); return; }
    const id = setInterval(
      () => setLoadingTextIdx((i) => (i + 1) % LOADING_TEXTS.length),
      2000,
    );
    return () => clearInterval(id);
  }, [loading]);

  // Cleanup copy timer on unmount
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  function handleNarrativeDone() {
    clearTimeout(fallbackRef.current);
    setSectionsVisible(true);
  }

  async function handleCopy() {
    if (!data) return;
    await navigator.clipboard.writeText(buildDocText(data)).catch(() => undefined);
    setCopied(true);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!data) return;
    const blob = new Blob([buildDocText(data)], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'recon-report-may-2026.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    if (!data || pdfLoading) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const { blob, blobUrl } = await api.exportPdf(data);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'recon-report-may-2026.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setPdfBlobUrl(blobUrl);
    } catch (err) {
      setPdfError(String(err));
    } finally {
      setPdfLoading(false);
    }
  }

  // ── 1. Initial state ──
  if (!loading && !generated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 90, damping: 13 }}
        >
          <BrainCircuit size={52} style={{ color: PURPLE }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, ...POP }}
          className="flex flex-col items-center gap-2"
        >
          <h2 className="text-xl font-semibold text-gray-900">Session Complete</h2>
          <p className="max-w-xs text-sm text-gray-400">
            The Financial Brain is ready to document this session.
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.38, ...POP }}
          whileHover={{ scale: 1.04, boxShadow: `0 10px 28px rgba(142,49,181,0.35)`, transition: { duration: 0.18 } }}
          whileTap={{ scale: 0.96 }}
          onClick={generate}
          className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: PURPLE }}
        >
          Generate Audit Document
          <ArrowRight size={16} />
        </motion.button>
      </div>
    );
  }

  // ── 2. Loading state (and completion beat) ──
  if (loading || completing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
        <NerveCellsAnimation loading={loading} />
        <AnimatePresence mode="wait">
          <motion.p
            key={completing ? 'complete' : loadingTextIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-[11px] uppercase tracking-[0.25em] text-gray-400"
          >
            {completing ? 'Audit ready' : LOADING_TEXTS[loadingTextIdx]}
          </motion.p>
        </AnimatePresence>
      </div>
    );
  }

  // ── 3. Generated state ──
  if (!data) return null;

  const groups       = groupInsights(data.learnedThisSession);
  const signOffReady = data.stats.unmatched <= 2;
  const remaining    = data.stats.unmatched > 0
    ? [`${data.stats.unmatched} transaction(s) remain unmatched — follow up with treasury before month-end close.`]
    : [];

  const learnedItems = data.learnedThisSession.slice(0, 3);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Accent bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="h-[2px] shrink-0 origin-left"
        style={{ backgroundColor: PURPLE }}
      />

      <div className="flex flex-col gap-5 p-5">

        {/* Document header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, ...POP }}
        >
          <h2 className="text-base font-semibold text-gray-900 leading-snug">{data.headline}</h2>
          <div className="mt-2 border-t border-slate-200" />
        </motion.div>

        {/* Narrative */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, ...POP }}
          className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Summary
          </p>
          <p className="text-sm leading-relaxed text-gray-700">
            <Typewriter
              text={data.narrative}
              speed={8}
              highlights={[/\$[\d,]+(?:\.\d+)?/, /\d{2}\/\d{2}\/\d{4}/, /\d+(?:\.\d+)?%/]}
              onDone={handleNarrativeDone}
            />
          </p>
        </motion.div>

        {/* Sections — staggered after narrative */}
        <AnimatePresence>
          {sectionsVisible && (
            <>
              {CATEGORY_ORDER.map((cat, i) => {
                const insights = groups[cat];
                if (!insights?.length) return null;
                return (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15, ...POP }}
                    className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <p
                      className="mb-2 text-[10px] font-medium uppercase tracking-wider"
                      style={{ color: PURPLE }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <ul className="space-y-1">
                      {insights.map((insight) => (
                        <li key={insight} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-green-500" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}

              {/* Sign-off badge */}
              {signOffReady && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: CATEGORY_ORDER.length * 0.15, ...POP }}
                  className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5"
                >
                  <CheckCircle2 size={15} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">Ready for Sign-off</span>
                </motion.div>
              )}

              {/* Remaining actions */}
              {remaining.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: CATEGORY_ORDER.length * 0.15 + 0.1, ...POP }}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                >
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-amber-600">
                    Requires Follow-up
                  </p>
                  <ul className="space-y-1">
                    {remaining.map((action) => (
                      <li key={action} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <AnimatePresence>
          {actionsVisible && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...POP }}
              className="flex flex-col gap-2"
            >
              <div className="flex gap-2">
                <button
                  onClick={() => { void handleCopy(); }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-slate-50"
                >
                  <Clipboard size={13} />
                  {copied ? 'Copied ✓' : 'Copy to Clipboard'}
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-slate-50"
                >
                  <Download size={13} />
                  Download .txt
                </button>
              </div>
              <button
                onClick={() => { void handleDownloadPdf(); }}
                disabled={pdfLoading}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/60 px-4 py-2 text-xs font-medium text-purple-700 transition-colors hover:border-purple-300 hover:bg-purple-50 disabled:cursor-wait disabled:opacity-70"
                style={{ color: pdfLoading ? undefined : PURPLE }}
              >
                {pdfLoading ? (
                  <>
                    <Spinner size={13} />
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <FileText size={13} />
                    Download closing PDF
                  </>
                )}
              </button>
              {pdfError && (
                <p className="text-[11px] text-red-500">PDF export failed. Try again.</p>
              )}
              {pdfBlobUrl && !pdfError && (
                <motion.a
                  href={pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="group inline-flex items-center justify-center gap-1.5 self-center text-[11px] font-medium text-purple-600 transition-colors hover:text-purple-700"
                >
                  <Cloud size={11} />
                  View in Azure
                  <ArrowUpRight size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </motion.a>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Brain updated footer */}
        <AnimatePresence>
          {actionsVisible && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, ...POP }}
              className="rounded-xl border border-purple-100 bg-purple-50 p-4"
            >
              <div className="mb-3 flex items-center gap-1.5">
                <Cpu size={13} style={{ color: PURPLE }} />
                <span
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: PURPLE }}
                >
                  Financial Brain updated
                </span>
              </div>

              <ul className="mb-4 space-y-1.5">
                {learnedItems.map((item) => (
                  <li key={item.insight} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-green-500" />
                    {item.insight}
                  </li>
                ))}
              </ul>

              <div className="border-t border-purple-200 pt-3">
                <p className="text-sm font-semibold text-gray-900">
                  Next close projection:{' '}
                  {Math.round(data.nextCloseProbability * 100)}%{' '}
                  <span style={{ color: PURPLE }}>
                    (+{data.nextCloseDelta}%)
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {data.sessionsToTarget} sessions until 95%+ close rate
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Archived closings link */}
        <AnimatePresence>
          {actionsVisible && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, ...POP }}
              onClick={() => setArchiveOpen(true)}
              className="group inline-flex items-center justify-center gap-1.5 self-center text-[11px] font-medium text-gray-400 transition-colors hover:text-purple-600"
            >
              <Archive size={11} />
              View archived closings
              <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          )}
        </AnimatePresence>

      </div>

      <PastClosingsModal open={archiveOpen} onClose={() => setArchiveOpen(false)} />
    </div>
  );
}
