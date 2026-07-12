# GMB Sarathi — Development Blueprint (PRD + ERD + Milestones) — v1.4 (production-ready)

**Project:** Own GMB audit & management tool ("GMB Sarathi" — working name; = charioteer/guide in Marathi)
**Goal type:** Internal agency tool (v1) → white-label product (v2, later)
**Owner:** Solo founder, Karad | **Prepared:** 11 July 2026 (v1.4 — production-ready: parity matrices + service layer + real-audit field spec, validated against a live Karad audit) | **Format:** Blueprint Forge conventions (PRD → ERD → Milestones, traceability IDs)
**Hard constraint:** The ONLY paid service is **DataForSEO**. Everything else must run at ₹0 (no Google billing card, no SaaS subscriptions).

---

# PART 1 — PRD (What & Why)

## 1.1 Problem & North Star

GMB Everywhere costs $30/mo for unlimited use and reports in English dashboards. Dhanda AI (₹11,999/yr) is a consumer app. Neither delivers what the agency needs: unlimited audits + geo-grids + AI content, branded to the agency, delivered in **Marathi over WhatsApp**, at near-zero cost, plus a public lead-magnet page — and neither runs the agency's actual monthly service delivery.

**North Star Metric (NSM):** Audit reports generated per week that lead to a sales meeting or client retention action.

**Goal metrics:**

| ID | Goal | Target | Deadline |
|---|---|---|---|
| GM-001 | Replace GMB Everywhere Power User for internal use | ₹0/mo software spend | 31 Oct 2026 |
| GM-002 | Business name in → branded Marathi PDF audit out | < 5 minutes end-to-end | M4 exit |
| GM-003 | Geo-grid scan cost | < ₹5 per 5×5 scan | M2 exit |
| GM-004 | Public "Google Score" checker captures leads | ≥ 10 WhatsApp leads/month | 30 Nov 2026 |
| GM-005 | Full running cost at 20 clients | < ₹500/month (DataForSEO only) | ongoing |
| GM-006 | GMB Boost service delivered through the tool | ≥ 8 h/month founder time saved at 5 clients | M9 exit |

## 1.2 Users & Jobs-To-Be-Done

| User | JTBD |
|---|---|
| U1 Founder (only login, v1) | "When I meet a business owner, I need a professional audit with proof in minutes — and when they become a client, the tool should run their monthly service with me." |
| U2 Prospect (public page) | "I want to know free of cost how my shop looks on Google, without learning anything technical." |
| U3 Client (v2 portal — OUT of v1 scope) | "I want to see what my agency is doing for me." |

## 1.3 Full GMB Everywhere parity matrix (every Power User feature mapped)

| GMB Everywhere feature | In GMB Sarathi? | How (data source) | Module |
|---|---|---|---|
| Unlimited Audit / Category / AI / Teleport / Local Scan / Website Audit views | ✔ Unlimited by design (self-hosted; only per-call DataForSEO cost) | — | all |
| Works in all locations / unlimited GBP listings | ✔ | DataForSEO supports any lat/lng worldwide | all |
| **Basic Audit** — Place ID, CID, Knowledge ID, services, attributes, categories, GBP links (review-request link etc.), 40+ data points | ✔ (~90%: every field that matters) | `my_business_info` returns IDs, attributes, categories, services; review-request link constructed from Place ID | M1 |
| **View Competitor Category** — primary + all secondary categories of any business | ✔ in dashboard (paste name/URL → instant) | `my_business_info` | M1 |
| — "always displayed while browsing Google Maps" overlay | ⚠ Only via a small companion Chrome extension (optional M8) — a web app cannot overlay Google Maps | Private Manifest-V3 extension calling OUR backend; load-unpacked, personal use | M8 (optional) |
| **Category Finder** — related categories from real data | ✔ | Aggregate categories of top performers per keyword (`local_finder` scans) | M1 |
| — service suggestions per category | ✔ | Static taxonomy + AI suggestions | M1/M3 |
| — traffic potential per category | ✔ | DataForSEO Keyword Data (search volume) — same vendor | M1 |
| — category suggestions from website URL | ✔ | Crawl site → AI classification | M1.5/M3 |
| — category suggestions from AI chat | ✔ | OpenRouter free models | M3 |
| **Review Audit** — trends, analysis, common keywords, filtering | ✔ | `reviews` endpoint → trend chart, keyword extraction, UI filters | M1 |
| **Post Audit** — competitor post timeline, frequency, content, media & links | ✔ **(verified July 2026)** | DataForSEO `my_business_updates` returns posts of ANY profile | M1 |
| — "post performance insights" | ⚠ Approximated (frequency/recency/content stats) — true impressions are private to profile owners, for every tool incl. GMB Everywhere | computed metrics | M1 |
| **Teleport** — rank at any location, any term, worldwide | ✔ | Single-point `serp/google/maps` query at chosen lat/lng | M2 |
| **Local Scan** — compare competitors in one click (categories, services, reviews, location advantage, attributes) | ✔ (Compare view + geo-grid) | `local_finder` + `my_business_info` batch; distance calc | M1+M2 |
| **Website Audit** | ✔ | Own crawler (title/meta/H1/schema/NAP/city keywords) + Google PageSpeed Insights API (free key, **no billing card**) + optional DataForSEO OnPage | M1.5 |
| **AI GMB Post / Review Response / Description / Q&A / Facebook Post generators** | ✔ all five | OpenRouter free models, Marathi + English prompts | M3 |
| View unlimited GMB categories | ✔ | Static taxonomy (~4,000) + live competitor data | M1 |

