# Architecture

System diagram, ADRs and schema live in [ERD.md](ERD.md) (§2.1–2.3). This file adds what
the blueprint doesn't: the folder map and the 3-agent ownership rules.

## Folder map & ownership

```
app/
  (dashboard)/**        FRONTEND — all 14 internal screens (P0..P12 per design handoff)
  public/**             FRONTEND — P10 public checker (Marathi-first, no login)
  login/                FRONTEND (M0 placeholder by main agent — replace freely)
  api/**                BACKEND — every EP-xxx route handler
components/**           FRONTEND — shadcn/ui + design-system components
src/
  server/**             BACKEND — dataforseo/score/audit/website/grid/ai/pdf/wa services
    spend/              BACKEND maintains; cap-logic changes need MAIN sign-off
  types/**              MAIN — shared contract (with docs/agents/API_CONTRACT.md)
  lib/**                shared infra (supabase clients, env flags, cn) — additive changes
                        allowed with a handoff note; MAIN arbitrates conflicts
supabase/**             MAIN — migrations are append-only, numbered
.github/**              MAIN — CI
docs/**                 MAIN — contract, briefs, plan, status
design/**               read-only reference (handoff + prototype)
fixtures/**             read-only — M1 acceptance fixture (Manovedh)
scripts/**              MAIN — founder/setup/verify scripts
```

**Rule:** never edit outside your folders; propose cross-boundary changes via a
`contract-proposal:` commit note and let the MAIN agent arbitrate (see the briefs).

## Data flow (audit, Flow A)

`POST /api/audit` → spend guard preview/assert → dataforseo.service
(`my_business_info` + `reviews` + `my_business_updates` + `local_finder`) →
normalize → `audits.raw_snapshot` + caches (TB-006/012/013) → score.service
(deterministic rubric §2.5) → `audit_scores` → `GET /api/audit/:id` → P3 page →
pdf.service (flagged) → wa.service (flagged).

Every DataForSEO request goes through `SpendGuard.guarded()` — no exceptions.

## Deploy (ADR-004)

Sprint: Vercel free tier (`pdf.service` behind `FEATURE_PDF`, schedulers via Vercel Cron
with an n8n-portable interface). Final: Docker Compose behind nginx on the Hostinger
KVM2 VPS, n8n crons. `middleware.ts` gates everything except `/login`, `/public/*`,
`/api/public/*`, `/api/health`.

## Risky assumptions to validate early

1. **DataForSEO field coverage** — `my_business_info`/`my_business_updates` must return
   every §1.3d field (services, attributes, hours, posts of ANY profile). Validate Day 2
   with one real call against मनोवेध before building the whole normalizer.
2. **Vercel PDF** — Playwright on Vercel functions needs @sparticuz/chromium and may hit
   size limits; Devanagari fonts must embed. Flag stays off until proven (Day 4); VPS is
   the fallback.
3. **Migrations applied before Day-2 integration** — backend integration tests depend on
   the founder applying `supabase/migrations/*.sql` (API keys can't run DDL).
