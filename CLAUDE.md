# CLAUDE.md

> Read this **before** writing or modifying code. This file is the architecture
> contract for FastBank Recon Intelligence. It is read by both humans and any
> AI coding assistant (Claude Code, Cursor, Copilot). When in doubt, follow this
> document over your instincts.

---

## 1. What we are building

A standalone web app that demonstrates an AI intelligence layer for Bank
Reconciliation. Four user-visible features sit on top of a single shared
context object called the **Financial Brain**.

The demo audience is **non-technical**. They will judge on what they SEE, not
on code quality. That said, we have two people for 2.5 days — a clean
architecture is the cheapest way to avoid debugging hell on Thursday.

## 2. Hard product rules

These are **non-negotiable** — they come from prior strategy work, not from
preference.

1. **The Financial Brain is the protagonist.** Every AI call receives the
   Brain as context. The judges should see the Brain "knowing things" before
   anyone touches a transaction. If a feature works without the Brain, you've
   built it wrong.
2. **All AI outputs are structured JSON.** Never render free-form text from
   Claude directly. Define a Zod schema first, then write the prompt to
   match it, then validate before rendering.
3. **Every AI endpoint has a fallback mock.** If the Claude call fails,
   times out, or returns invalid JSON, the endpoint returns the mock and
   the user sees nothing wrong. The live demo cannot break.
4. **`DEMO_MODE=true` is a kill switch.** When true, the server returns mocks
   for everything and never calls Claude. Use it during the live demo if
   the network is unreliable.
5. **No real connections.** No SAP, no Cosmos, no FastBank API. All data is
   in `data/*.json`. Be honest about this in the pitch.

## 3. Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | Vite + React 18 + TypeScript | Fast HMR, strict types |
| Styling | Tailwind CSS | Speed of pulido |
| Animation — transitions | Framer Motion `^11` | Brain entrance, layout shifts, typewriter |
| Animation — SVG gauges | anime.js `^4` | Arc stroke-dashoffset tweens only |
| Animation — Lottie | `@lottiefiles/dotlottie-react` | Brain "thinking" state in right rail |
| Charts | Recharts | RadialBarChart works as a gauge |
| Icons | lucide-react | Consistent, small |
| State | Zustand | Tiny, slice-based. No Redux. |
| Backend | Node + Express + TypeScript + tsx | Minimal, familiar |
| AI SDK | `@anthropic-ai/sdk` | Official |
| Validation | Zod | Same lib on both sides of the wire |

**Models** (current as of May 2026 — do not regress to `claude-sonnet-4`,
that one is retired):

- Default: `claude-sonnet-4-6`
- Narrator (longer prose): optional override to `claude-opus-4-7`
- Fallback if a feature feels slow: `claude-haiku-4-5-20251001`

Set via `CLAUDE_MODEL` and `CLAUDE_MODEL_NARRATOR` in `.env`.

## 4. Repo layout

```
client/                Vite + React frontend
  src/
    components/
      brain/             Brain panel, gauges, learning indicator
      reconciliation/    Tables, transaction rows, session header
      ui/                Card.tsx, Badge.tsx, Spinner.tsx (built — use these, don't re-create)
      effects/           Typewriter, count-up, animated gauge (not yet built)
    features/            ONE FOLDER PER AI FEATURE - vertical slice
      close-guarantee/
      match-debugger/
      risk-firewall/
      narrator/
    services/api.ts      The ONLY place fetch() is called
    store/               Zustand slices
    types/domain.ts      Shared reconciliation types
    hooks/               Generic hooks
    utils/               Pure helpers
    styles/index.css     Tailwind entry

server/                Express backend
  src/
    index.ts             App boot + route mounting
    env.ts               Validated env (fails fast)
    routes/              One file per feature + data router
      data.ts            GET /api/data/* — serves all JSON files to the client
      brief.ts           POST /api/brief
      debug.ts           POST /api/debug
      risk.ts            POST /api/risk
      narrator.ts        POST /api/narrate
    services/
      claude.ts          The ONLY place the Anthropic SDK is touched
      brain.ts           Loads + caches financial-brain.json as a prompt string
      data.ts            Loads + caches all other data/*.json files
    prompts/             Pure functions: input -> { system, user }
    schemas/             Zod schemas - the JSON contract per feature
    mocks/               Fallback responses per feature
    utils/
      logger.ts          Tiny structured logger
      validate.ts        parseBody() — DRY Zod input validation for routes
      matching.ts        findSapCandidates() — date+amount window search

data/                  Mock data (the Brain + bank/SAP transactions)
  financial-brain.json   ← the protagonist
  bank-transactions.json
  sap-transactions.json
  matched-records.json
  unmatched-cases.json
  reconciliation-session.json
  historical-patterns.json
```