## 1.3b Dhanda AI parity matrix (verified from dhanda.app, Play Store + app screenshots)

| Dhanda AI feature | In GMB Sarathi? | How | Module |
|---|---|---|---|
| FREE Google Score (checklist: lifetime reviews, active days, review responded, ratings, description, verification, categories + /100 gauge) | ✔ | score.service rubric covers every checklist item | M1 |
| Top Keywords ("Best Restaurants near me — 106 searches") | ✔ for managed clients | **Business Profile Performance API (free)** — own-profile search-keyword impressions; prospects: category+city volume via DataForSEO keywords_data | M6 |
| Competitor analysis (reviews, ratings, photo count, address, strengths/weaknesses) | ✔ | `my_business_info` batch (incl. photo counts) + AI strengths/weaknesses summary | M1 |
| AI review replies, SEO-friendly, pending-queue | ✔ | M3 generators + M5 review inbox + M6 publish | M3/5/6 |
| **Daily WhatsApp reports + approve/edit buttons** ("Yes, perfect reply / No, I want to edit") | ✔ | n8n daily cron → new-review alert → AI draft → WhatsApp interactive buttons → approve publishes via GBP API | M6 |
| AI social content (captions) + one-click FB & Instagram posting | ✔ | M3 generators + existing n8n Meta Graph flows | M3/M6 |
| AI-generated images / product shots | ⚠ Partial by design | Template engine (client photos + HTML/CSS layouts) — no gen-AI image API at ₹0 under the DataForSEO-only rule | M6 |
| Festival posts | ✔ | 12-festival creative engine | M6 |
| Monthly Google updates (posts/offers/images) | ✔ | GBP publishing + n8n scheduler | M6 |
| Ranking progress tracking | ✔ better (geo-grid vs single trend) | M2 grids + history compare | M2 |

**Dhanda verdict: 9 of 10 fully covered; AI image *generation* is the single deliberate partial (template creatives instead, ₹0). Our geo-grid, PDF reports and Marathi delivery go beyond Dhanda.**

## 1.3c Agency service-delivery matrix (v1.3 — the tool DELIVERS your GMB Boost package)

Your ₹2,999/month GMB Boost service (main report Ch.5.6) mapped to tool modules — the tool becomes your operations platform, not just an audit tool:

