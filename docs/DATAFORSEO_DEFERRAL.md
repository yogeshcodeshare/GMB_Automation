# Decision: DataForSEO live activation DEFERRED (post-funding)

**Date:** 16 Jul 2026 · **Decided by:** Yogesh (founder) · **Status:** ACTIVE

## Decision
The DataForSEO integration is **built and tested but stays DORMANT**. We do **not**
activate live DataForSEO calls now. We revisit once there are paying clients — at which
point we add the **US$50 deposit** to the DataForSEO account (which is what actually
enables the API; the persistent `403 · 40104` was a funding/verification gate, not a
credentials problem — the free balance ping always worked).

## Why
- Activating the API requires a $50 deposit the founder is not spending pre-revenue.
- The product is an internal agency tool; until there are paying GMB-Boost clients, live
  audits/grids aren't needed daily. Demo + sales use runs on sample data.

## What this means concretely (nothing is removed)
- **All code stays as-is** — the audit engine (M1), website audit (M1.5), grid/teleport
  (M2), category intel, and the public checker's info-pull are fully written, guarded, and
  tested against the **Manovedh fixture + 6 seed businesses**.
- **The CR-1 kill-switch enforces it.** `settings.dataforseo_live_enabled` defaults **false**
  and is fail-safe OFF (missing column/row/error → false). Every paid endpoint
  (`/api/audit`, `/api/businesses/resolve`, `/api/grid`, `/api/posts-audit`) returns
  `LIVE_DATA_DISABLED` (503) → the frontend falls back to its typed mocks. No DataForSEO
  network call can happen. ₹0 burned, guaranteed.
- **₹0 / DB-only screens run LIVE now** off the seed data: P1 dashboard KPIs
  (`/api/dashboard/stats`), businesses list (`/api/businesses`), review inbox
  (`/api/reviews`), spend pill (`/api/spend/today`). These are the Day-5 integration flips.
- **PDF + WhatsApp (M4), AI tools (M3)** are independent of DataForSEO and work normally
  (AI on the free Groq/OpenRouter chain; PDF on the fixture audit — the MVP gate).

## Interim demo behaviour
Paid screens (New Audit run, Grid scan, Category Finder, live public checker) show the
seed/fixture data as **sample/demo content**. A "New Audit" against a *new* real business
cannot pull live data until funded — this is expected and on-record, not a bug.

## Future activation checklist (when funding arrives — est. after first paying clients)
1. Add US$50 to the DataForSEO account (app.dataforseo.com) and confirm API access
   (`RUN_LIVE_SMOKE=1 npx vitest run tests/live-smoke.test.ts` in the backend worktree →
   should return 20000, not 40104).
2. Apply migration `20260716000001_dataforseo_live_enabled.sql` (if not already).
3. `PATCH /api/settings { "dataforseo_live_enabled": true }` (founder-auth; P11 toggle).
4. Flip the paid `LIVE_ENDPOINTS` keys in `components/lib/api.ts` (resolve, audit,
   posts-audit, grid, website OnPage) per `docs/agents/DAY5_INTEGRATION.md`.
5. Run the launch-checklist §1.8 live items: 3 real audits + grid spot-check ±2 vs live
   Google. Watch the spend ledger; the daily cap + kill-switch both apply.

## Sprint impact
- **Day 5:** integration = the ₹0/DB flips only. Paid screens stay on mocks (as designed).
- **Day 7 public checker (M7):** built + rate-limited + Turnstile, but its live info-pull is
  dormant behind the same flag — demos on sample data until funded.
- **Launch-checklist "3 real audits vs live Google"** moves to the future-activation
  checklist above. Everything else (login, PDF, WhatsApp-when-keyed, screens, spend guard,
  public rate limits) still ships.