## 5. Canonical feature pattern

**Every AI feature follows the same 5-file shape.** Copy this pattern when
adding a new one. Do not invent variations.

### Server side

```
server/src/routes/<feature>.ts       Express handler. Same skeleton each time.
server/src/prompts/<feature>.ts      Pure: (input) => { system, user }
server/src/schemas/<feature>.ts      Zod schema = the JSON contract
server/src/mocks/<feature>.ts        Fallback response. Realistic.
```

### Client side

```
client/src/features/<feature>/<Feature>.tsx       Component
client/src/features/<feature>/use<Feature>.ts     Hook (calls api.ts)
client/src/features/<feature>/<Feature>.types.ts  Local types (re-exports from domain.ts + CloseGuaranteeProps)
client/src/features/<feature>/<Feature>.mock.ts   Frontend fallback — REQUIRED, not optional
```

Hook return shape convention (enforced across all features):
```ts
// Always return { data, loading, error } — not brief/isLoading/etc.
export function useFeature(sessionId: string): { data: T | null; loading: boolean; error: string | null }
```

Component fallback convention: the component owns the mock decision, not the hook.
```ts
// Hook: just call api, surface error
const { data, loading, error } = useFeature(sessionId);
// Component: apply fallback
const item = data ?? (error !== null ? featureMock : null);
```

### Route handler skeleton (copy this)

```ts
// server/src/routes/<feature>.ts
import { Router } from 'express';
import { z } from 'zod';
import { callClaude, extractJson } from '../services/claude.js';
import { brainAsPromptContext } from '../services/brain.js';
import { featureSchema, type FeatureOutput } from '../schemas/<feature>.js';
import { featurePrompt } from '../prompts/<feature>.js';
import { featureMock } from '../mocks/<feature>.js';
import { parseBody } from '../utils/validate.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({ /* ... */ });

export const featureRouter = Router();

featureRouter.post('/', async (req, res) => {
  const body = parseBody(InputSchema, req, res);
  if (!body) return; // parseBody already sent a 400

  if (env.DEMO_MODE) return res.json({ ...featureMock, ...body });

  try {
    const brain = await brainAsPromptContext();
    const { system, user } = featurePrompt({ brain, ...body });
    const text = await callClaude({ system, user, temperature: 0, maxTokens: 1024 });
    const validated: FeatureOutput = featureSchema.parse(extractJson(text));
    return res.json(validated);
  } catch (err) {
    logger.warn('<feature>.fallback', { error: String(err) });
    return res.json({ ...featureMock, ...body }); // demo never breaks
  }
});
```

Key differences from the original skeleton:
- Use `parseBody()` from `utils/validate.ts` — never call `.safeParse()` inline in a route.
- `extractJson()` returns `unknown` — always pipe directly into `.parse()`. Do not assign it to a typed variable first.
- Spread `...body` into the mock fallback so the response echoes back the request's `sessionId` / `transactionId`. The client needs it.
- Compute any numeric summaries (counts, totals) in the route before building the prompt. Do not ask Claude to count.

## 6. Prompt rules

- The **system prompt** sets the role and includes the exact JSON shape.
- The **user prompt** carries the data (Brain JSON + feature input).
- Always end the system prompt with: *"Return ONLY valid JSON. No prose,
  no markdown fences."* (Claude still sometimes adds fences; `extractJson`
  strips them.)
- `temperature: 0` for Debugger, Advisor, Brief. `temperature: 0.3–0.5`
  only for the Narrator.
- Don't ask Claude to do math beyond what's in the data. If you need a
  computed number (close probability, totals), compute it in code and pass
  it in. The AI's job is judgment and language, not arithmetic.