| GMB Boost deliverable (what the client pays for) | In tool? | How | Module |
|---|---|---|---|
| 4–8 GBP posts/month (offers, updates, festivals) | ✔ planned | Content queue + n8n scheduler → GBP publish | M6 |
| AI review replies within 24h (approve on WhatsApp) | ✔ planned | Daily digest + approve/edit buttons → GBP API | M6 |
| Review collection system (QR + after-sale WhatsApp ask) | ✔ NEW | Per-client review-link + QR generator; WhatsApp review-request template sender + 3-day reminder; new-review attribution | M9 |
| 10 fresh photos/month | ✔ NEW | Owner sends photos on WhatsApp → media inbox → one-click publish to GBP (media endpoint; manual fallback) | M9 |
| Monthly Marathi report on WhatsApp (calls, searches, ranking map, reviews growth, work done) | ✔ NEW | Scheduled per-client report: Performance API metrics + grid compare + review stats + delivery checklist → PDF → WhatsApp (n8n cron, 1st) | M9 |
| Festival hours & creatives across ALL clients | ✔ NEW | One-click bulk: special hours update + festival post for every connected client | M9 |
| Profile completeness upkeep (hours, services, description) | ✔ NEW | Edit forms → Business Information API; per-client change log | M9 |
| Monthly rank tracking per client | ✔ planned | Scheduled grid scans + before/after compare | M2 |
| NAP/citation checklist | ✔ NEW | Manual checklist tracker per client (no API needed) | M9 |
| Delivery accountability ("did I do everything this month?") | ✔ NEW | Per-client monthly ops checklist widget (posts 4/8, photos 6/10, replies 100%, report sent ✓) | M9 |

All of M9 runs on the **free GBP APIs + existing WhatsApp/n8n** — ₹0 added cost; DataForSEO usage unchanged. Q&A seeding excluded (Google killed the Q&A API in Nov 2025).

## 1.3d Validated against a real Karad audit — the Manovedh fixture (v1.4)

The founder audited a real Karad business (Manovedh Hypnoclinic, Somwar Peth) with GMB Everywhere and archived every output (Basic/Review/Website/Post audits, Rank Check, Category Finder, AI tools). That data now defines the production spec and the acceptance test:

**Real findings the tool must reproduce (M1 acceptance fixture — expected score ≈ 40–55/100 amber):** claimed ✔ · 4.9★/30 reviews ✔ · **phone missing** ✖ · primary category "Hospital" — generic/wrong vs "Mental health clinic / Hypnotherapy service" ✖ · **services list empty** ✖ · suspicious hours (12–9 AM blocks = entry error) ⚠ · owner reply-rate **6.67%** ✖ · 0 review photos ⚠ · velocity ~1.2–1.3/month ⚠ · **7 posts total, one per 293 days**, 171 chars avg, 4 with images ✖ · rank #1 for the niche term "hypno clinic" near the pin (rank ≠ demand — pair rank with search volume) ℹ · website on a rented subdomain (grexa.site) ⚠ · NAP phone mismatch ✖ · meta description missing category/locality ✖ · no category page ✖ · broken heading hierarchy (H2→H5 skips) ⚠ · spelling issue ("Minde") ⚠.

**Build items this real data adds (all in M1/M1.5 scope):**

| Addition | Detail |
|---|---|
| **Link-generator pack (~25 links, pure string templates — zero API cost)** | From place_id/CID/KG-ID/domain: review-request & review-list links, knowledge-panel, posts, products, services, **other-GMBs-at-same-address (duplicate check)**, same-domain GMBs, Apple/Bing/HERE maps + competitors-nearby, Facebook Places, Yelp, **Google Ads Transparency + FB Ad Library (is the business already advertising?)**, Google Trends, site: index checks (all/week/month/6mo), PSI, rich-results test, robots.txt, sitemap.xml, OG preview, WHOIS, BuiltWith, Wayback |
| New audit checks | phone-missing · services-empty · hours-sanity (overnight/24h anomalies) · generic-category vs competitor mode · review-photos count · Local-Guide count · avg-reviews-per-reviewer (review-quality signal) · reply-rate · velocity 30d/6m/1y · rented-subdomain detector (grexa/wixsite/blogspot etc.) |
| Review analytics parity | cumulative timeline (dates >1yr approximated — label it, like GMB Everywhere does) · **bilingual keyword analysis** (Marathi + Hinglish + English tokenizer, dual stopword lists, unigrams + bigrams) · owner-response extraction |
| Post-audit metrics parity | total analyzed, frequency (every X days), avg chars & words, posts with links/images/videos, monthly bars + cumulative line |
| Category Finder parity | related categories **with search-volume badges** (keywords_data), related services per category, categories-from-website, categories-from-chat, Google Trends compare link |
| Rank check parity | term + pin (distance business↔pin shown) + rank + top-10 list — our grid generalises this |

