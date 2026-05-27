# DESIGN.md

> Source of truth for the FastBank Financial Brain visual system.
> Read this before writing any component or styling code.
> These are the patterns already in use — copy them, don't reinvent them.

---

## Color palette

### Brand
| Token | Value | Where |
|---|---|---|
| Purple | `#8E31B5` | Accent bars, badges, buttons, highlights, TRACE header |
| Blue | `#5793EC` | Gradient pair with purple (gauge, top bar) |

### Backgrounds
| Class / value | Where |
|---|---|
| `bg-[#EDF2FA]` | Page background — briefing and working layout |
| `bg-white` | Cards, table rows, right-rail panels |
| `bg-slate-50/70` | Table column header band |

### Text
| Class | When |
|---|---|
| `text-gray-900` | Headings |
| `text-gray-700` | Body copy, card prose |
| `text-gray-400` | Sub-labels, muted info, section headers (uppercase) |
| `text-purple-600` | Inline brand labels |
| `text-emerald-600` | Positive / credit amounts |

### Status
| Semantic | Background | Text / dot |
|---|---|---|
| matched / ok | — | `text-green-500`, `bg-green-500` |
| unmatched row | `bg-red-50/50` | `text-red-500`, `bg-red-500` |
| warning | `bg-amber-50` | `text-amber-500`, `bg-amber-400` |
| selected row | `bg-violet-50/60` | left bar `bg-violet-600` |
| high confidence | — | `text-green-600`, `bg-green-500` |
| medium confidence | — | `text-amber-500`, `bg-amber-400` |
| low confidence | — | `text-red-500`, `bg-red-500` |

---

## Typography

- **Font**: Mulish (headings + gauges), Inter / system-ui (body)
- **Weights in use**: 400 (body), 500 (medium labels), 600 (`em.brand` highlights), 700 (gauge numbers, headings)
- **Case**: uppercase + `tracking-wider` for section labels only; sentence case everywhere else
- **Tabular nums**: always on currency and percentages (`tabular-nums`)

| Use | Size | Weight | Notes |
|---|---|---|---|
| Gauge number | 84px | 700 | Gradient text fill |
| H1 title | `text-5xl` | 700 | |
| Body / card prose | `text-sm` (14px) | 400 | `leading-relaxed` |
| Section label | `text-[10px]` | 500 | uppercase, `tracking-wider`, `text-gray-400` |
| Sub-label / meta | `text-[11px]` | 400 | `text-gray-400` |
| Badge chip | `text-[11px]` | 500 | `tracking-wide` |

---

## Component patterns

### Standard card
```
rounded-xl border border-slate-100 bg-white p-4 shadow-sm
```
Use for diagnosis, recommendation, confidence, and brain insight panels.

### Table container
```
overflow-hidden rounded-xl border border-slate-200 bg-white
```

### Section header inside table
```
border-b border-slate-200 px-4 py-2.5
text-[11px] font-semibold uppercase tracking-widest text-slate-500
```

### Selected-row accent bar
```
absolute inset-y-0 left-0 w-[3px] rounded-r-sm bg-violet-600
```

### Purple badge chip (e.g. "PRE-SESSION BRIEFING", transaction ID)
```
rounded-full border border-purple-200 bg-purple-50 px-3 py-1
text-[11px] font-medium tracking-wide text-purple-600
```

### Divider between left and right zones
```
w-px shrink-0 bg-slate-200
```

---

## Motion

### Spring preset — POP (card / row entrances)
```ts
const POP = { type: 'spring', stiffness: 260, damping: 20, mass: 0.8 };
```
Use with `initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}`.

### Gauge spring (scale-in from below)
```ts
{ type: 'spring', stiffness: 90, damping: 13 }
```
Pair with `initial={{ scale: 0.78, opacity: 0 }}`.

### Accent bar (top edge of briefing / TRACE panel)
```ts
initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
transition={{ duration: 0.5–0.7, ease: [0.22, 1, 0.36, 1] }}
className="origin-left"
```

### Stagger delays
- Blocker rows / TRACE steps: `delay: i * 0.12`
- Stats cards: `delay: 0.85 + i * 0.14`
- Row entrance in table: `staggerChildren: 0.05`

### Entrance delay ladder (briefing screen reference)
| Element | Delay |
|---|---|
| Badge chip | 0.12s |
| Title | 0.22s |
| Brain insight card | 0.34s |
| Gauge | 0.28s |
| Step indicator | 0.45s |
| Typewriter fires | 1.6s after brief loads |

---

## Special effects

### Typewriter
- Component: `<Typewriter text speed highlights onDone />`
- Speed: 12–14 ms/char
- Highlights: regex patterns → `<em class="brand">` (purple, weight 600)
- Cursor: 7px × 1em `#8E31B5`, blinks `steps(2)` at 1s

### Gauge fill
- SVG arc, `stroke-dashoffset` driven by CSS transition
- Transition: `1.4s cubic-bezier(0.45, 0.05, 0.2, 1)`
- Gradient: `linearGradient gradientUnits="userSpaceOnUse"` blue → purple

### Glass step indicator
```css
background: linear-gradient(160deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42));
backdrop-filter: blur(22px) saturate(190%) brightness(108%);
border: 1px solid rgba(255,255,255,0.88);
box-shadow: 0 8px 32px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.95);
```

---

## Do not

- No dark backgrounds (`#0A0F1E`, `bg-brain-bg`, `bg-brain-surface`) outside existing Tailwind config tokens — the app is fully light-themed
- No free-form gradients on text except the H1 title and gauge number
- No `drop-shadow` utility — use `shadow-sm` on cards only
- No inline `fetch()` — all API calls go through `client/src/services/api.ts`
- No `any` — use `unknown` and narrow, or define a type
