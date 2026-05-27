import { useEffect, useId, useRef, useState } from 'react';
import './Gauge.css';

// Newton-Raphson cubic-bezier solver — mirrors the CSS transition timing function
function makeCubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const ax = 1 - 3 * p2x + 3 * p1x;
  const bx = 3 * p2x - 6 * p1x;
  const cxc = 3 * p1x;
  const ay = 1 - 3 * p2y + 3 * p1y;
  const byc = 3 * p2y - 6 * p1y;
  const cyc = 3 * p1y;

  const sampleX  = (t: number) => ((ax  * t + bx)  * t + cxc) * t;
  const sampleY  = (t: number) => ((ay  * t + byc) * t + cyc) * t;
  const sampleDx = (t: number) => (3 * ax * t + 2 * bx) * t + cxc;

  function tForX(x: number): number {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const delta = sampleX(t) - x;
      if (Math.abs(delta) < 1e-7) break;
      const slope = sampleDx(t);
      if (Math.abs(slope) < 1e-7) break;
      t -= delta / slope;
    }
    return t;
  }

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(tForX(x));
  };
}

const cubicEase = makeCubicBezier(0.45, 0.05, 0.2, 1);
const ANIM_MS = 1400; // must match .gauge-fill transition duration

interface GaugeProps {
  value: number;    // 0–100
  size?: number;
  title?: string;
}

// Demo: <Gauge value={72} size={320} />
export function Gauge({ value, size = 320, title = 'CLOSE PROBABILITY' }: GaugeProps) {
  const uid     = useId().replace(/:/g, '');
  const gradId  = `gg-${uid}`;
  const glowId  = `gl-${uid}`;

  const R       = size / 2 - 32;           // 128 px at size=320
  const mid     = size / 2;
  const circ    = 2 * Math.PI * R;
  const arcLen  = circ * 0.78;
  const dArray  = `${arcLen} ${circ}`;

  // animVal drives the CSS transition on stroke-dashoffset
  const [animVal, setAnimVal] = useState(0);
  // dispNum is the rAF-driven counter in the center label
  const [dispNum, setDispNum] = useState(0);

  const rafRef = useRef(0);
  const t0Ref  = useRef(0);

  useEffect(() => {
    setAnimVal(0);
    setDispNum(0);

    const timer = window.setTimeout(() => {
      // Trigger the CSS arc transition
      setAnimVal(value);

      // Parallel rAF loop counts the number up with the same easing
      t0Ref.current = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0Ref.current) / ANIM_MS, 1);
        setDispNum(Math.round(cubicEase(p) * value));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, 240);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  // dashoffset 0 = full arc, arcLen = empty arc
  const dashOffset = arcLen * (1 - animVal / 100);

  return (
    <div className="gauge-wrap" style={{ width: size, height: size }}>
      <svg
        className="gauge-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          {/* Arc gradient — userSpaceOnUse so it survives the <g> rotation */}
          <linearGradient
            id={gradId}
            gradientUnits="userSpaceOnUse"
            x1={size * 0.08}
            y1={mid}
            x2={size * 0.92}
            y2={mid}
          >
            <stop offset="0%"   stopColor="#5793EC" />
            <stop offset="100%" stopColor="#8E31B5" />
          </linearGradient>

          {/* Radial glow that fills the lens behind the arc */}
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="55%"  stopColor="rgba(142,49,181,0)"    />
            <stop offset="100%" stopColor="rgba(142,49,181,0.08)" />
          </radialGradient>
        </defs>

        {/* Track — full 78 % arc in muted grey */}
        <circle
          cx={mid} cy={mid} r={R}
          fill="none"
          stroke="#E8EEF6"
          strokeWidth={24}
          strokeDasharray={dArray}
          strokeLinecap="round"
          transform={`rotate(129.6, ${mid}, ${mid})`}
        />

        {/* Fill — CSS transition animates stroke-dashoffset */}
        <circle
          className="gauge-fill"
          cx={mid} cy={mid} r={R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={24}
          strokeDasharray={dArray}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(129.6, ${mid}, ${mid})`}
        />

        {/* Inner glow lens */}
        <circle
          cx={mid} cy={mid}
          r={R - 12}
          fill={`url(#${glowId})`}
        />
      </svg>

      <div className="gauge-label">
        <div className="gauge-value">
          <span className="gauge-number">{dispNum}</span>
          <span className="gauge-percent">%</span>
        </div>
        {title && <div className="gauge-title">{title}</div>}
      </div>
    </div>
  );
}