**Beyond both tools (our additions):** score /100 rubric, branded Marathi PDF, WhatsApp delivery, scan history + before/after compare, public lead-magnet page, full service-delivery ops layer.

## 1.4 User stories (traceability IDs)

- **US-001** Enter business name/Place ID → full audit with score /100 in <5 min.
- **US-002** Target vs top-3 competitors side by side (categories, services, attributes, reviews, velocity, reply rate, distance advantage, photo counts, AI strengths/weaknesses).
- **US-003** Geo-grid scan (3×3/5×5/7×7, radius 0.5–5 km) → heatmap + average rank; Teleport = single-point scan anywhere.
- **US-004** AI replies for any review, Marathi/English, agency tone.
- **US-005** AI GBP posts, descriptions, Q&A drafts, Facebook posts.
- **US-006** Branded PDF (Marathi headings, logo, before/after-ready) per audit.
- **US-007** One-click send of PDF to any WhatsApp number.
- **US-008** History of every audit/scan/report per business, score trends.
- **US-009** Public page: partial score → full report on WhatsApp after number + consent.
- **US-010** Connect client GBP via OAuth → publish posts/review replies.
- **US-011** Festival creative images from HTML templates.
- **US-012** Secure single login; public page rate-limited so DataForSEO balance can never drain.
- **US-013** Review Audit view: rating trend chart, keyword cloud, filters.
- **US-014** Post Audit view: competitor post timeline, frequency, content/media stats.
- **US-015** Website Audit: on-page basics + speed score + NAP match, folded into /100 score.
- **US-016** Per-client monthly delivery checklist (posts/photos/replies/report) so nothing is missed. *(v1.3)*
- **US-017** Client photos arriving on WhatsApp land in a media inbox and publish to their GBP in one click. *(v1.3)*
- **US-018** Each client has a review-request machine: QR + WhatsApp ask + reminder + new-review tracking. *(v1.3)*
- **US-019** Monthly Marathi service reports generate and send themselves on the 1st. *(v1.3)*
- **US-020** One click updates festival hours + posts festival creatives for ALL connected clients. *(v1.3)*

## 1.5 Key user flows

**Flow A — internal audit:** Dashboard → "New Audit" → name + city → candidates → info + reviews + posts + 3 competitors (+ website) → score → audit page → PDF → WhatsApp.
**Flow B — grid scan:** Business page → keyword + size + radius → tasks queued → heatmap → history.
**Flow C — public checker:** Website page → shop name → rate-limited basic pull → score gauge + blurred detail → number + consent → PDF on WhatsApp → lead in pipeline.
**Flow D — monthly service cycle (v1.3):** n8n cron → grid scan + Performance metrics + review stats → work-log checklist verified → Marathi PDF → client's WhatsApp → checklist resets for new month.

## 1.6 Error states

| Case | Behaviour |
|---|---|
| Business not found | Candidate list; manual Place ID/CID entry |
| Task timeout/fail | Retry ×2 → partial audit with "data pending" flags |
| Daily spend cap hit | Block external calls; banner; public page "try tomorrow" |
| WhatsApp send failure | n8n queue + retry; alert founder |
| Free-model rate limit | Fallback chain; queue non-urgent AI jobs |
| Public abuse | 3/IP/day, 1 report/phone/day, global cap 50/day, Turnstile |
| Website unreachable | Skip section; score renormalised; noted in PDF |
| GBP media upload fails | Queue for manual upload; checklist stays unticked |

## 1.7 Privacy & compliance (DPDP-lite)

Public leads stored with consent text + timestamp; delete-on-request. Third-party data stored as computed insights + report snapshots. Keys server-side only. All data on Mumbai VPS + Supabase. Client photos stored in Supabase storage with per-client access.

## 1.8 Launch checklist (v1)

tools.<domain> live → login works → 3 real audits validated vs live Google → grid spot-check ±2 → post audit matches known profile → website audit renders → PDF Devanagari correct → WhatsApp delivery works → spend-cap guard tested → public rate limits tested → VPS snapshot.

