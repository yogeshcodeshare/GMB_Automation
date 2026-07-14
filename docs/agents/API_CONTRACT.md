# GMB Sarathi — API Contract (v0.1, M0)

**Owner: MAIN agent.** This file + `src/types/**` are the shared contract between the
BACKEND agent (implements) and the FRONTEND agent (consumes). Neither agent edits this
file or `src/types/**` directly — propose changes in your daily handoff note (commit
message prefixed `contract-proposal:`) and the MAIN agent arbitrates and merges.
All type names below live in `src/types/` (import from `@/types`).

## Conventions

1. **Envelope** — every endpoint returns `ApiResponse<T>`:
   `{ ok: true, data: T }` or `{ ok: false, error: { code: ErrorCode, message, details? } }`.
   HTTP status mirrors the code: 400 VALIDATION_ERROR · 401 UNAUTHORIZED · 403 FORBIDDEN ·
   404 NOT_FOUND · 402 SPEND_CAP_REACHED · 429 RATE_LIMITED · 502 UPSTREAM_ERROR ·
   504 UPSTREAM_TIMEOUT · 503 FEATURE_DISABLED · 500 INTERNAL.
2. **Auth** — founder session cookie (Supabase). `middleware.ts` already 401s
   unauthenticated `/api/*` except `/api/public/*` and `/api/health`. Public endpoints
   enforce Turnstile + rate limits instead (3/IP/day, 50/day global, TB-011).
3. **Cost preview** — every PAID `POST` accepts `{ preview: true }` in the body and then
   returns `ApiResponse<CostPreview>` **without running anything**. UI shows ₹ before
   every paid action (mono, e.g. "Run audit · ₹1.9").
4. **Spend guard** — every DataForSEO call goes through `SpendGuard.guarded()`
   (`src/server/spend`). At the cap, paid endpoints return `SPEND_CAP_REACHED` (402);
   the UI shows the global red banner and disables paid buttons.
5. **Feature flags** (`src/lib/env.ts`) — `wa.service` and GBP publishing are OFF until
   keys arrive (week 2). Their endpoints exist but return `FEATURE_DISABLED` (503) with a
   human message. Code must compile and unit-test without the keys.
6. **Approve-before-publish** — publish endpoints only accept `ai_output_id` values whose
   row has `approved = true`. Approval is an explicit founder action.
7. **Devanagari** — all strings are UTF-8; Marathi (`lang: "mr"`) is a first-class value
   everywhere `Language` appears.

## Endpoints

