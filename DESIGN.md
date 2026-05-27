# DESIGN.md

## Color palette
- Background: #0A0F1E
- Surface: #111827
- Accent purple: #8E31B5
- Text primary: #F9FAFB
- Text muted: #9CA3AF
- Success: #10B981
- Warning: #F59E0B
- Danger: #EF4444

## Typography
- Font: Inter
- Weights: 400 and 500 only. Never 600 or 700.
- Sentence case always. No ALL CAPS, no Title Case.

## Components
- Cards: bg-brain-surface, border border-slate-700, rounded-xl, p-4
- Badges: small, pill shape, colored by risk (red/amber/green)
- Gauges: SVG arc, purple fill, animated on mount with anime.js
- Buttons: outline style, hover bg-slate-800

## Animation rules
- Framer Motion: layout transitions, card entrance (fade + slide up)
- anime.js: SVG arc gauge tween only
- Lottie: Brain "thinking" state while AI call is loading
- Typewriter: Narrator output, ~25ms per character

## Do not
- No gradients
- No drop shadows
- No rounded corners on single-sided borders