---

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
- **ADR-004 — Deploy on existing VPS via Docker Compose.**
- **ADR-005 — Single Supabase project, RLS everywhere; all data routes server-side.**
- **ADR-006 — GBP APIs only for owned/managed profiles** (free, no billing; OAuth consent "testing" mode, up to 100 test users). Scopes: business info, posts, review replies, media, **Performance API**.
- **ADR-007 — Website audits via own crawler + PageSpeed Insights API** (free key) with DataForSEO OnPage optional.
- **ADR-008 — Browser-overlay UX deferred to optional M8 companion extension.**
- **ADR-009 — Service-delivery ops (M9) built on free GBP APIs + n8n only; scheduled jobs never call DataForSEO beyond the monthly grid already budgeted.** *(v1.3)*

## 2.3 Database schema (TB-IDs)

| Table | Purpose | Key fields |
|---|---|---|
| TB-001 `businesses` | Every business audited | id, name, city, place_id, cid, lat, lng, website, is_client, gbp_location_id |
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
| P1 | **Dashboard** | KPI cards (audits this week, leads, spend today/cap, clients green/amber); businesses table (name, city, score, last audit, is_client, actions) | New Audit · open business |
| P2 | **New Audit** | name+city search → candidate cards (name, address, rating, reviews) → manual place_id/CID fallback; options (competitor count, include website audit) | Run audit (cost preview ₹) |
| P3 | **Audit Report** | score gauge /100 + band; rubric checklist (10 rows, ✔/✖/⚠ + points); business card (IDs, hours w/ sanity flags, attributes, categories); links pack (25 grouped links); top-5 fixes (AI, Marathi/English toggle) | Generate PDF · send WhatsApp · re-audit |
| P4 | **Competitor Compare** | side-by-side: categories, services count, rating, reviews, velocity, reply-rate, photos, distance; AI strengths/weaknesses per competitor | Add competitor · export section |
| P5 | **Grid Scan / Teleport** | keyword, grid size (1/3×3/5×5/7×7), radius; heatmap (Leaflet) with rank pins; avg rank, % in top-3; history list + before/after diff | Run scan (cost preview) · compare runs |
| P6 | **Review Inbox** | filters (rating/date/replied/keyword); review rows (stars, author, reviewer-stats, text, replied badge); keyword cloud; trend chart | AI reply (lang/tone) → approve → publish (managed) |
| P7 | **Post Audit** | metric cards (total, frequency, avg chars/words, with links/images/videos); timeline chart; post list (date, text, media, links) | Compare vs competitor |
| P8 | **AI Tools** | type tabs (review reply / GBP post / description / Q&A / FB post); context fields; lang + tone; output box; history | Generate · copy · save · queue to publish |
| P9 | **Client Ops (M9)** | per-client month checklist (posts 4/8, photos n/10, replies %, report sent); media inbox grid (WhatsApp photos → publish); review-request log; bulk festival action | Publish photo · send review request · run monthly report |
| P10 | **Public Score Checker** (no login) | shop name+city input → gauge + 2 visible problems + blurred list → phone + consent → "report on WhatsApp" | Rate-limited check · lead capture |
| P11 | **Settings & Spend** | DataForSEO key status, daily cap, spend today/month (ledger chart), model chain, WhatsApp sender status, GBP connections list | Edit caps · reconnect OAuth |

Workflow wiring: P1→P2→P3(→P4/P5/P6/P7 tabs of a business) → P8 anywhere · P9 only for is_client=true · P10 public route · P11 founder-only.

## 2.7 NFRs

Audit <5 min; public check <10 s. Keys server-side; RLS; rate limits + Turnstile; encrypted GBP tokens. Docker restart policies; n8n failure alerts; weekly VPS snapshot. Bilingual outputs; Noto Devanagari in PDFs. Hard daily spend cap.

---

# PART 3 — MILESTONES

## 3.0 Effort model & the timeline answer

Built with **Claude Code** (existing subscription) as primary; **Antigravity free tier** (~20 agent req/day, limits not guaranteed) as backup only.

