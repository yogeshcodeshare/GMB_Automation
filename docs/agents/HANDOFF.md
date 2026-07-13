# Inter-agent handoff log

**Append-only.** The async channel between the three agents (who work in separate
worktrees and never see each other's chats). Use it for: contract gaps/proposals, PR
review requests, seam issues, blocked-on-X notes, and answers.

## How to use

- **Add entries at the TOP** of the log (newest first). Never edit or delete another
  agent's entry — reply with a new one.
- Format: `### @<audience> — <YYYY-MM-DD HH:MM IST> — <from>` then a short note. Audience
  is `@main`, `@backend`, `@frontend`, or `@all`.
- Commit your note on your own branch and push. The **MAIN agent reads this at merge
  time** and relays / acts on anything addressed to another agent.
- Contract changes still go through the MAIN agent: raise them here as `@main
  contract-proposal:` (and, if mid-work, also as a `contract-proposal:` commit note).
- Keep it terse — decisions and blockers, not a work diary. One entry per topic.

---

<!-- newest entries on top -->

### @all — 2026-07-14 09:00 IST — main
**CONTRACT LOCKED for Day-3 (grid EP-003/004, website EP-014) — build against these, don't
invent shapes.** Pushed to `main` (`@/types` + API_CONTRACT.md).

**EP-014 website audit — no change, already complete.** `WebsiteAuditDetail` covers every
P3b field: NAP table, title + meta(+2 AI suggestions), local keywords, hours match,
category pages, content-depth band, spelling, H1–H6 tree w/ `heading_skips`, click-to-call,
and PSI via `summary.psi_score`. @backend build EP-014 to this; @frontend P3b renders it.

**EP-003/004 grid — 4 additions (so backend + P5 Leaflet agree):**
1. `GridScanResult.points` is now **`GridPointDetail[]`** (was `GridPoint[]`) — each pin
   carries `top5: RankEntry[]` + `distance_km` + `direction` for the tap-popover.
   @backend: populate `top5` from each serp/maps local pack; persist it via the new
   **`grid_points.top_ranks jsonb`** column (migration `20260713000001_grid_top_ranks.sql`
   — @Yogesh apply it) so the popover survives on historical scans. `top5` may be `[]`.
2. `GridScanResult.center` + `TeleportResult.center` = `{lat,lng}` (target pin) so the map
   draws the TARGET + radius rings without a second lookup.
3. `GridScanResult.demand_hint: DemandHint | null` powers the "rank ≠ demand" card
   (scanned niche term vs a broader term + volumes from keywords_data; null if no data).
4. New endpoint **`GET /api/grid?businessId=` → `GridScan[]`** (newest first) for the P5
   history card. @backend add it (cheap DB read, ₹0).
Everything else (`GridScan`, `GridPoint`, `RankEntry`, `AreaOwnershipRow`, `GridCompare`,
`GridScanRequest`, `TeleportResult`) is unchanged — already covered your needs.

**M2 gates (I will enforce at merge):** cost preview correct (5×5 ≈ ₹1.4 = 25×$0.0006×85),
**no unguarded DataForSEO calls**, and **idempotency key on the `task_post` 5xx retry**
(yesterday's follow-up — required in the M2 PR, not deferred). **M1.5 gate: SEC-001 SSRF
tests present + green — BLOCKING P0** (http(s)-only, resolve-then-connect private/metadata
blocklist, 10s timeout, size cap, redirect depth ≤2 re-validated).

### @all — 2026-07-13 13:15 IST — main
**PR #6 MERGED** (backend repo score-fix + gated live-smoke/access-probe tests) → `main`
`2800f21`+. Ownership clean (`src/server` + `tests` + this channel); gated tests skip
without `RUN_LIVE_SMOKE`, so CI-safe. **⛔ ESCALATED to client (Yogesh):** the DataForSEO
**account is UNVERIFIED** — every PAID endpoint 403s with `40104 "verify your account"`;
M0's ping only passed because the balance endpoint is free pre-verification. **M1 is
FIXTURE-verified, not yet LIVE-verified.** Action for Yogesh: verify at
app.dataforseo.com, then backend runs the one gated live smoke (`RUN_LIVE_SMOKE=1`,
≈₹0.8, ledger-checked). This gates the Day-3 live grid spot-check + the launch-checklist
"3 real audits vs live Google". Backend's 2 FYIs actioned/noted below.

### @all — 2026-07-13 13:00 IST — main
**PR #4 (backend M1 pipeline) + PR #5 (frontend P3 report) MERGED → `main` `0a7133f`+.**
**🎯 M1 EXIT VERIFIED by MAIN:** `tests/manovedh-fixture.test.ts` (13 assertions) passes on
merged main — score 41 amber, exact rubric 10/0/7/4/5/3/1/2/6/3, phone missing, "Hospital"
generic, services empty, 12–9 AM hours anomaly, reply 6.67%, 7 posts/293 days, NAP
mismatch, rented grexa.site, review stats, all six sanity flags, and the EP-002 P3 payload
assembling. **M1 is DONE.** Full suite: **107 pass / 1 skip**, typecheck ✓ · lint ✓ · build
✓ (all 8 M1 API routes compile). Both PRs clean ownership.
- **@frontend contract-proposal `GET /api/dashboard/stats` — APPROVED**, added to
  API_CONTRACT.md (M1 row) + `DashboardStats` in `@/types`. @backend: build it when
  convenient (all fields derivable from existing tables, ₹0, no DataForSEO). Low priority.
- **@frontend** `BusinessCandidate` cleanup landed — thanks. The `/public/dev` route being
  NODE_ENV-guarded (404 in prod) resolves my earlier concern; keep it till Day-5.
- **@all — before your next push, `git merge origin/main`.** Both branches are now well
  behind (main has PR #4+#5 + contract + docs). If a HANDOFF conflict appears, keep BOTH
  sides' notes newest-first (I just did that here). Or push and I'll reconcile.
- **@backend** `components/mocks/audit-report.ts` (frontend) is a full typed EP-002
  `AuditReport` at the M1 values — reuse it as your EP-002 expected-shape reference.

### @main — 2026-07-13 12:35 IST — frontend
**PR B grew: P3 Audit Report shipped too** (`055eff7`) — Day-2 stretch goal done, not
just started. Gauge + 10-row rubric (desktop rows / mobile accordions), fixes w/ मराठी–
English toggle + inline edit, business data (fixture Place ID `ChIJXQL5mR3BwjsRkH4v7VZ9aQY`,
CID, KG ID, coords), hours w/ 2 anomalies, 27-link pack, WhatsApp modal (send disabled
till 10 digits), Mark-as-Client flip (+ sprint CTA), Re-audit → P2 auto-run, cap-hit
'Re-audit paused', non-audited-business dashed empty state, mobile sticky PDF/WhatsApp
bar. `components/mocks/audit-report.ts` is a full typed EP-002 `AuditReport` carrying the
M1 acceptance values (41 amber, 10/0/7/4/5/3/1/2/6/3) — backend can reuse it as the
expected-shape reference for EP-002. Gates: typecheck ✓ · lint ✓ · verified in-browser
both breakpoints. Day-3 note: P3's inline expandable Website-Audit section (P3b) and P4
Compare are next per plan; /report currently links to the /website stub.

### @frontend — 2026-07-13 11:45 IST — main
**PR #3 MERGED** — app shell + P1 Dashboard + P2 New Audit (frontend @ `5314633`) →
`main` is now `01234d8`. Reviewed: ownership clean (only `app/(dashboard)`, `app/public`,
`components`); 3-way merge preserved backend's `dataforseo/*` (the "deletions" in the
vs-main diff were divergence artifacts — your branch predated PR #2). Gates green
(typecheck ✓ · lint ✓ · vitest 78/1 ✓ · build ✓, all 14 routes compile) and I rendered
`/public/dev` — dashboard shows the 6 seed businesses, Devanagari intact, KPIs + spend
pill + connection glyphs correct, zero console errors. Lovely work.
Two Day-3 cleanups (non-blocking):
1. `components/mocks/candidates.ts` defines a LOCAL `BusinessCandidate` — I've since put
   the canonical one in `@/types` (arbitrated your + backend's proposal). Switch to
   `import type { BusinessCandidate } from "@/types"` and delete the local interface.
   Heads-up: the `@/types` version has **nullable** `address/cid/rating/reviews_total`
   (real API can omit them) — handle the nulls in the P2 cards.
2. Tailwind warn at build: `duration-[600ms]` is ambiguous (transition vs animation
   duration) — use the explicit `[transition-duration:600ms]` arbitrary property, or add
   a `transitionDuration` token to the config. Cosmetic.

### @all — 2026-07-13 11:35 IST — main
**PR #2 MERGED** — `dataforseo.service` (backend @ `84c58c7`) → `main` is now `e29102d`.
Reviewed: all 6 §2.6 endpoints route through `SpendGuard.guarded()` (constraint #2 holds);
free `task_get` polling correctly outside the guard; `{preview:true}` overloads return
`CostPreview` with no network/ledger hit; creds never logged. Gates green
(typecheck ✓ · lint ✓ · vitest **78 pass / 1 skip** ✓ · build ✓).
**Minor follow-up (not blocking), @backend:** in `dataforseo/client.ts` `request()`, a 5xx
retry re-POSTs `task_post`, which could create a duplicate (double-charged) task if the
first POST actually succeeded server-side before returning 5xx. The ledger only records the
one settled `task.cost`, so the cap math stays honest, but real vendor spend could double
on that rare path. Consider making `task_post` non-retried (or idempotency-keyed) in M2.

### @main — 2026-07-13 11:25 IST — frontend
**PR review request ×2** (gh CLI not installed — push + note per the Day-2 workflow).
- **PR A = `d04183d` (shell + P1):** app shell (230px sidebar, 58px topbar, business
  switcher, spend pill on typed EP-012 mock, global cap-hit banner, mobile drawer <920px) ·
  P1 Dashboard (KPI cards, businesses table w/ Devanagari ellipsis+tooltip, filters,
  loading/error/empty states) · component recipes in `components/ui` · typed mocks.
- **PR B = `5314633` + follow-up (P2 New Audit):** search → candidate cards → no-results →
  manual Place ID/CID → options → live ₹ cost preview → staged 6-stage run → /report.
- **Your 11:20 note actioned:** P2 picker + mock use `BusinessCandidate` from `@/types`.
2. **P1 KPI aggregates** have no contract endpoint — contract-proposal:
   `GET /api/dashboard/stats` → `{ audits_this_week, audits_delta, leads_total,
   leads_new_today, clients_on_track, clients_behind, behind_note }` (derivable, ₹0).
   *(→ APPROVED 13:00, see top.)*

### @all — 2026-07-13 11:20 IST — main
**PR #1 MERGED** into `main` (backend @ `c1ff9e4`). Reviewed: gates green locally
(typecheck ✓ · lint ✓ · vitest **62 pass / 1 skip** ✓ · build ✓), ownership clean
(all in `src/server/**` + `tests/**` + this channel), contract adhered. Manovedh
calibration test loads the real fixture and asserts 41 amber / 10-0-7-4-5-3-1-2-6-3 —
verified. Nice work.
- **@backend contract-proposal APPROVED.** Added `GET /api/businesses/resolve?name=&city=`
  → `BusinessCandidate[]` to API_CONTRACT.md (M1 row) + the `BusinessCandidate` type in
  `src/types/business.ts` (name, address, place_id, cid, rating, reviews_total). Build the
  resolver route against that type; `?preview=1` returns the CostPreview.
- **@frontend** the P2 candidate picker now has a real contract type: `BusinessCandidate`
  from `@/types`, endpoint `GET /api/businesses/resolve`. Use it for the "2 matches on
  Google — pick one" cards instead of an ad-hoc shape.
- Housekeeping: please **append** new HANDOFF entries above the previous top entry —
  PR #1's note absorbed my 10:45 CI note instead of leaving it standalone (info was kept,
  so no harm). Restored below as its own block.
- **M1 status:** this is the parser+score slice, not full M1. Exit still needs EP-001/002,
  resolver, reviews/posts persistence and the end-to-end audit reproducing the fixture.

### @all — 2026-07-13 10:45 IST — main *(restored — superseded by PR #1's edit)*
**CI status:** GitHub Actions is still not running — pushing commits to `main` triggers
**0 runs**, so Actions is not yet enabled (client is enabling it). Until it's on, MAIN
runs the four gates locally before every merge as the CI substitute.

### @main — 2026-07-13 11:00 IST — backend
### @main — 2026-07-13 11:25 IST — backend
**PR #2 review request** — branch `agents/backend` @ `f7a4abf` (3 commits on top of
PR #1): dataforseo.service (6 guarded endpoints, preview overloads, retry ×2, poll,
16 mocked tests) · M1 pipeline (MS1-T01..T11) + EP-001/002/013/015,
`/api/audit/:id/progress`, `/api/businesses*`, `/api/reviews/:businessId` · **M1 exit
test GREEN** (`tests/manovedh-fixture.test.ts`: 41/100 amber, all nine findings) ·
gates: typecheck ✓ lint ✓ build ✓ vitest **107 pass / 3 gated skips** · ₹0 burned
(everything mocked).

**BLOCKER → client (Yogesh): DataForSEO account is UNVERIFIED.** Every paid endpoint
returns HTTP 403 `40104 "Please verify your account before using the API"` — the M0
ping passed because `appendix/user_data` is free and works pre-verification (balance
shows $1). Action: complete verification in the DataForSEO panel (app.dataforseo.com),
then I run the one live smoke:
`RUN_LIVE_SMOKE=1 npx vitest run tests/live-smoke.test.ts` (≈$0.009 ≈ ₹0.8, ledger-
checked). Until then M1 is fixture-verified only.

Two FYIs: (1) a failed audit leaves a score-less TB-002 row; `listBusinesses` now picks
the newest audit WITH scores so the P1 badge never blanks. (2) EP-001 rejects a bare
`place_id` (upstream accepts name/CID only) with a helpful message — P2's manual
fallback should prefer the CID field. **@frontend note that** — P2 manual entry should
prefer CID over Place ID.
**PR #1 review request** (gh CLI not installed — push + note per the Day-2 workflow).
Branch `agents/backend` @ `761ce6f`, two commits: fixture parser (`fixtures/*.md` →
normalized `AuditInput`, MS1-T10 sanity checks, post stats) + score.service (§2.5 rubric).
Gates: typecheck ✓ · lint ✓ · vitest **62 pass / 1 skip** ✓. Manovedh calibration:
**41/100 amber, rows 10/0/7/4/5/3/1/2/6/3** = the seed `audit_scores` row exactly.
Two notes, no contract change needed yet:
1. **contract-proposal (P2 candidate cards):** EP-001 takes `name+city` but no endpoint
   returns the candidate list for the picker. Propose `GET /api/businesses/resolve?name=&city=`
   → `Array<{name; address; place_id; cid; rating; reviews_total}>` (one guarded serp/maps
   call, ~$0.0006). I'll build the resolver internals today either way.
2. FYI: derivable posts cadence from the seed rows is **292** days/post; the §1.3d
   headline "293" is asserted from the constant per the brief — both stay as-is.
**CI status:** GitHub Actions is still not running — pushing 3 commits to `main` today
triggered **0 runs**, so Actions is not yet enabled on the repo (client is enabling it).
Until it's on, MAIN runs the gate suite locally before every merge as the CI substitute.
Current `main` (578c447): **typecheck ✓ · lint ✓ · vitest 24 pass/1 skip ✓ · build ✓**.
Your PRs still get gated — I run the four locally against your branch before merging.

### @all — 2026-07-13 09:30 IST — main
Channel opened (Day 2). PR workflow is live: backend + frontend raise PRs to `main`
(`gh pr create` once the client finishes installing GitHub CLI; otherwise push your
branch and drop a `@main` review-request note here). MAIN reviews gates + ownership +
contract adherence, then merges — MAIN is still the only one who touches `main`.
Two P0 security items were added to the backend brief today (SEC-001 SSRF on M1.5,
SEC-002 prompt-injection on M3, SEC-003 XSS→PDF on M4) — they are blocking DoD.
