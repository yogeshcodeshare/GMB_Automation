# Day-5 Integration Runbook — swap mocks for the live API

**Goal:** flip every screen from typed mocks to the real endpoints, one at a time, with a
one-flag rollback at each step. Nothing here needs new code beyond flipping registry flags
and deleting the dev-preview route — the contract has held all week.

## The switch: `components/lib/api.ts` → `LIVE_ENDPOINTS`

Every screen reads through `useApiGet` / the fetch layer, which consults the
`LIVE_ENDPOINTS` registry in `components/lib/api.ts` — **keyed by route path**, all `false`
today = mock mode. Flipping one entry to `true` makes that screen fetch the real route; on
any fetch error it **falls back to the mock** (so a flip is never fatal). **Rollback = flip
the flag back to `false`** and reload. Do one flip, verify, commit, then the next — never
flip several at once.

The registry currently has 5 keys (`/api/dashboard/stats`, `/api/businesses/resolve`,
`/api/businesses`, `/api/spend/today`, `/api/reviews`). Endpoints below without a key yet
(audit, posts-audit, grid, website-audit, ai/generate) need their key **added to the
registry** as their screen is wired — frontend adds the key, MAIN just gates the PR.

## Flip order (dependency-safe — earliest = lowest blast radius)

| # | Registry key(s) / screen | Verify before moving on |
|---|---|---|
| 1 | `/api/dashboard/stats` (P1 KPIs) | KPI numbers match seed; ₹0 |
| 2 | `/api/businesses` (P1 table, incl. `/:id`) + `/api/spend/today` (spend pill) | 6 seed rows, scores, dots; pill shows spend/cap |
| 3 | `/api/businesses/resolve` (P2 picker) | name+city → candidate cards; `?preview` ₹ **(needs DataForSEO verified)** |
| 4 | *add* `/api/audit` (+ `/:id`, `/progress`) (P2→P3) | staged run → P3 renders 41 amber **(needs DataForSEO verified)** |
| 5 | `/api/reviews` (P6) | 30 reviews, stats, cloud, trend — ₹0 |
| 6 | *add* `/api/posts-audit` (P7) | 7 posts, 1/293 days **(needs DataForSEO verified)** |
| 7 | *add* `/api/grid` (+ `/:id`, `?businessId=`, `/compare`) (P5) | pins render, avg 4.6, ownership; teleport **(needs DataForSEO verified)** |
| 8 | *add* `/api/website-audit` (P3b) | NAP/title/meta/PSI (PSI needs `PSI_API_KEY`; DataForSEO only if OnPage on) |
| 9 | *add* `/api/ai/generate` + `/api/categories/related` (P8) | Marathi draft, `approved=false`; **needs OpenRouter/Groq key** |

Steps 1, 2, 5 are ₹0 / DB-only — flip them **first thing** even if DataForSEO is still
unverified. Steps 3, 4, 6, 7 are **gated on the DataForSEO account being verified** (paid
serp/info calls). Step 8 PSI is free (`PSI_API_KEY` already in `.env.local`). Step 9 needs
the AI keys (Groq present; OpenRouter pending).

**Two extra ₹0 keys — both BLOCKED, keep OFF (see `DAY6_INTEGRATION.md`).** The Day-6 authed
walk confirmed neither is flippable yet: `/api/settings` needs client migration `20260716000001`
+ a frontend field-name fix (`dataforseo_live` → `dataforseo_live_enabled`) before the CR-1
toggle can persist; `/api/report` is an orphan key (report-page PDF/WA are still mocks — flip is
a no-op until wired to EP-006/EP-007).

## Delete the dev-preview route

`app/public/dev/*` (preview.tsx + page.tsx) exists ONLY to mount mock screens without login;
it is `NODE_ENV`-guarded (hard 404 in prod) but delete it at integration to be safe:
`git rm -r app/public/dev` after step 4 verifies. Nothing in the real app imports it.

## Founder-login test flow (the real screens are auth-gated)

1. Ensure a founder user exists: `npm run create-founder -- <email> "<pw>"` (once).
2. `rm -rf .next && npm run dev` (clean — a prod `build` while `dev` runs clobbers `.next`).
3. Open `/login` → sign in → land on `/dashboard` (real data via flag 1–2).
4. Walk P1→P2→P3→P5→P6→P3b→P8; each screen either shows live data (flag on) or the mock
   (flag off) — both must render without console errors.

## Demo-data state expectations (before go-live, NOT day 5)

`main` runs on the 6 seed businesses (all `is_demo=true`). Day-5 integration uses that seed
data — do NOT flush yet. The Day-7 go-live cutover is: `npm run flush:demo -- --yes` →
`git rm -r app/public/dev` → run one real audit (see PLAN_7DAY Day 7).

## Migrations that must be applied before the paid flips work

`20260713000001_grid_top_ranks` (grid popovers/ownership) + `20260713000002_is_demo`
(flush flag) — both pending on Yogesh (supabase/README). Grid degrades gracefully without
the first, but apply both before step 7.

## Rollback rule (say it once more)

Any flipped screen misbehaving → set its `LIVE_ENDPOINTS` entry back to `false`, reload,
it's on the mock again. No revert, no redeploy needed. Commit each successful flip
separately so a bisect is trivial.