| ID | Method + Route | Request type | Response `data` type | Milestone |
|---|---|---|---|---|
| EP-001 | `POST /api/audit` | `AuditRequest` (+ `mode?: "live"\|"demo"`) | `CostPreview` \| `AuditProgress` | M1 · UAT-2 |
| EP-002 | `GET /api/audit/:id` | — | `AuditReport` (+ `source: "live"\|"demo"`, `is_demo`) | M1 · UAT-2 |
| — | `GET /api/audit/:id/progress` | — | `AuditProgress` (poll for P2 staged UI) | M1 |
| EP-003 | `POST /api/grid` | `GridScanRequest` | `CostPreview` \| `GridScan` (queued) | M2 |
| EP-004 | `GET /api/grid/:id` | — | `GridScanResult` \| `TeleportResult` (grid_size 1) | M2 |
| — | `GET /api/grid?businessId=` | — | `GridScan[]` (history card, newest first) | M2 |
| — | `GET /api/grid/compare?before=&after=` | — | `GridCompare` | M2 |
| EP-005 | `POST /api/ai/generate` | `AiGenerateRequest` | `AiGenerateResponse` | M3 |
| EP-006 | `POST /api/report/:auditId` | `{ language?: PdfLanguage; lang?: "mr" \| "en" }` (CR-3; `language` mr\|en\|hinglish default mr, legacy `lang` honored) | `{ pdf_path: string; storage_url: string }` | M4 |
| EP-007 | `POST /api/wa/send` | `{ phone: string; pdf_path: string; summary: string }` | `{ sent: true; wa_message_id: string }` (flag off → FEATURE_DISABLED) | M4 |
| EP-008 | `POST /api/public/check` | `PublicCheckRequest` | `PublicCheckResult` | M7 |
| EP-009 | `POST /api/public/lead` | `PublicLeadRequest` | `{ lead_id: string; report_queued: boolean }` | M7 |
| EP-010 | `GET /api/gbp/oauth/start?businessId=` · `GET /api/gbp/oauth/callback` | — | `{ auth_url }` · redirect | M6 |
| EP-011 | `POST /api/gbp/post` · `POST /api/gbp/reply` | `{ business_id; ai_output_id }` | `{ published: true; gbp_ref: string }` (flag off → FEATURE_DISABLED) | M6 |
| EP-012 | `GET /api/spend/today` | — | `SpendToday` | **M0 ✅** |
| EP-013 | `POST /api/posts-audit` | `{ preview?; business_id }` | `CostPreview` \| `{ stats: PostAuditStats; posts: PostItem[]; timeline: PostTimelineBucket[] }` | M1 |
| EP-014 | `POST /api/website-audit` | `{ preview?; business_id }` | `CostPreview` \| `WebsiteAuditDetail` (`summary.psi_desktop?` optional) — **free/ungated: crawler + free PSI, zero vendor calls, no CR-1/spend gate (confirmed UAT-2)** | M1.5 |
| EP-015 | `GET /api/categories/related?kw=` | — | `CategoryIntel` | M1 |
| EP-016 | `GET /api/gbp/keywords/:businessId` | — | `Array<{ keyword: string; impressions: number }>` | M6 |
| EP-017 | `POST /api/media/inbox` (n8n webhook, secret header) · `POST /api/gbp/media/:id/publish` | — | `MediaInboxItem` · `{ published: true }` | M9 |
| EP-018 | `POST /api/review-request` | `{ business_id; customer_phone }` | `ReviewRequest` | M9 |
| EP-019 | `POST /api/service-report/:businessId` | `{ month: string }` | `{ pdf_path; sent: boolean }` | M9 |
| EP-020 | `POST /api/bulk/festival` | `{ festival: string }` | `Array<{ business_id; result: "published" \| "copied_manual" \| "failed" }>` | M9 |
| EP-021 | `POST /api/sprint` · `PATCH /api/sprint/:id` · `GET /api/sprint?businessId=` · `GET /api/sprint/:id` | `SprintStartRequest` · `SprintPatchRequest` | `SprintDetail` (`?businessId=` → `SprintDetail \| null`; `:id` → `SprintDetail`) | M6 |
| — | `GET /api/sprint/prereqs?businessId=` | — | `SprintPrereqs` (US-024 gate — 5 checks + `eligible` + `active_sprint_id`) | M6 |
| EP-022 | `POST /api/sprint/:id/report` | `SprintReportRequest` | `SprintReportResponse` (partial when no after-audit) | M6 |
| — | `GET /api/businesses/resolve?name=&city=` (`&mode=demo`) | — | `BusinessCandidate[]` (P2 picker; live = one guarded serp/maps call ~$0.0006, preview via `?preview=1`; **`mode=demo` → labeled synthetic candidates, ₹0, no vendor call**) | M1 · UAT-2 |
| — | `GET /api/dashboard/stats` | — | `DashboardStats` (P1 KPI strip; derived from existing tables, ₹0) | M1 |
| — | `GET /api/businesses` · `GET /api/businesses/:id` | — | `BusinessListItem[]` · `Business` | M1 |
| — | `PATCH /api/businesses/:id` | `Partial<Pick<Business, "is_client" \| "plan" \| "owner_name" \| "owner_whatsapp">>` | `Business` | M1 |
| — | `GET /api/reviews/:businessId` | query: `filter` | `{ stats: ReviewStats; reviews: ReviewItem[]; cloud: KeywordCloudItem[]; trend: ReviewTrendPoint[] }` | M1 |
| — | `GET /api/settings` · `PATCH /api/settings` | `Partial<Settings>` (PATCH) | `Settings` (P11 "Data sources" toggle incl. `dataforseo_live_enabled`, founder-auth) | CR-1 |
| — | `GET /api/ops/cycles?month=YYYY-MM` | — | `ServiceCycle[]` (P9 client-ops read; ₹0) | M9-read |
| — | `GET /api/ops/today` | — | `TodaysWorkItem[]` (P9 today strip; ₹0) | M9-read |
| — | `GET /api/spend/ledger?limit=` | — | `SpendLedgerEntry[]` (P11 ledger table — reads real `spend_ledger` rows; ₹0) | CR-1 |
| — | `GET /api/health` | — | `{ service; ts }` (public) | **M0 ✅** |

Unnumbered rows are contract additions the pages in §2.7b require; MAIN agent owns their
numbering if the PM assigns IDs later.

### P12 Optimization Sprint — LOCKED invariants (Day 6; types in `@/types` `sprint.ts`)