## 7. The Financial Brain pattern

`server/src/services/brain.ts` is the ONLY place that knows where the Brain
lives. Every feature route does:

```ts
const brain = await brainAsPromptContext();
```

and passes that string into the prompt builder. This means:

- Adding a new field to the Brain only requires updating
  `data/financial-brain.json`. All features pick it up.
- In production, we'd swap the JSON loader for a per-customer DB call. No
  feature code changes.

When a session ends, the Narrator should produce a `learnedThisSession`
section. For the hackathon, we don't actually persist updates — we display
what the Brain "would have learned" and reset between demo runs.

## 8. State management (frontend)

- **Component-local state**: `useState`. Default.
- **Cross-feature state**: a Zustand slice in `client/src/store/`.
- The "current session" and "current selected transaction" live in Zustand
  because multiple features react to them.
- Do NOT introduce Redux, Jotai, or React Query for this scope.

### Store slices (do not merge)

| File | Export | What it holds |
|---|---|---|
| `store/session.ts` | `useSessionStore` | `sessionId`, `status` ("briefing"\|"working"\|"closed"), `selectedTransactionId`. Actions: `openSession`, `closeSession`, `selectTransaction`. |
| `store/data.ts` | `useDataStore` | `brain`, `session`, `transactions`, `matchedRecords`, `unmatchedCases`, `isLoading`, `error`. Action: `loadAll()` fans out all five `/api/data/*` calls in parallel. |
| `store/index.ts` | re-exports both | Barrel — import from here, not from the individual slice files. |

`loadAll()` is called once in `App.tsx` on mount. While `isLoading` is true, the
app shows a full-screen spinner. The existing briefing/working layout only renders
after data is loaded.

## 9. Coding rules

- **TypeScript strict everywhere.** `noUncheckedIndexedAccess` is on. Yes,
  it's annoying. Yes, keep it on.
- **No `any`.** If you reach for it, use `unknown` and narrow, or define a
  type. The only place `any` is acceptable is in third-party type holes.
- **Imports**: client uses `@/` alias for `src/`. Server uses relative
  imports with `.js` extensions (ESM convention — TypeScript compiles `.ts`
  but the runtime resolves `.js`).
- **No default exports for components.** Named exports only. Easier grep,
  easier rename.
  - Exception: `App.tsx` default-exports because Vite expects it.
- **Comments**: explain *why*, not *what*. If you have to comment what,
  rename the variable.
- **No dead code.** If you comment out a feature route, leave a one-line
  reason. If it's not coming back, delete it.
- **Avoid premature abstraction.** Two features sharing code is fine. Three
  is when you extract.

### Server-specific rules (learned in Session 1)

- **Use `parseBody()` for every route.** Never call `schema.safeParse(req.body)` inline in a handler. The util lives in `utils/validate.ts`.
- **Use `serve()` for data endpoints.** The helper in `routes/data.ts` wraps any async loader with a typed fallback. Copy the pattern; do not call `readFile` directly in a route.
- **No inline type declarations inside route files.** If you need a type shared between route, schema, and prompt, put it in the schema file (`schemas/<feature>.ts`) and import it.
- **`extractJson()` returns `unknown`.** Do not cast it. Pipe directly into `schema.parse()` — that's the type narrowing step.
- **Per-type nullable cache variables in `services/data.ts`.** Do not use a generic `Map<string, unknown>` or object cache — TypeScript can't narrow through it cleanly. Pattern:
  ```ts
  let cachedFoo: Foo[] | null = null;
  export async function loadFoo(): Promise<Foo[]> {
    if (cachedFoo) return cachedFoo;
    cachedFoo = await readDataFile<Foo[]>('foo.json');
    return cachedFoo;
  }
  ```
- **DEMO_MODE check before any async work.** In a route, check `env.DEMO_MODE` immediately after validating the body — before loading data or calling `brainAsPromptContext()`. Keeps demo fast.

## 10. Team roles — read this first if you're an AI assistant

There are two engineers on this project. Each has a dedicated AI assistant.
**Before writing any code, identify which role you are serving.**

---

