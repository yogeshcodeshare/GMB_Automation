# Project Status

**Sprint:** 7 days, 13–19 Jul 2026 · plan in [PLAN_7DAY.md](PLAN_7DAY.md)
**Current milestone:** M0 — Foundations (code complete; founder actions pending)

## M0 exit criteria

| Criterion | Status |
|---|---|
| "Hello dashboard" behind login | ✅ verified (redirect gate + auth session smoke test) |
| Schema TB-001..018 + RLS + seed §2.9 | ✅ written · ⏳ founder applies SQL (supabase/README.md) |
| Spend ledger + cap middleware + tests | ✅ 14 unit tests green |
| Test call logged to spend ledger | ⏳ `npm run m0:verify` after migrations |
| CI typecheck + lint + test | ✅ workflow committed; runs on first push |
| Docker/nginx (MS0-T02) | ⏸ deferred — Vercel for this sprint per kickoff constraint 6 |

## Founder TODO (blocking Day 2 backend integration)

1. Apply `supabase/migrations/*.sql` in the Supabase SQL editor (2 min).
2. `npm run create-founder -- <email> "<password>"` then log in at `/login`.
3. `npm run m0:verify` — expect all PASS.
4. Confirm DataForSEO $1 trial is active (verify shows the balance).

## Milestones

- [x] M0 foundations (main agent) — this page
- [ ] M1 audit engine — BACKEND · exit: Manovedh fixture reproduced (score 40–55 amber)
- [ ] M1.5 website audit · M2 grid/teleport — BACKEND
- [ ] M3 AI layer · M4 PDF + WhatsApp (flagged) — BACKEND — **MVP gate**
- [ ] Screens P0–P12 with fixture mocks → wired to API — FRONTEND
- [ ] M5 integration (Day 5) · M6 sprint manual mode (Day 6) · M7 public checker + Vercel (Day 7)
