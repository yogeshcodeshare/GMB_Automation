# GMB Sarathi — ERD (Engineering Requirements) — v1.8

*(Part 2 of the combined blueprint. Stack: Next.js 14 + TypeScript · Supabase PostgreSQL · interim deploy Vercel, final Docker on Hostinger KVM2 VPS. DB type: SQL/Postgres.)*

# PART 2 — ERD (How)

## 2.1 Architecture

```
[Browser: founder]        [Browser: prospect]        [Optional M8: companion
       │ (Supabase auth)         │ (public, limited)   Chrome extension → calls API]
       ▼                         ▼                          │
┌─────────────────────────────────────────────────────────────┐
│  Next.js app (Docker on existing Hostinger KVM2 VPS,        │
│  behind nginx + Let's Encrypt)                              │
│  ├── UI (dashboard, audit, grid, reviews, posts, ops, pub)  │
│  └── API routes (server-side only)                          │
│      ├── dataforseo.service   ←— THE ONLY PAID SERVICE      │
│      ├── website.service (own crawler + free PSI API)       │
│      ├── gbp.service (OAuth; info+posts+replies+media+perf) │
│      ├── ai.service (OpenRouter free models)                │
│      ├── score.service (rubric, deterministic)              │
│      ├── pdf.service (Playwright + Noto Devanagari)         │
│      └── wa.service (existing Meta Cloud API + buttons)     │
└──────────────┬──────────────────────────────────────────────┘
               ▼
   Supabase (free): Postgres + Auth + Storage (PDFs, client photos)
               ▲
   n8n (existing, same VPS): crons — weekly grids, monthly client
   reports, review digests, media inbox webhook, failure alerts
```

## 2.2 Architecture Decision Records