### Role A — Frontend Engineer

**Your territory:** everything inside `client/` and `data/`.

**Your job:**
- Build and own the app layout: persistent Brain panel (right rail) + reconciliation workspace (left/center)
- Build all four feature components and their hooks under `client/src/features/`
- Build the Brain panel components under `client/src/components/brain/`
- Build shared UI primitives under `client/src/components/ui/`
- Manage Zustand store slices for session state and selected transaction
- Wire feature hooks to `client/src/services/api.ts` — that's the only place `fetch()` lives
- Populate and refine `data/*.json` if you need richer mock content

**Your API contract:** the types in `client/src/types/domain.ts`. When the
backend says an endpoint is ready, the shape it returns matches exactly what
`domain.ts` already describes. You can build UI against mock data before the
backend exists.

**You do NOT touch:** anything inside `server/`. If you need the backend to
change its response shape, open a conversation with the backend engineer first
and update `domain.ts` + the matching Zod schema together.

**Feature order (build in this sequence):**
1. ~~Layout shell + Brain panel with static data~~ ✅ App.tsx shell done; Brain panel placeholder in right rail
2. ~~`close-guarantee` (Brief)~~ ✅ CloseGuarantee.tsx, useCloseGuarantee.ts, CloseGuarantee.mock.ts all shipped
3. `match-debugger` — select a transaction, get diagnosis ← **next**
4. `risk-firewall` — risk badge on each unmatched row
5. `narrator` — end-of-session summary modal

---

### Role B — Backend Engineer

**Your territory:** everything inside `server/`.

**STATUS (as of Session 1 — 2026-05-26): BACKEND IS COMPLETE. FRONTEND: close-guarantee done, Brain panel placeholder in App.tsx.**
All 4 AI feature routes, the data router, and all supporting services are
implemented and tested. Do not re-scaffold — extend or fix instead.

**All live endpoints:**

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Server + demo mode status |
| GET | `/api/data/brain` | Full Financial Brain JSON |
| GET | `/api/data/transactions/bank` | All bank transactions |
| GET | `/api/data/transactions/sap` | All SAP transactions |
| GET | `/api/data/matches` | Already-matched records |
| GET | `/api/data/unmatched` | Unmatched cases (the workspace) |
| GET | `/api/data/session` | Current reconciliation session header |
| GET | `/api/data/historical` | Historical patterns for context |
| POST | `/api/data/reload` | Clears all caches + reloads from disk |
| POST | `/api/brief` | AI close-guarantee briefing |
| POST | `/api/debug` | AI match debugger for one transaction |
| POST | `/api/risk` | AI risk assessment for one transaction |
| POST | `/api/narrate` | AI end-of-session narrative |

**Your job (ongoing):**
- Fix bugs in existing routes / prompts / schemas
- Tune prompts if AI output quality is poor (test with `DEMO_MODE=false`)
- Add fields to `data/financial-brain.json` if the demo pitch needs them
- `server/src/services/brain.ts` loads `data/financial-brain.json` — do not hardcode Brain data in prompts
- `server/src/services/claude.ts` is the only place the Anthropic SDK is touched

**Your API contract:** the Zod schemas in `server/src/schemas/`. Do not change
their shape without syncing with the frontend engineer and updating
`client/src/types/domain.ts` too.

**You do NOT touch:** anything inside `client/`. If the frontend needs a
different response shape, discuss it first.

---

### Shared contract — the only files both roles touch

| File | Who changes it | Rule |
|---|---|---|
| `client/src/types/domain.ts` | Both, by agreement | Never change unilaterally |
| `server/src/schemas/*.ts` | Both, by agreement | Never change unilaterally |
| `data/financial-brain.json` | Either | Discuss before changing numbers used in the pitch |

---

## 11. Git workflow (2 people)

- **`main`** is always demo-able. The Thursday version of the demo runs from
  `main`.
- One short-lived branch per feature: `feature/close-guarantee`,
  `feature/narrator`, etc.
- PRs are reviewed by the other person — even 2-minute PRs. Catches dumb
  mistakes when you're tired.
