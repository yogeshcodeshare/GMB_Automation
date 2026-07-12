# GMB सारथी (GMB Sarathi)

Internal GBP audit + optimization + service-delivery dashboard for a solo agency in
Karad — audits in minutes, branded Marathi PDF reports on WhatsApp, geo-grid rank scans,
AI drafts with approve-before-publish, and monthly GMB Boost delivery ops.

**Single source of truth:** [GMB_Tool_Development_Plan.md](GMB_Tool_Development_Plan.md) (v1.8)
· split docs in [docs/PRD.md](docs/PRD.md), [docs/ERD.md](docs/ERD.md), [docs/MILESTONES.md](docs/MILESTONES.md)
· visual truth in [design/handoff/design_handoff_gmb_sarathi/README.md](design/handoff/design_handoff_gmb_sarathi/README.md).

## Tech stack

| Component | Technology |
|---|---|
| Framework | Next.js 14.2 (app router) + TypeScript |
| UI | Tailwind CSS 3.4 + shadcn/ui · IBM Plex Sans / Devanagari / Mono |
| Data | Supabase (Postgres + Auth + Storage, RLS, single founder user) |
| Paid data vendor | **DataForSEO — the ONLY paid service** (hard daily cap, spend ledger) |
| AI | Groq key first → OpenRouter free models (fallback chain) — ₹0 |
| Maps | Leaflet + OpenStreetMap tiles — ₹0 |
| PDF | Playwright + Devanagari fonts (feature-flagged; VPS or @sparticuz/chromium) |
| WhatsApp | Meta Cloud API via wa.service (feature-flagged until keys arrive) |
| Deploy | Vercel (sprint) → Docker on Hostinger KVM2 VPS (final, ADR-004) |

## Quick start

```bash
npm install
# copy .env.example → .env.local and fill keys (never commit it)
# apply supabase/migrations/*.sql — see supabase/README.md
npm run create-founder -- you@example.com "a-strong-password"
npm run dev            # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / prod build / serve |
| `npm run typecheck` · `npm run lint` · `npm test` | CI gates (also run on every push) |
| `npm run test:rls` | RLS lockout tests against the live project |
| `npm run create-founder -- <email> "<pw>"` | create the single founder login |
| `npm run m0:verify` | M0 exit check: env + schema + seed + RLS + DataForSEO ping → spend ledger |

## Hard constraints (from [CLAUDE.md](CLAUDE.md) — never violate)

1. DataForSEO is the only paid external service — no Google billing, no paid LLMs/SaaS.
2. Spend guard first-class: every DataForSEO call logs to `spend_ledger`; the daily cap
   blocks calls (EP-012). Cost preview (₹) before every paid action.
3. No client passwords, ever — GBP via OAuth (encrypted tokens) or manager/manual mode.
4. Approve-before-publish for everything AI-generated.
5. Devanagari renders everywhere, including PDFs.

## Team workflow (3-agent sprint)

- `main` — MAIN agent only (integration, contract, schema, CI). See
  [docs/PLAN_7DAY.md](docs/PLAN_7DAY.md) and [docs/agents/](docs/agents/).
- `agents/backend` → worktree `../GMB_Automation-backend` — `src/server/**`, `app/api/**`.
- `agents/frontend` → worktree `../GMB_Automation-frontend` — `app/(dashboard)/**`,
  `app/public/**`, `components/**`.
- Shared contract: [docs/agents/API_CONTRACT.md](docs/agents/API_CONTRACT.md) + `src/types/**`.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system + folder ownership
- [docs/STATUS.md](docs/STATUS.md) — live milestone status
- [docs/CHANGELOG.md](docs/CHANGELOG.md)
- [docs/SECURITY.md](docs/SECURITY.md)
