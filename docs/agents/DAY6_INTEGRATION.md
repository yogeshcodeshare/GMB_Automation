# Day-6 integration findings — authed live-read walk (Fix #2)

**MAIN agent · 2026-07-17 (sprint Day 6).** Executing PM fix-list item #2: *"Complete the
authed live-read walk (founder login) → then flip `/api/settings` and `/api/report` registry
keys → then delete `app/public/dev`."*

**Outcome:** the walk PASSES; the two flips + the deletion are each **correctly NOT done** —
every one is gated on a concrete defect or a plan-sequenced cutover step, documented below with
evidence. Surfacing these rather than flipping blind (each flip would regress UAT).

---

## 1. Authed live-read walk — VERIFIED at both reachable layers

The middleware founder-gate + Supabase SSR cookie session sit in front of every `/api/**`
(except `/login`, `/public`, `/api/public`, `/api/health`). I verified the read path around
the interactive password step (which is the founder's own UAT login):

### Data layer — `tests/live-read.walk.test.ts` (gated, 4 pass / 1 skip)
Drives the **exact** modules the ₹0 routes call, against the live cloud DB:

| Route | Module under test | Result |
|---|---|---|
| `/api/businesses` | `listBusinesses(db)` | seed rows returned (≥6) |
| `/api/dashboard/stats` | `computeDashboardStats(db)` | populated KPI object |
| `/api/settings` (GET) | `readSettings(db)` | seeded row; `dataforseo_live_enabled` fail-safe `false` |
| `/api/spend/today` | `makeSpendGuard().getStatus()` | numeric `cap_usd` / `spent_usd` |

Seed volume confirmed present: **8 businesses (6 demo), 30 reviews, 8 audits, settings row id=1.**

### HTTP layer — dev server, no session cookie
```
/api/health           HTTP 200  {"ok":true,"data":{"service":"gmb-sarathi",...}}
/api/settings         HTTP 401  UNAUTHORIZED "Founder login required."
/api/businesses       HTTP 401  UNAUTHORIZED
/api/dashboard/stats  HTTP 401  UNAUTHORIZED
/api/spend/today      HTTP 401  UNAUTHORIZED
```
Gate is live on every ₹0 endpoint. **Founder login → 200 with the seed data above = the UAT
walk.** (MAIN does not enter credentials; the founder logs in at UAT.)

---

## 2. `/api/settings` flip — BLOCKED on two defects (keep OFF)

The flip's stated purpose is "make the CR-1 toggle persist." It cannot yet:

- **B1 — client migration not applied.** `20260716000001_dataforseo_live_enabled.sql` is the
  **only** outstanding migration (713 grid, 713 is_demo, 715 ai-'fixes' all confirmed live via
  `schema-sanity.test.ts`). Without the column, `PATCH /api/settings {dataforseo_live_enabled}`
  → 500. The store even anticipates this in its error string (`store.ts:116`). **Action: client
  runs the migration.**
- **B2 — frontend field-name mismatch.** `components/shell/app-state.tsx:106` PATCHes
  `{ dataforseo_live: on }`; the contract/store field is `dataforseo_live_enabled`
  (`Settings` type + `validateSettingsPatch`). Even after B1, this body → 400 "Nothing to
  update". **Action: @frontend send `{ dataforseo_live_enabled: on }`.**

**Flip only after B1 + B2 both land.** GET is already safe live, but the sole consumer today is
the toggle PATCH, so a partial flip has no upside and a real downside (visible 400/500 at UAT
vs. today's silent local no-op).

## 3. `/api/report` flip — NO-OP (orphan key, keep OFF)

No code consults `isLive("/api/report")` or calls `apiPost("/api/report/…")`. The report page's
`genPdf` (`report/page.tsx:139`) and `sendWa` (`:151`) are deliberate mocks (`setTimeout` +
toast; source note: *"EP-006 request would carry { lang } here on Day 5"*). Flipping does
nothing. Correct posture for now — PDF is behind `FEATURE_PDF`, WA behind the Meta keys.
**Action: @frontend wire the report page to `POST /api/report/:auditId` + `/api/wa/send`; that
wiring (not a registry flip) is what turns it live.**

## 4. `app/public/dev` deletion — DEFERRED to go-live cutover

It is the frontend agent's active preview harness (`preview.tsx` aggregates dashboard pages),
and `PLAN_7DAY.md` sequences its removal at **Day-7 go-live** (`flush:demo` → delete
`app/public/dev`). Deleting on Day 6 would break the preview workflow mid-UAT-prep. Keep it.

---

## Blocker summary (for the EOD / client chase)

| # | Owner | Item | Unblocks |
|---|---|---|---|
| B1 | **Client** | Apply migration `20260716000001` | `/api/settings` PATCH persistence |
| B2 | **Frontend** | `app-state.tsx` → `{ dataforseo_live_enabled }` | `/api/settings` flip |
| B3 | **Frontend** | Wire report page → EP-006/EP-007 | `/api/report` becomes real |
| — | Cutover | Delete `app/public/dev` at Day-7 go-live | dead-route cleanup |
