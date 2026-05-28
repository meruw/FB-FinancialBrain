import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useDataStore } from '@/store/data';

interface LoadingScreenProps {
  onComplete: () => void;
  sessionId: string;
  // Minimum time the constellation gets to draw before we dismiss, even if the
  // brief returns instantly. Keeps the moment feeling intentional.
  minDurationMs?: number;
  // Hard ceiling — never block the demo on a hanging request.
  maxDurationMs?: number;
}

const PURPLE = '#8E31B5';

// Constellation node — fixed positions look more intentional than fully random.
// Coordinates are in a 1000x680 viewBox; the SVG scales responsively.
const NODES: Array<{ x: number; y: number; r: number; ring?: boolean }> = [
  { x: 360, y: 80,  r: 4, ring: true },
  { x: 540, y: 150, r: 3 },
  { x: 670, y: 100, r: 4, ring: true },
  { x: 760, y: 200, r: 3 },
  { x: 470, y: 230, r: 4, ring: true },
  { x: 600, y: 250, r: 3 },
  { x: 420, y: 320, r: 3 },
  { x: 560, y: 340, r: 4 },
  { x: 720, y: 320, r: 3 },
  { x: 820, y: 270, r: 3 },
  { x: 380, y: 420, r: 4, ring: true },
  { x: 520, y: 450, r: 3 },
  { x: 650, y: 430, r: 3 },
  { x: 760, y: 470, r: 3 },
  { x: 880, y: 480, r: 4, ring: true },
  { x: 470, y: 540, r: 3 },
  { x: 610, y: 560, r: 3 },
  { x: 730, y: 580, r: 4 },
  { x: 560, y: 640, r: 4, ring: true },
  { x: 820, y: 620, r: 3, ring: true },
];

// Hand-picked edges between nearby nodes — connect-the-dots feel.
const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [3, 5],
  [4, 6], [5, 7], [7, 8], [3, 9], [8, 9],
  [6, 10], [10, 11], [7, 11], [11, 12], [12, 13], [13, 14], [8, 12],
  [10, 15], [15, 16], [11, 16], [16, 17], [13, 17],
  [15, 18], [17, 18], [14, 19], [17, 19],
];

const LOADING_MESSAGES = [
  'Recalling vendor profiles…',
  'Replaying close history…',
  'Aligning April patterns…',
  'Warming the Financial Brain…',
];

export default function LoadingScreen({
  onComplete,
  sessionId,
  minDurationMs = 2600,
  maxDurationMs = 9000,
}: LoadingScreenProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const brief        = useDataStore((s) => s.brief);
  const briefError   = useDataStore((s) => s.briefError);
  const loadBrief    = useDataStore((s) => s.loadBrief);
  const mountedAt    = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);

  // Kick off the brief fetch as soon as the loading screen mounts.
  useEffect(() => {
    void loadBrief(sessionId);
  }, [sessionId, loadBrief]);

  // Dismiss once the brief resolves (or errors) AND the constellation has had
  // the minimum time to draw. Whichever takes longer wins.
  const briefDone = brief !== null || briefError !== null;
  useEffect(() => {
    if (!briefDone) return;
    if (completedRef.current) return;
    const elapsed = Date.now() - mountedAt.current;
    const wait    = Math.max(0, minDurationMs - elapsed);
    const id = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    }, wait);
    return () => clearTimeout(id);
  }, [briefDone, minDurationMs, onComplete]);

  // Safety ceiling — don't strand the user if the API hangs.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    }, maxDurationMs);
    return () => clearTimeout(id);
  }, [maxDurationMs, onComplete]);

  useEffect(() => {
    const id = window.setInterval(
      () => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length),
      1100,
    );
    return () => clearInterval(id);
  }, []);

  // Stagger node/line reveal — memoized so re-renders don't reshuffle.
  const nodeDelays = useMemo(() => NODES.map((_, i) => 0.04 * i), []);
  const edgeDelays = useMemo(() => EDGES.map((_, i) => 0.05 * i + 0.2), []);

  return (
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden"
      style={{
        background:
          'linear-gradient(120deg, #EFE6F4 0%, #F0EAF6 25%, #E8EEF8 65%, #E2EAF6 100%)',
      }}
    >
      {/* Soft radial highlights to match the reference's lavender bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 18% 35%, rgba(142,49,181,0.18), transparent 60%), ' +
            'radial-gradient(ellipse 50% 50% at 85% 75%, rgba(87,147,236,0.14), transparent 65%)',
        }}
      />

      {/* Faint grid */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="ls-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(142,49,181,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ls-grid)" />
      </svg>

      {/* Constellation */}
      <svg
        viewBox="0 0 1000 680"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const na = NODES[a]!;
          const nb = NODES[b]!;
          return (
            <motion.line
              key={`e${i}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke="rgba(142,49,181,0.32)"
              strokeWidth={0.9}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: edgeDelays[i], duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((node, i) => (
          <g key={`n${i}`}>
            {node.ring && (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.r + 6}
                fill="none"
                stroke="rgba(142,49,181,0.35)"
                strokeWidth={1}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: nodeDelays[i] + 0.1, duration: 0.5 }}
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              />
            )}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={PURPLE}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.4, 1],
                opacity: [0, 1, 0.85],
              }}
              transition={{
                delay: nodeDelays[i],
                duration: 0.6,
                times: [0, 0.6, 1],
                ease: 'easeOut',
              }}
              style={{ transformOrigin: `${node.x}px ${node.y}px` }}
            />
          </g>
        ))}
      </svg>

      {/* Brand mark + status */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <div className="flex items-baseline gap-2 select-none">
          <span className="text-5xl font-extrabold tracking-tight" style={{ color: PURPLE }}>
            fast<span className="text-gray-900">bank</span>
          </span>
          <span className="text-3xl font-light tracking-tight text-gray-700">memories</span>
        </div>

        {/* Tiny breathing dot above status line */}
        <motion.div
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: PURPLE, boxShadow: `0 0 12px ${PURPLE}` }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.p
          key={msgIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs uppercase tracking-[0.25em] text-gray-500"
        >
          {LOADING_MESSAGES[msgIdx]}
        </motion.p>
      </motion.div>
    </div>
  );
}