- **ADR-001 — DataForSEO is the ONLY external data vendor** (place info, reviews, posts via `my_business_updates`, Maps SERP, Local Finder, keyword volume, optional OnPage). **No Google billing card anywhere.** Self-imposed daily spend cap.
- **ADR-002 — OpenRouter free models only.** 50 req/day keyless; optional one-time $10 unlocks 1,000/day. Fallback chain.
- **ADR-003 — Leaflet + OpenStreetMap tiles** (₹0), not Google Maps JS.
- **ADR-004 — Deploy target: Hostinger VPS via Docker Compose.** *Interim (first ~2 dev weeks): Vercel free tier — keep pdf.service behind a feature flag (Playwright needs the VPS or @sparticuz/chromium) and run schedulers via Vercel Cron with an n8n-portable job interface. AI provider chain: Groq key first (OpenAI-compatible), OpenRouter free models as fallback.*
- **ADR-005 — Single Supabase project, RLS everywhere; all data routes server-side.**
- **ADR-006 — GBP APIs only for owned/managed profiles** (free, no billing; OAuth consent "testing" mode, up to 100 test users). Scopes: business info, posts, review replies, media, **Performance API**.
- **ADR-007 — Website audits via own crawler + PageSpeed Insights API** (free key) with DataForSEO OnPage optional.
- **ADR-008 — Browser-overlay UX deferred to optional M8 companion extension.**
- **ADR-010 — Access & entitlements.** No client passwords, ever. Client-profile access = GBP Manager invite (day-1, manual) or OAuth connect (TB-009, encrypted tokens, Google consent screen on the CLIENT's device). Per-client service entitlements stored as `businesses.plan` (base package + add-ons: gmb_boost / content / whatsapp / social / ads); P9 quotas and publish actions are gated by plan. *(v1.5)*
- **ADR-009 — Service-delivery ops (M9) built on free GBP APIs + n8n only; scheduled jobs never call DataForSEO beyond the monthly grid already budgeted.** *(v1.3)*

## 2.3 Database schema (TB-IDs)

| Table | Purpose | Key fields |
|---|---|---|
| TB-001 `businesses` | Every business audited | id, name, city, place_id, cid, lat, lng, website, is_client, gbp_location_id, **plan jsonb**, connection_status (none/manager/oauth), **owner_name, owner_whatsapp (for reports/updates)** *(v1.7)* |
| TB-002 `audits` | One row per audit run | id, business_id, raw_snapshot jsonb, competitor_ids[], created_at |
| TB-003 `audit_scores` | Rubric breakdown | audit_id, total, claimed, category, completeness, photos, reviews_count, reviews_velocity, reply_rate, posts, website, nap |
| TB-004 `grid_scans` | Scan header | id, business_id, keyword, grid_size, radius_m, status, avg_rank, cost_usd |
| TB-005 `grid_points` | One per pin | scan_id, lat, lng, rank (null = not in top 20) |
| TB-006 `reviews_cache` | Latest N reviews | business_id, review_id, rating, text, author, review_ts, replied |
| TB-007 `ai_outputs` | Generated content | id, business_id, type, lang, output, approved |
| TB-008 `leads_public` | Public checker leads | id, phone, business_name, consent_ts, score_shown, report_sent |
| TB-009 `gbp_connections` | OAuth tokens | business_id, refresh_token (encrypted), scopes, connected_at |
| TB-010 `spend_ledger` | Every DataForSEO call | id, endpoint, cost_usd, task_id, created_at |
| TB-011 `settings` | Caps & config | daily_spend_cap_usd, public_daily_limit, model_chain |
| TB-012 `posts_cache` | Competitor/own GBP posts | business_id, post_ts, text, char_count, has_media, links |
| TB-013 `website_audits` | On-page results | business_id, psi_score, title_ok, meta_ok, h1_ok, schema_ok, nap_match, city_kw, checked_at |
| TB-014 `service_cycles` | Monthly ops per client *(v1.3)* | id, business_id, month, posts_done/target, photos_done/target, replies_pct, report_sent, checklist jsonb |
| TB-015 `media_inbox` | Client photos via WhatsApp *(v1.3)* | id, business_id, storage_path, received_ts, published bool, gbp_media_id |
| TB-016 `review_requests` | Review-ask machine *(v1.3)* | id, business_id, customer_phone, sent_ts, reminded_ts, review_detected bool |
| TB-017 `optimization_sprints` | Before/after proof *(v1.6)* | id, business_id, started_at, baseline_audit_id, baseline_grid_id, after_audit_id, after_grid_id, status, completed_at |
| TB-018 `fix_tasks` | Sprint work items *(v1.6)* | sprint_id, rubric_key, title, status (todo/doing/done/blocked), source (audit/manual), done_at, note, change_before, change_after |

## 2.4 API endpoints (EP-IDs)

| ID | Route | Does |
|---|---|---|
| EP-001/002 | `POST /api/audit`, `GET /api/audit/:id` | full audit pipeline; fetch |
| EP-003/004 | `POST /api/grid`, `GET /api/grid/:id` | grid/Teleport create + poll |
| EP-005 | `POST /api/ai/generate` | AI content via free-model chain |
| EP-006/007 | `POST /api/report/:auditId`, `POST /api/wa/send` | PDF; WhatsApp send |
| EP-008/009 | `POST /api/public/check`, `POST /api/public/lead` | public checker + lead |
| EP-010/011 | `/api/gbp/oauth/*`, `POST /api/gbp/post|reply` | connect; publish |
| EP-012 | `GET /api/spend/today` | cap guard middleware |
| EP-013/014 | `POST /api/posts-audit`, `POST /api/website-audit` | post + website audits |
| EP-015 | `GET /api/categories/related?kw=` | category intel + volume |
| EP-016 | `GET /api/gbp/keywords/:businessId` | Performance API search keywords *(v1.3)* |
| EP-017 | `POST /api/media/inbox` (n8n webhook), `POST /api/gbp/media/:id/publish` | photo pipeline *(v1.3)* |
| EP-018 | `POST /api/review-request` | send ask + schedule reminder *(v1.3)* |
| EP-019 | `POST /api/service-report/:businessId` | monthly client report (n8n cron) *(v1.3)* |
| EP-020 | `POST /api/bulk/festival` | hours + creative across all clients *(v1.3)* |
| EP-021 | `POST /api/sprint` `PATCH /api/sprint/:id` | start (locks baseline), update tasks, complete (locks after-state) *(v1.6)* |
| EP-022 | `POST /api/sprint/:id/report` | Before/After Improvement Report PDF (score delta, rubric deltas, field changes, grid compare, work log) → WhatsApp *(v1.6)* |

## 2.5 Scoring rubric (deterministic, no AI)

claimed +10 · primary category vs competitor mode +15 · completeness +15 · photos +10 · reviews: count percentile +10, 90-day velocity +8, reply-rate +7 · posts last 30 days +10 · website (linked + basics pass) +10 · NAP +5 = **/100** (red <40, amber 40–70, green >70). Website section renormalises if no site.

## 2.6 DataForSEO integration & unit costs (verified July 2026)

| Endpoint | Used for | Mode | Cost/unit |
|---|---|---|---|
| `business_data/google/my_business_info` | audit target + competitors | live | ~$0.002/task |
| `business_data/google/reviews` | last 30–50 reviews | standard | ~$0.00075/task + per-10-reviews |
| `business_data/google/my_business_updates` | Post Audit (any profile) | standard | ~$0.00075–0.002/task |
| `serp/google/maps` | grid points, Teleport | standard $0.0006 / live $0.002 | per query |
| `serp/google/local_finder` | competitor discovery | standard | ~$0.0006–0.002 |
| `keywords_data` | category traffic potential | standard | fractions of a paisa/keyword |
| `on_page` (optional) | deeper website audit | standard | ~$0.000125+/page |

**Per-operation:** full audit ≈ **$0.015–0.025 (₹1.4–2.4)**; 5×5 grid standard ≈ $0.015 (~₹1.4). **Monthly heavy use ≈ $2.5–5 (₹240–480)**; $50 deposit (never expires; $1 trial first) lasts **10–20 months**. Guard: EP-012 blocks at daily cap.

## 2.7b Page & field inventory (production UI spec — see GMB_Sarathi_UI_Mockup.html)

| # | Page | Key fields | Primary actions |
|---|---|---|---|
| P1 | **Dashboard** | KPI cards (audits this week, leads, spend today/cap, clients green/amber); businesses table (name, city, score badge **+ sprint delta badge (e.g., 78 ▲37)**, last audit, Client/Prospect tag **+ connection dot (●/○/–)**, actions) | New Audit · open business |
| P2 | **New Audit** | name+city search → candidate cards → manual place_id/CID fallback; options (competitors, website audit, post audit); **states: staged running progress (profile→reviews→posts→competitors→website→scoring), no-results, cap-hit-disabled** | Run audit (cost preview ₹) |
| P3 | **Audit Report** | score gauge /100 + band; rubric checklist (10 rows, ✔/✖/⚠ + points); business card (IDs, hours w/ sanity flags, attributes, categories); links pack (25 grouped links); top-5 fixes (AI, Marathi/English toggle) | Generate PDF · send WhatsApp · re-audit |
| P4 | **Competitor Compare** | side-by-side: categories, services count, rating, reviews, velocity, reply-rate, photos, distance; AI strengths/weaknesses per competitor | Add competitor · export section |
| P5 | **Grid Scan / Teleport** | keyword, grid size (1/3×3/5×5/7×7), radius; realistic map (Leaflet/OSM in prod) with rank pins; avg rank, % in top-3, weak-direction note, rank≠demand card; **pin-click popover (rank + top-5 at that point + distance); "who owns this area" table (per business: avg rank, best/worst, top-3 count, distance, Compare→); map/table view toggle; Teleport result = pin + business↔pin distance + full top-10 list; before/after compare incl. per-business rank movement** | Run scan (cost preview) · compare runs |
| P6 | **Review Inbox** | KPI row + **review-quality strip (textless count, Local Guides, avg reviews/reviewer, 30d/6m/1y counts)**; filters; review rows (stars, author, reviewer-stats, text, replied badge); bilingual keyword cloud; trend chart (dates >1yr approximated) | AI reply (lang/tone) → approve → publish (managed) |
| P7 | **Post Audit** | metric cards (total, frequency, avg chars/words, with links/images/videos); timeline chart; post list (date, text, media, links) | Compare vs competitor |
| P8 | **AI Tools** | **7 differentiated mini-tools**, shared lang/tone/usage-meter/history: ① GBP Post (topic, CTA type, photo from Media Inbox, 1,500-char counter, Google-post preview) ② Review Reply (**review picker** of pending reviews, quoted context, threaded preview) ③ Description (current read-only + keyword chips + 750-char counter, before/after compare) ④ Q&A (question input + "suggest 5", Q&A-pair list, bulk save) ⑤ Facebook Post (emoji level, link toggle, FB-style preview, cross-post note) ⑥ Festival Creative (festival + template picker + offer line, 1080×1080 preview) ⑦ **Category Finder** (current categories chips, related categories w/ search-volume badges, related services, from-website, from-chat, Trends link, apply-to-audit) | Generate · copy · save · queue to publish |
| P9 | **Client Ops (M9)** | **plan-aware** quotas; **"Today's work" strip (one-tap pending actions across ALL clients, inline)**; per-client month checklist; media inbox grid (WhatsApp photos → publish); review-request log; bulk festival action; NAP tracker; business-info editor + change log; **manage-plan popover on plan chips; "view last report" link + sprint-result chip** | Publish photo · send review request · run monthly report |
| P3b | **Website Audit detail** *(nav item under Business Workspace; feeds the Website rubric row)* | NAP match table (GBP vs website vs status); title-tag check; meta-description check + 2 AI suggested replacements; local keywords in content/headings; hours match table; category-pages check; content-depth scale (word count); spelling issues; H1–H6 heading tree with skip flags; click-to-call check; PSI mobile score chip | Copy suggestions · re-crawl |
| P10 | **Public Score Checker** (no login) | shop name+city input → gauge + 2 visible problems + blurred list → phone + consent → "report on WhatsApp" | Rate-limited check · lead capture |
| P11 | **Settings & Spend** | DataForSEO key status, daily cap, spend today/month (ledger chart), model chain, WhatsApp sender status, GBP connections list | Edit caps · reconnect OAuth |

| P12 | **Optimization Sprint** *(v1.6, paid clients only — plan-gated)* | Sprint header (status, baseline locked chip); fix checklist **grouped by audit source — Profile / Reviews / Posts / Website / Visibility / Citations** (~23 tasks incl. secondary categories, attributes/UPI, Products, booking link, logo/cover, opening date, social links, service-area, UTM link, review-machine launch, website vendor sub-tasks with **"copy brief for vendor"**, weak-zone action, citation fixes, **+ add custom task**; each task AI-prefilled, expandable → inline edit → GBP API write or manual-mode copy, status todo/doing/done/blocked, timestamp, Notify toggle); projected-score simulator; baseline vs current mini-compare; actions: Re-audit (cost preview), Generate Before/After report (PDF), Send on WhatsApp, Complete sprint | Start/complete sprint · edit fields · publish report |

IA rule (v1.6): **Business Workspace = analysis of ANY business (sales/general); Tools = paid-client work** (AI Tools, Optimization Sprint, Client Ops). Optimization Sprint shows a locked state for prospects ("Mark as client to start").

Workflow wiring: P1→P2→P3(→P4/P5/P6/P7 tabs of a business) → P8 anywhere · P9 only for is_client=true · P10 public route · P11 founder-only.

## 2.7 NFRs

Audit <5 min; public check <10 s. Keys server-side; RLS; rate limits + Turnstile; encrypted GBP tokens. Docker restart policies; n8n failure alerts; weekly VPS snapshot. Bilingual outputs; Noto Devanagari in PDFs. Hard daily spend cap.

---



## 2.9 Seed data (for local dev & demo)

- 6 demo businesses (TB-001): मनोवेध हिप्नोक्लिनिक (prospect, score 41, the fixture), Hotel Sahyadri Veg (client ●, GMB Boost + Content Pack, 74), श्री डेंटल केअर (client ●, Boost + WhatsApp, 58), Patil Coaching Classes (client ○ Manager, Boost, 66), कृष्णा मिसळ हाऊस (prospect, 34), Elegance Beauty Salon (prospect, 49).
- 1 full audit + scores for मनोवेध loaded from `fixtures/` (BasicAudit.md / ReviewAudit.md / WebsiteAudit.md — parse into TB-002/003/006/012/013).
- 3 grid_scans history rows for मनोवेध (avg 7.8 → 6.1 → 4.6) with 25 grid_points each.
- settings row: daily_spend_cap_usd=1.00, public_daily_limit=50, per_ip_limit=3.
- 1 optimization_sprint (active, day 9) + 23 fix_tasks per §2.7b P12 demo states.