- **Commit message format**: `<area>: <imperative summary>`. Examples:
  - `brief: wire up close probability gauge`
  - `server: add zod schema for narrator output`
  - `data: tighten CONSTRUTECH vendor profile numbers`
- Squash on merge to keep `main` history readable.
- Never commit `.env`. The `.gitignore` blocks it; do not work around that.

## 12. The Brain panel must be visible at all times

The previous strategy work landed on a key decision: we are building a
standalone product, not a plugin. The visual identity of the app should
make it obvious — at every screen — that the Brain is the protagonist.

Practically: a persistent right rail (or a primary panel) that updates
contextually as the user interacts with the workspace. Never hide it
behind a modal or a tab.

## 13. Demo-killing failure modes to avoid

These are things that have killed past hackathon demos. Don't let them
happen.

- **Hardcoded API key in the client bundle.** This will leak. The Anthropic
  key lives in the server `.env` only. The client never sees it.
- **A Claude response that doesn't parse.** Always validate with Zod.
  Always fall back to mock on failure.
- **A slow endpoint blocking the UI.** Every feature call shows a loading
  state. Targets:
  - Brief / Advisor / Debugger: under 4 seconds
  - Narrator: under 10 seconds
  If a call regularly exceeds these, switch that endpoint to Haiku.
- **A demo that depends on venue WiFi.** Set `DEMO_MODE=true` if the
  network is bad. The talk should be identical.
- **A "Close Probability: 72%" with no defense.** When asked how it's
  computed, point at `closeProbability.formula` in `financial-brain.json`.
  It's documented for a reason.

## 14. Animation library rules (enforced)

Three animation libraries are in the project. Each has exactly one job:

| Library | Use it for | Do NOT use it for |
|---|---|---|
| **Framer Motion** | Gauge fill (recharts-driven), entrance transitions, typewriter text | anime.js's job, Lottie |
| **anime.js v4** | Reserved for future raw SVG arc animations if recharts is insufficient | Recharts-based gauges, layout, Lottie |
| **@lottiefiles/dotlottie-react** | Brain "thinking" Lottie in the right rail while an AI call is in flight | General loading spinners, any non-Lottie use |

**Correct import for anime.js v4** (v4 removed the default export):
```ts
import { animate } from 'animejs';   // ✅
import anime from 'animejs';         // ❌ no default export in v4
```

**Correct import for Lottie:**
```ts
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
```

**Recharts + Framer Motion gauge pattern** (used in close-guarantee — copy this):
```tsx
// 1. Animate a number with framer-motion imperative API
const controls = animate(0, targetPct, {
  duration: 1.5,
  ease: 'easeOut',
  onUpdate: (v) => setGaugePct(Math.round(v)),
});
// cleanup: controls.stop()

// 2. Feed that number into RadialBarChart
<RadialBarChart startAngle={180} endAngle={0} data={[{ value: gaugePct }]}>
  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
  <RadialBar dataKey="value" background={{ fill: '#1e293b' }} fill="#7F77DD" cornerRadius={8} />
</RadialBarChart>
// PolarAngleAxis with domain={[0,100]} is required — without it recharts
// auto-scales and 72 fills 100% instead of 72%.
```

**Typewriter pattern** (used in close-guarantee — copy this):
```ts
let i = 0;
const id = setInterval(() => {
  i += 1;
  setDisplayed(text.slice(0, i));
  if (i >= text.length) { clearInterval(id); setTyping(false); }
}, 30);
// cleanup: clearInterval(id)
```

## 15. Out of scope (do not build)

The strategy doc named these. Re-stating so we don't drift:

- Production SAP or Cosmos connections
- Real database writes
- OCR or document extraction
- Real embeddings / vector search
- A rewrite of the matching engine
- Integration into the existing FastBank UI

If a teammate suggests building one of these, point them at this list and
the 2.5-day clock.

## 16. The pitch sentence

We open the presentation with this. Memorize it.

> "Every month, your accountant opens FastBank and starts from zero. No
> memory of last month. No knowledge of your vendors. No sense of what's
> about to go wrong. FastBank Financial Brain changes that. The more you
> use FastBank, the smarter it gets about your company specifically."

The Brain panel and the demo flow are designed to land this sentence
visually. Anything that does not support it is a distraction.
