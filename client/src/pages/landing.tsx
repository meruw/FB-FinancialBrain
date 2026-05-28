import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, Rocket, X } from 'lucide-react';
import AsciiMotionAnimation from '@/components/ascii-motion-animation';
import './landing.css';

// ── shared helpers ─────────────────────────────────────────────────────────────
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

type Rgb = [number, number, number];
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpRgb(a: Rgb, b: Rgb, t: number): string {
  return `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(
    lerp(a[1], b[1], t),
  )}, ${Math.round(lerp(a[2], b[2], t))})`;
}

// ── animated background canvas ─────────────────────────────────────────────────
type Particle = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  color: string;
  vx: number;
  vy: number;
  phase: number;
};

const PARTICLE_COLORS = ['#8E31B5', '#5793EC', '#ffffff'];
// Deep-purple palette — kept dark on purpose. The cycle breathes subtly
// between these without ever reaching a lighter / bluer tone.
const DARK_1: Rgb = [ 6,  3, 22]; // #060316 — deepest
const DARK_2: Rgb = [14,  6, 42]; // #0E062A
const DARK_3: Rgb = [22,  8, 58]; // #16083A — top of the cycle
const LINK_DIST   = 140;
const CURSOR_DIST = 200;
const MAX_LINKS   = 22;

const PARTICLE_COUNT = 80;
const LINK_DIST_SQ   = LINK_DIST * LINK_DIST;
const CURSOR_DIST_SQ = CURSOR_DIST * CURSOR_DIST;