Manual mode this sprint (ADR-010): **zero GBP API writes** — "apply a fix" = copy
`suggested_value`/`copy_text` → open `editor_url` (an allowlisted Google-editor UI host,
opened in the founder's browser, **never fetched server-side, never carries a token**) →
edit by hand → log `change_before`/`change_after`. Enforced by contract + these rules:

1. **US-024 gate is server-side.** `POST /api/sprint` re-runs all 5 `SprintPrereqs` checks
   (client+plan · owner contact · connection oauth\|manager · a **scored** audit ≤7d ·
   no active sprint) and rejects with `FORBIDDEN` (gate) / `CONFLICT` (already active).
   The `GET /api/sprint/prereqs` result is advisory only — never trusted for creation.
2. **Approve-before-publish (#4).** AI-prefilled `source='audit'` tasks persist
   `approved=false`. The copy control, `editor_url`, and the `task_status='done'`
   transition are **gated on `approved=true`**; `done` also requires a non-empty
   `change_after`. `source='manual'` tasks need no approval. `add_custom_task` cannot set
   `source='audit'` or supply `suggested_value`/`ai_output_id` from the client.
3. **Baseline is immutable (TB-017, #3).** Captured at create; a DB trigger (migration
   `20260717000001`) rejects any change to `baseline_*` once set and freezes the row once
   `status='complete'`. `SprintPatchRequest` carries no baseline/after fields; the route
   validates against the strict shape (unknown keys → `VALIDATION_ERROR`).
4. **No paid calls (#7).** `POST`/`PATCH`/report read existing TB-002/003/004 rows only.
   `complete_sprint` links `after_*` from the latest **already-existing** scored audit/grid
   and **never** triggers EP-001 or a grid scan; if none exists, `after_*=null`.
5. **EP-022 degrades gracefully** in the CR-1-OFF world: with no after-audit, the report is
   **partial** — `final_score`/`rubric_deltas`/`grid` empty, `field_changes` + `work_log`
   still rendered. WhatsApp send stays behind the wa flag (`wa_status` explains `sent=false`;
   the PDF is always produced). `storage_url` is the user-facing link.

**Requires client migration `20260717000001_sprint_p12_hardening.sql`** (4 `fix_tasks`
columns + baseline NOT NULL + one-active index + immutability trigger) before the backend
endpoints run live. UAT tonight uses seed data (defaults apply) — not blocked.

### EP-001 demo mode — LOCKED (UAT-2; types in `@/types` `audit.ts`)

`AuditRequest.mode` (default `"live"`) selects provenance; the UI sends `"demo"` whenever CR-1
live-data is OFF so New Audit always produces realistic, badge-able data:

1. **`mode:"demo"` = full pipeline, synthetic input.** The backend runs the SAME scoring
   pipeline (`buildSnapshot → insertAudit/Scores`) against a **deterministic, fixture-derived
   synthetic generator** (varied per business name/seed; reproducible) — never `makeDataForSeoClient`.
   Persist `businesses.is_demo=true` + snapshot `source:"demo"`. Cost preview = **₹0**.
2. **`mode:"live"` = current behaviour** — `assertLiveDataEnabled` (CR-1 gate → `LIVE_DATA_DISABLED`
   503 when OFF) + spend guard + DataForSEO. Unchanged.
3. **EP-002 surfaces provenance:** `AuditReport.source` (`"live"|"demo"`) + `is_demo` → every
   screen badges "Demo data". Map snapshot `source`: `dataforseo→live`, `demo|fixture→demo`.
4. **SEC posture (demo path) — I gate on all three:** (a) **ZERO vendor calls** — the demo branch
   must not construct/call the DataForSEO client (prove with a poisoned-`fetch` test, sprint-engine
   style); (b) **`is_demo=true`** on the business so `flush:demo` reaps it (audits cascade-delete);
   (c) **ZERO spend** — skip the spend guard, assert `spend_ledger` unchanged after a demo audit.
5. **EP-014 website audit stays free/ungated** — crawler + free PSI only, no vendor/CR-1/spend
   gate (confirmed). Website-only audits work regardless of `mode`.

@backend: the demo generator IS the `a1111111` backfill pattern generalized (fixture input →
`buildSnapshot`) — reuse it, and it also closes UAT-4 (seed-wide backfill = demo audits).

## Error examples

```json
{ "ok": false, "error": { "code": "SPEND_CAP_REACHED",
  "message": "Daily spend cap reached: spent $1.0000 + estimated $0.0150 exceeds cap $1.00. External calls paused until tomorrow." } }
```

```json
{ "ok": false, "error": { "code": "FEATURE_DISABLED",
  "message": "WhatsApp sending is not configured yet — keys arrive in week 2. The PDF was saved to storage." } }
```

## Cost model (for previews — §2.6)

| Operation | Estimate |
|---|---|
| Full audit (info + reviews + posts + 3 competitors) | $0.015–0.025 (₹1.4–2.4; UI shows ₹1.9 default) |
| + Top-5 competitors | +$0.004 |
| Website audit (PSI is free; optional OnPage) | +$0.003 |
| Grid point (standard) | $0.0006 · 3×3 ≈ ₹0.5 · 5×5 ≈ ₹1.4 · 7×7 ≈ ₹2.7 |
| Teleport (single point) | ≈ ₹0.2 |
| Public check (basic pull) | ≈ $0.002 |
| USD→INR display rate | fixed 85 (constant `INR_PER_USD` — backend exports from `src/server/costs.ts`) |

## Versioning

Contract version bumps in this header + a line in `docs/CHANGELOG.md`. Breaking changes
need a MAIN-agent commit; additive optional fields may ship same-day after a handoff note.
