tr# close-guarantee

Vertical slice for the **close-guarantee** feature.

## Convention

Each feature folder should contain:

- `<Feature>.tsx` — the main React component the layout renders
- `use<Feature>.ts` — hook that talks to `services/api.ts` and exposes state
- `<Feature>.types.ts` — local types (the JSON contract from the server)
- `<Feature>.mock.ts` — frontend-side fallback for offline development

## Rules

- This folder owns its UI, its hook, and its types. Nothing else.
- Generic UI (buttons, cards, the gauge component) lives in `components/ui`.
- Don't import from another feature folder. If two features share something, lift it to `components/` or `hooks/`.
- The hook is the only thing that should call `api.ts`. Components consume the hook.

See `/CLAUDE.md` in the repo root for the canonical pattern.