type LinkCandidate = { d: number; ax: number; ay: number; bx: number; by: number };

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const coarse  = isCoarsePointer();

    // CSS-pixel canvas dimensions — kept current via ResizeObserver.
    let width  = 0;
    let height = 0;
    const particles: Particle[] = [];
    // Reused per frame — avoids per-frame allocations in the pair loop.
    const candidates: LinkCandidate[] = [];

    // Pointer in CSS-pixel (canvas-local) coords; null when offscreen.
    let pointer: { x: number; y: number } | null = null;

    function seed() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length] ?? '#ffffff';
        particles.push({
          x:          Math.random() * width,
          y:          Math.random() * height,
          r:          1 + Math.random() * 2,
          baseAlpha:  0.2 + Math.random() * 0.5,
          color,
          vx:         (Math.random() - 0.5) * 0.6,
          vy:         (Math.random() - 0.5) * 0.6,
          phase:      Math.random() * Math.PI * 2,
        });
      }
    }

    // Resize-resilient sizing: uses the canvas's actual CSS rect so it's
    // correct under any zoom level or window resize, and rescales particles
    // proportionally instead of re-randomizing them (avoids visible jumps).
    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (w === width && h === height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particles.length === 0) {
        width = w; height = h;
        seed();
        return;
      }
      // Rescale existing particles into the new viewport.
      const sx = w / width;
      const sy = h / height;
      for (const p of particles) { p.x *= sx; p.y *= sy; }
      width = w; height = h;
    }

    function paintBackground(t: number) {
      if (!ctx) return;
      const top    = lerpRgb(DARK_1, DARK_2, t);
      const bottom = lerpRgb(DARK_2, DARK_3, t);
      const grad   = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    function drawLinks(offX: number, offY: number) {
      if (!ctx) return;
      candidates.length = 0;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        if (!a) continue;
        const ax = a.x + offX;
        const ay = a.y + offY;
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          if (!b) continue;
          const bx = b.x + offX;
          const by = b.y + offY;
          const dx = ax - bx;
          const dy = ay - by;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST_SQ) {
            candidates.push({ d: d2, ax, ay, bx, by });
          }
        }
      }
      candidates.sort((p, q) => p.d - q.d);
      const limit = Math.min(MAX_LINKS, candidates.length);
      ctx.lineWidth = 1;
      for (let k = 0; k < limit; k += 1) {
        const c = candidates[k];
        if (!c) continue;
        const d = Math.sqrt(c.d);
        const opacity = (1 - d / LINK_DIST) * 0.4;
        ctx.strokeStyle = `rgba(142, 49, 181, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(c.ax, c.ay);
        ctx.lineTo(c.bx, c.by);
        ctx.stroke();
      }
    }

    function drawCursorLinks(offX: number, offY: number) {
      if (!ctx || !pointer || coarse) return;
      const mx = pointer.x;
      const my = pointer.y;
      ctx.lineWidth = 1.1;
      for (const p of particles) {
        const px = p.x + offX;
        const py = p.y + offY;
        const dx = px - mx;
        const dy = py - my;
        const d2 = dx * dx + dy * dy;
        if (d2 >= CURSOR_DIST_SQ) continue;
        const d = Math.sqrt(d2);
        const opacity = (1 - d / CURSOR_DIST) * 0.6;
        const grad = ctx.createLinearGradient(mx, my, px, py);
        grad.addColorStop(0, `rgba(142, 49, 181, ${opacity})`);
        grad.addColorStop(1, `rgba(87, 147, 236, ${opacity * 0.7})`);
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }

    function drawParticles(elapsed: number, offX: number, offY: number) {
      if (!ctx) return;
      for (const p of particles) {
        const alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(elapsed * 1.3 + p.phase));
        ctx.globalAlpha = alpha > 0 ? alpha : 0;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x + offX, p.y + offY, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function step(elapsed: number) {
      const offX = pointer && !reduced ? (pointer.x - width  / 2) * 0.012 : 0;
      const offY = pointer && !reduced ? (pointer.y - height / 2) * 0.012 : 0;
      // Cycle clamped to [0.1, 0.55] — keeps the gradient predominantly deep purple.
      paintBackground(0.1 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 0.18)));
      drawLinks(offX, offY);
      drawCursorLinks(offX, offY);
      drawParticles(elapsed, offX, offY);
    }

    // ── Initial sizing + observers ───────────────────────────────────────────
    resize();

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onPointerLeave() { pointer = null; }

    // ResizeObserver catches zoom-induced size changes that `resize` does not.
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    window.addEventListener('resize', resize);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);

    let raf = 0;
    const start = performance.now();

    if (reduced) {
      for (const p of particles) { p.vx = 0; p.vy = 0; }
      step(0);
    } else {
      const loop = (now: number) => {
        const elapsed = (now - start) / 1000;
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10)         p.x = width  + 10;
          if (p.x > width  + 10) p.x = -10;
          if (p.y < -10)         p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }
        step(elapsed);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="fb-canvas" aria-hidden="true" />;
}

// ── custom cursor ───────────────────────────────────────────────────────────────
function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isCoarsePointer()) return;
    const el = cursorRef.current;
    if (!el) return;

    const reduced = prefersReducedMotion();
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: target.x, y: target.y };
    let visible = false;
    let hovering = false;
    let raf = 0;

    function place(x: number, y: number) {
      if (!el) return;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }

    function onMove(e: PointerEvent) {
      target.x = e.clientX;
      target.y = e.clientY;

      if (!visible) {
        visible = true;
        el?.classList.add('is-visible');
      }

      const overInteractive =
        e.target instanceof Element &&
        e.target.closest('button, a, input, textarea') !== null;
      if (overInteractive !== hovering) {
        hovering = overInteractive;
        el?.classList.toggle('is-hovering', hovering);
      }

      // Reduced motion: snap directly, no rAF smoothing.
      if (reduced) place(target.x, target.y);
    }

    window.addEventListener('pointermove', onMove);

    if (!reduced) {
      const loop = () => {
        pos.x += (target.x - pos.x) * 0.25;
        pos.y += (target.y - pos.y) * 0.25;
        place(pos.x, pos.y);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <div ref={cursorRef} className="custom-cursor" aria-hidden="true" />;
}

// ── brand lockup ────────────────────────────────────────────────────────────────
function BrandLockup({ onLogoClick }: { onLogoClick?: () => void }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <button type="button" className="fb-brand" onClick={() => onLogoClick?.()}>
      {logoFailed ? (
        <span className="fb-brand-wordmark">fastbank</span>
      ) : (
        <img
          src="/assets/fastbank-logo-white.png"
          alt="FastBank"
          className="fb-brand-logo"
          onError={() => setLogoFailed(true)}
        />
      )}
      <span className="fb-brand-memories">memories</span>
    </button>
  );
}

// ── top navigation ──────────────────────────────────────────────────────────────
type NavProps = {
  onStart?: () => void;
  onLogin?: () => void;
  onLogoClick?: () => void;
};

const NAV_LINKS: { label: string; chevron: boolean; active: boolean }[] = [
  { label: 'Home', chevron: false, active: true },
  { label: 'Reconciliation', chevron: true, active: false },
  { label: 'Intelligence', chevron: true, active: false },
  { label: 'Our Team', chevron: false, active: false },
];

function TopNav({ onStart, onLogin, onLogoClick }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fb-nav fb-reveal" style={{ animationDelay: '0ms' }}>
      <BrandLockup onLogoClick={onLogoClick} />

      <div className="fb-nav-pill liquid-glass">
        {NAV_LINKS.map((link) => (
          <button
            key={link.label}
            type="button"
            className={`fb-nav-link${link.active ? ' is-active' : ''}`}
          >
            {link.label}
            {link.chevron && <ChevronDown size={13} strokeWidth={2} />}
          </button>
        ))}
      </div>

      <div className="fb-cta-group">
        <button
          type="button"
          className="fb-btn fb-btn--glass liquid-glass"
          onClick={() => onLogin?.()}
        >
          Log in
        </button>
        <button type="button" className="fb-btn fb-btn--gradient" onClick={() => onStart?.()}>
          Start Demo
        </button>
      </div>

      <button
        type="button"
        className="fb-hamburger liquid-glass"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {menuOpen && (
        <div className="fb-mobile-menu liquid-glass">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              className={`fb-nav-link${link.active ? ' is-active' : ''}`}
            >
              {link.label}
              {link.chevron && <ChevronDown size={13} strokeWidth={2} />}
            </button>
          ))}
          <div className="fb-mobile-divider" />
          <button
            type="button"
            className="fb-btn fb-btn--glass liquid-glass"
            onClick={() => onLogin?.()}
          >
            Log in
          </button>
          <button type="button" className="fb-btn fb-btn--gradient" onClick={() => onStart?.()}>
            Start Demo
          </button>
        </div>
      )}
    </nav>
  );
}

// ── hero ────────────────────────────────────────────────────────────────────────
type HeroProps = {
  onStart?: () => void;
  onHow?: () => void;
};

function Hero({ onStart, onHow }: HeroProps) {
  return (
    <section className="fb-hero">
      <h1 className="fb-hero-title fb-reveal" style={{ animationDelay: '120ms' }}>
        Your books.
        <br />
        <span className="fb-hero-grad">Smarter every month.</span>
      </h1>

      <p className="fb-lede fb-reveal" style={{ animationDelay: '180ms' }}>
        Every month your accountant starts from zero — no memory of last month, no knowledge of
        your vendors, no sense of what&apos;s about to go wrong. FastBank Memories changes that. The
        more you use it, the smarter it gets about your company.
      </p>

      <div className="fb-cta-row fb-reveal" style={{ animationDelay: '240ms' }}>
        <button
          type="button"
          className="fb-btn fb-btn--gradient fb-btn--lg"
          onClick={() => onStart?.()}
        >
          <Rocket size={16} strokeWidth={2} />
          Start Demo
        </button>
        <button
          type="button"
          className="fb-btn fb-btn--glass fb-btn--lg liquid-glass"
          onClick={() => onHow?.()}
        >
          See How It Works
        </button>
      </div>
    </section>
  );
}

// ── page ────────────────────────────────────────────────────────────────────────
type LandingProps = {
  onStart?: () => void;
  onHow?: () => void;
  onLogoClick?: () => void;
};

// The ASCII canvas is rendered at a fixed 2160×1800 (its authored size).
// We scale it via inline CSS transform so it always fits inside the viewport
// without re-rendering — costs zero CPU per resize.
const ASCII_NATIVE_W = 2160;
const ASCII_NATIVE_H = 1800;

function useAsciiTransform(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function update() {
      if (!el) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Fit within 88% of viewport, never larger than native.
      const s = Math.min(1, (vw * 0.88) / ASCII_NATIVE_W, (vh * 0.88) / ASCII_NATIVE_H);
      el.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);
}

export default function Landing({ onStart, onHow, onLogoClick }: LandingProps) {
  const asciiRef = useRef<HTMLDivElement | null>(null);
  useAsciiTransform(asciiRef);

  return (
    <div className="landing">
      <AnimatedBackground />
      <div className="fb-vignette" />

      <TopNav onStart={onStart} onLogin={onStart} onLogoClick={onLogoClick} />

      <div
        ref={asciiRef}
        className="landing-ascii"
        aria-hidden="true"
        style={{ transform: 'translate(-50%, -50%) scale(0.5)', transformOrigin: 'center center' }}
      >
        <AsciiMotionAnimation showControls={false} autoPlay />
      </div>

      <Hero onStart={onStart} onHow={onHow} />

      <div className="fb-hairline" />
      <CustomCursor />
    </div>
  );
}