| Milestone | Scope | Effort |
|---|---|---|
| M0 | Repo, Docker, nginx/SSL, Supabase schema + auth, deploy, DataForSEO account + cap guard | 6–8 h |
| M1 | Audit engine + scoring + competitor compare + Review Audit + Post Audit + category intel | 13–16 h |
| M1.5 | Website Audit (crawler + PSI + score integration) | 4–5 h |
| M2 | Geo-grid + Teleport + Leaflet heatmap + compare view | 8–10 h |
| M3 | AI layer: 5 generators, Marathi prompts, free-model chain | 4–6 h |
| M4 | PDF service + WhatsApp delivery — **MVP gate** | 6–8 h |
| M5 | Dashboard UI (history, audit/grid/review/post views, spend widget) | 12–16 h |
| M6 | GBP OAuth + publishing + Performance-API keywords + WhatsApp approve/edit flow + festival creatives | 10–14 h |
| M7 | Public score checker + hardening + launch checklist | 6–8 h |
| M8 *(optional)* | Private companion Chrome extension | 4–6 h |
| **M9 — Service Delivery Ops** *(build after first paying clients)* | Delivery checklist, media inbox → GBP publish, review-request machine, scheduled monthly client reports, bulk festival hours/creatives, info-edit forms, NAP tracker | 12–16 h |
| **Total core (M0–M7)** | | **69–93 h** |
| **Total with M9 service layer** | | **81–109 h** |

**Your two schedules:**

| Schedule | Result |
|---|---|
| **2 h/day** | MVP (M0–M4) in ~20–24 days; full v1 (M0–M7) in **~35–47 days (7–9 weeks)**; +~7 days for M9 later. |
| **8 h/day** | MVP (M0–M4) in **4–5 days — realistic**. Full v1 in **9–12 working days**; M9 adds ~2 days when its time comes. Full parity in 3–5 days is **not** realistic — OAuth, PDF fonts and real-data debugging always eat the buffer. |

Calendar rule: **no building before 1 September** — sales first. M0–M4 early October; M5–M7 by mid-November; **M9 in November–December once 3–5 paying GMB Boost clients exist** — it automates work you are then actually doing monthly (saves ~8–10 h/month at 5 clients, ~25 h/month at 15); M8 only if the overlay habit is truly missed.

## 3.1 M0 — Foundations (exit: "hello dashboard" behind login; test call logged to spend ledger)

MS0-T01 Next.js 14 + TS repo · T02 Docker Compose + nginx + SSL · T03 Supabase (Mumbai) schema TB-001..016 + RLS · T04 founder auth · T05 GitHub + deploy script · T06 DataForSEO account ($1 trial), keys, spend ledger + cap middleware.

## 3.2 M1 — Audit engine (exit: **reproduces the Manovedh fixture** — same findings, score 40–55 amber; US-001/002/013/014)

MS1-T01 business resolver · T02 `my_business_info` normalize · T03 competitor discovery + compare table (distance advantage, photo counts, AI strengths/weaknesses) · T04 reviews → TB-006 + trend chart + keyword extraction · T05 posts (`my_business_updates`) → TB-012 + timeline/frequency stats · T06 score.service + tests · T07 category taxonomy + related-categories intel + search volume · T08 persistence + audit page · T09 link-generator pack (~25 templated links, §1.3d) · T10 sanity checks (phone-missing, hours-sanity, services-empty, rented-subdomain, duplicate-at-address link) · T11 bilingual keyword tokenizer (Marathi/Hinglish/English).

## 3.3 M1.5 — Website Audit (exit: US-015)

MS15-T01 crawler (title/meta/H1/schema/NAP/city keywords) · T02 PSI API mobile score · T03 renormalisation · T04 optional OnPage toggle.

## 3.4 M2 — Geo-grid + Teleport (exit: US-003; ±2 positions; <₹5/scan)

MS2-T01 grid generator · T02 task batch + poller · T03 rank extractor · T04 Leaflet heatmap + avg-rank card · T05 Teleport UI · T06 history + before/after compare.

## 3.5 M3 — AI layer (exit: US-004/005; 10 Marathi replies human-quality; ₹0)

MS3-T01 OpenRouter client + fallback + counter · T02 prompt library (reply/post/description/Q&A/FB post × Marathi/English × tone) · T03 approve/edit list.

## 3.6 M4 — Reports + WhatsApp (exit: GM-002 end-to-end — **MVP COMPLETE**)

MS4-T01 HTML report template (brand, gauge, competitor table, review trend, post timeline, grid image, website section, top-5 fixes, Devanagari) · T02 Playwright → PDF → storage · T03 wa.service template message + document · T04 one-click send.

## 3.7 M5 — Dashboard UI (exit: US-008/012; usable from phone)

