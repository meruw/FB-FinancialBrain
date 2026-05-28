import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, ArrowUpRight, Cloud, FileText, X } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '@/components/ui/Spinner';
import type { ClosingReport } from '@/types/domain';

const PURPLE = '#8E31B5';
const POP    = { type: 'spring' as const, stiffness: 260, damping: 22, mass: 0.8 };

interface PastClosingsModalProps {
  open: boolean;
  onClose: () => void;
}

// Parse the Azure blob name "SESSION-APR-2026/1748469859.pdf" into a friendly
// "April 2026" label. Falls back to the raw name if the shape is unexpected.
function prettifySessionLabel(blobName: string): string {
  const prefix = blobName.split('/')[0] ?? '';
  const match  = prefix.match(/^SESSION-([A-Z]{3,4})-(\d{4})$/);
  if (!match) return blobName;
  const months: Record<string, string> = {
    JAN: 'January', FEB: 'February', MAR: 'March',     APR: 'April',
    MAY: 'May',     JUN: 'June',     JUL: 'July',      AUG: 'August',
    SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December',
  };
  const month = months[match[1] ?? ''] ?? match[1];
  return `${month} ${match[2]} Close`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(d);
}

export function PastClosingsModal({ open, onClose }: PastClosingsModalProps) {
  const [reports, setReports] = useState<ClosingReport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Fetch lazily — only when the modal opens for the first time per session.
  useEffect(() => {
    if (!open || reports !== null) return;
    setLoading(true);
    setError(null);
    api.getReports()
      .then(setReports)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [open, reports]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="archive-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div
            key="archive-card"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={POP}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[min(640px,85vh)] w-[min(540px,92vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Archive size={15} style={{ color: PURPLE }} />
              <span className="text-sm font-semibold text-gray-800">Archived closings</span>
              <span className="ml-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                <Cloud size={9} className="-mt-0.5 mr-1 inline-block" />
                Azure
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto rounded-full p-1.5 text-gray-300 transition-colors hover:bg-slate-50 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {loading && (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <Spinner size={22} />
                  <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400">
                    Loading archive…
                  </p>
                </div>
              )}

              {!loading && reports !== null && reports.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                  <Cloud size={28} className="text-gray-300" />
                  <p className="text-sm text-gray-500">No archived closings yet.</p>
                  <p className="max-w-xs text-xs text-gray-400">
                    Each PDF you generate from this view is uploaded to Azure Blob Storage and listed here.
                  </p>
                </div>
              )}

              {!loading && reports !== null && reports.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {reports.map((report) => (
                    <li key={report.name}>
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50/70"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                          <FileText size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">
                            {prettifySessionLabel(report.name)}
                          </p>
                          <p className="truncate text-[11px] text-gray-400">
                            {formatTimestamp(report.lastModified)} · {formatBytes(report.sizeBytes)}
                          </p>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-purple-500"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {!loading && error !== null && reports === null && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                  <Cloud size={28} className="text-gray-300" />
                  <p className="text-sm text-gray-500">Couldn't reach the archive.</p>
                  <p className="max-w-xs text-xs text-gray-400">
                    The archive endpoint is unreachable. PDF downloads still work locally.
                  </p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
              <p className="text-[11px] text-gray-400">
                Each link is a time-limited SAS URL — opens the PDF in a new tab without login.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
