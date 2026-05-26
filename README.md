# FastBank Recon Intelligence

AI intelligence layer for Bank Reconciliation. FastBank Hackathon — May 26–28, 2026.

## What this is

A standalone React app that imitates the FastBank visual language and adds four AI-powered features on top of a reconciliation workflow:

1. **Close Guarantee** — opens every session with a probability score and known blockers
2. **Match Debugger / TRACE** — explains why an unmatched transaction didn't match
3. **Risk Firewall** — inline alerts while the user is resolving items
4. **Reconciliation Narrator** — generates a full audit document at close

All four are powered by a single **Financial Brain** context (`data/financial-brain.json`) that is injected into every AI call. That's what makes the demo feel like the system "remembers" the customer.

The data is mocked. The AI reasoning is real (Claude API).

## Quick start

```bash
# Use the right Node version
nvm use

# Set your API key
cp .env.example .env
# edit .env, paste your ANTHROPIC_API_KEY

# Install everything
npm run install:all

# Run both client and server with one command
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000
- Health check: http://localhost:5173/api/health (proxied)

## Repo layout

```
client/        Vite + React + TypeScript + Tailwind frontend
server/        Express + TypeScript backend (Claude API proxy + Brain context)
data/          Mock JSON files (Financial Brain, bank/SAP transactions, etc.)
CLAUDE.md      Architecture rules + conventions. Read this before coding.
```

## Read before coding

**`CLAUDE.md`** in this repo root. It defines the architecture, the JSON contracts, the fallback strategy, and the per-feature pattern. Both team members and any AI coding assistant should follow it.

## Demo safety

The server has a `DEMO_MODE=true` env flag that forces all AI endpoints to return mock data. Use it during the live demo if the venue WiFi is shaky. Every endpoint also falls back to a mock automatically if the live Claude call fails or returns invalid JSON — the demo cannot break from a network issue.