MS5-T01 businesses list/search/filter · T02 audit detail + score trend · T03 grid gallery + compare · T04 review inbox (reply-with-AI) · T05 post-audit view · T06 spend widget · T07 polish.

## 3.8 M6 — Managed-profile actions + creatives (exit: US-010/011 on one real client)

MS6-T01 Google Cloud project (no billing) + OAuth consent (testing) + GBP APIs · T02 connect flow → TB-009 encrypted · T03 publish post + review reply · T04 festival creative engine (12 templates → PNG) · T05 n8n scheduled posts · T06 search-keywords report (Performance API) · T07 daily WhatsApp digest + interactive approve/edit reply flow · T08 competitor photo-count + AI SWOT in compare view.

## 3.9 M7 — Public checker + hardening (exit: US-009; checklist §1.8 green)

MS7-T01 Marathi-first public page (partial score + blurred teaser) · T02 rate limits + Turnstile · T03 lead → n8n → PDF on WhatsApp → pipeline · T04 security pass · T05 cost drill (100 checks ≈ $0.2) · T06 checklist + snapshot.

## 3.10 M8 (optional) — Companion extension

MS8-T01 Manifest V3 skeleton (load-unpacked, private) · T02 content script reads current Maps CID → calls OUR `/api/audit` → side panel · T03 quick buttons (audit, teleport, AI reply). Personal convenience only; never scrapes at scale.

## 3.10b M9 — Service Delivery Ops (exit: one real client's full month delivered through the tool; US-016..020; GM-006)

MS9-T01 per-client ops checklist widget (auto-ticks from actions) · T02 WhatsApp media inbox (client photos → n8n webhook → library) + one-click GBP photo publish (media endpoint; manual fallback) · T03 review-request machine: per-client short review link + printable QR card (PDF), after-sale WhatsApp sender, 3-day reminder, new-review attribution chart · T04 scheduled monthly client report (n8n cron, 1st): Performance API + grid compare + review growth + work log → Marathi PDF → WhatsApp · T05 bulk festival action (special hours + creative across all clients) · T06 business-info edit forms + change log · T07 NAP checklist tracker.

## 3.11 Risks & mitigations

| Risk | Mitigation |
|---|---|
| DataForSEO data slightly lags live Google | Directional use; re-scan on demand; spot-verify before client claims |
| Free-model daily limits | Fallback chain; queue jobs; optional one-time $10 unlock |
| GBP OAuth "unverified app" screen | Testing-mode users — fine for agency use |
| GBP media-upload API quirks | Manual-upload fallback keeps checklist honest |
| Posts endpoint coverage varies by profile | Graceful "no recent posts found" state |
| Scope creep toward consumer app | Hard gate: nothing beyond M9 until 10 paying clients + ₹1L MRR |
| Build time eats sales time | Calendar rule; M4 is a stop/ship gate; M9 only after paying clients exist |

## 3.12 Total cost summary (only-DataForSEO promise, verified twice)

| Item | One-time | Monthly |
|---|---|---|
| DataForSEO ($1 trial → $50 deposit, credits never expire) | ₹4,700 | ~₹240–480 consumed |
| Everything else (VPS, Supabase, OpenRouter free, GBP APIs incl. Performance, PSI API, Leaflet/OSM, fonts, SSL, n8n, WhatsApp flows) | ₹0 | ₹0 |
| Google billing card | **not needed anywhere** | — |

---

*v1.4 makes the blueprint production-ready: real-audit field spec (§1.3d), page & field inventory (§2.7b), link-generator pack, sanity checks, bilingual analytics, and the Manovedh acceptance fixture as M1's exit test. v1.3 adds the agency service-delivery layer (M9 + Flow D + TB-014..016 + EP-016..020 + GM-006): the tool now also DELIVERS the ₹2,999/mo GMB Boost package — review-request machine, WhatsApp media inbox, scheduled monthly Marathi client reports, bulk festival actions and a per-client delivery checklist. v1.2 added Dhanda AI parity (incl. WhatsApp approve/edit reply flow); v1.1 added full GMB Everywhere parity (Post Audit via verified `my_business_updates`, Website Audit, optional M8 extension). Forge-compatible: feed milestone-by-milestone to Claude Code.*
