# GMB Sarathi — Development Blueprint (PRD + ERD + Milestones) — v1.8 (production-ready, final for dev — design-sync verified)

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
- **US-021** As founder, when a client pays for GMB optimization, I start an **Optimization Sprint**: the tool locks a baseline snapshot (score + full rubric + profile fields + latest grid) so improvement can be proven later. *(v1.6)*
- **US-022** As founder, the sprint gives me one page with an actionable fix checklist (derived from the audit) where every edit — category, phone, hours, services, description, photos — is done inline and logged with a timestamp. **Every task arrives AI-prefilled with a suggested value (approve, don't compose); per-task time estimates + "Apply all suggestions"; optional one-tap Marathi progress updates to the client's WhatsApp as tasks complete.** *(v1.6.1 — minimum-founder-time principle)*
- **US-024** The Optimization page opens with a client selector; starting a sprint is gated by a prerequisites check: ① business is a Client with a plan ② owner contact saved (name + WhatsApp number) ③ GBP connected (OAuth) or Manager-access confirmed ④ fresh audit ≤7 days (else one-tap re-audit). *(v1.7)*
- **US-025** Sprint checklist also covers the remaining 2026-standard GBP fields: logo & cover photo set, opening date, social profile links, service-area settings (for SABs), expanded attributes, and UTM-tagged website link (so improvement shows in the client's analytics). *(v1.7)*
- **US-023** As founder, on completion I re-audit and generate a **Before/After Improvement Report** (Marathi PDF: score delta, per-row rubric deltas, field-level changes, grid before/after, work log) and send it on WhatsApp — the proof that justifies the ₹4,999 setup fee and the retainer. Paid clients only (plan-gated). *(v1.6)*

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

## 1.9 FUTURE SCOPE (v1.9 addendum, 12 Jul 2026) — Rank-Growth Engine + Security Hardening Roadmap

> Status: **post-sprint scope.** Nothing in §1.9 changes the 7-day sprint (M0–M7) or its exit criteria. Items here are traceable as FS-1xx (features) and SEC-0xx (security), phased R1–R3 after MVP. All hard constraints continue to apply: DataForSEO is the only paid service, approve-before-publish, no client passwords, Devanagari everywhere, spend guard on every paid call.

### 1.9a Evidence base — what actually moves local rank (research snapshot, Jul 2026)

| Signal group | Weight (Whitespark 2026 LSRF) | Can we control it? | Tool implication |
|---|---|---|---|
| Proximity to searcher | ~55% of ranking decision | ✖ No | Be honest in reports; win the *achievable* radius (grid top-3 coverage %, not "rank #1 everywhere") |
| GBP signals (category, completeness, activity) | 32% of controllable weight | ✔ Fully | Primary category = **#1 controllable factor**; secondary categories = #8; "open at time of search" is a **new top-5 factor** in 2026 |
| Reviews | ~20% and rising | ✔ Via process | **Velocity now outweighs total count** (a business getting 4+/week outranks a stale bigger profile); keywords-in-reviews and owner replies ≤48h are measurable sub-factors; 68% of consumers filter at 4★+ |
| On-page (website) | ~15% | ✔ Fully | City+service landing pages, LocalBusiness/FAQ schema, NAP match |
| Behavioral (CTR, calls, directions) | ~9% | ◐ Indirect | Posts/photos drive CTR (not rank directly); Performance API measures it |
| Links | ~8% | ◐ Slow | Local editorial mentions ("best of Karad" lists) — also the top AI-Overviews citation factor |
| Citations/NAP | ~6% | ✔ Fully | Fewer, accurate listings beat many conflicting ones; entity consistency feeds AI search |
| AI Overviews / conversational search | overlay on all of the above | ◐ | Sits ABOVE the local pack for many queries in 2026; needs schema, entity consistency, editorial mentions |

**Positioning honesty (goes in every client conversation):** proximity dominates, so "rank 1 everywhere" cannot be promised by anyone. The tool's promise is measurable: *top-3 grid coverage grows month over month*. GM-007/008 below make that a number.

### 1.9b Rank-Growth Engine (FS-101..FS-115)

Automation levels: **A** = fully automatic · **T** = automatic draft, founder approve-tap · **M** = tool-assisted manual (checklist + prefilled values).

| ID | Feature | Ranking lever (evidence §1.9a) | Auto | Data source / cost | Notes |
|---|---|---|---|---|---|
| FS-101 | **Category Guardian** — quarterly re-scan of top-10 profiles per money keyword; detects competitor category shifts; proposes primary/secondary changes with expected impact | Primary category = #1 controllable factor | T | `local_finder` + `my_business_info` (~₹2/scan/quarter) | Extends M1 category finder into a standing monitor |
| FS-102 | **Review Velocity Autopilot** — WhatsApp review-request drips (trigger: visit/invoice/manual), printable QR poster per client, weekly velocity target auto-set to beat top competitor, falling-behind alerts | Velocity > count (2026); prominence | A (after template approval) | wa.service + n8n; ₹0 marginal | The single highest-ROI automation in the suite |
| FS-103 | **Keyword-Seeded Reply Engine** — replies naturally weave service+city keywords; 48h-SLA board; reply-rate KPI vs competitors | Keywords-in-reviews + replies ≤48h behavioral | T | ai.service; ₹0 | Extends M3/M5 review inbox; SEC-002 applies |
| FS-104 | **Services & Products Completeness Engine** — drafts full services/products lists with descriptions from category taxonomy + competitor gap; one-tap publish | GBP completeness (32% group) | T | taxonomy + `my_business_info`; ₹0–2 | Kills the "services empty" finding permanently |
| FS-105 | **Posts Autopilot 2.0** — weekly scheduled posts with UTM-tagged links, 12-festival calendar, offer templates; CTR measured via Performance API | Behavioral/CTR (honest label: not a direct rank factor) | T | ai.service + GBP API; ₹0 | Upgrade of M6 scheduler |
| FS-106 | **Photo Cadence Engine** — monthly WhatsApp photo-request to client, auto-compress + rename with service keywords, count benchmark vs top-3 | Profile activity + conversion | A request / T publish | Supabase storage; ₹0 | |
| FS-107 | **Q&A Seeding** — drafts owner-side FAQs + answers (Marathi/English) from services + common review themes | Completeness + AI-answer citability | T | ai.service; ₹0 | |
| FS-108 | **Citations Builder + NAP Watchdog** — India directory pack (Justdial, Sulekha, IndiaMART, TradeIndia, YellowPages…), assisted free-listing submissions with prefilled NAP, quarterly consistency re-scan | Citations 6% + entity consistency for AI search | M build / A watch | Own crawler ₹0; optional DataForSEO `business_listings` scan with cost preview | "Fewer, accurate" > volume |
| FS-109 | **Local Landing Page Generator** — service+city pages (static HTML export or hosted on tools subdomain) with LocalBusiness/Service/FAQPage schema, sameAs links, embedded reviews | On-page 15% + AI Overviews parsing | T | Playwright templates; ₹0 | Reuses pdf.service render pipeline |
| FS-110 | **Behavioral Signals Watch** — calls/directions/site-clicks trends, anomaly alerts; hours-coverage audit vs search-time distribution ("open at time of search" = new top-5 factor) | Behavioral 9% + hours factor | A | Business Profile Performance API (free) | Needs GBP API approval |
| FS-111 | **Grid-to-Action Planner** — converts weak grid directions into concrete tasks (area landing page FS-109, area citations FS-108, service-area settings) | Distance mitigation within what's possible | A draft / T accept | Existing M2 grids; ₹0 | Feeds Optimization Sprint (P12) |
| FS-112 | **Competitor Delta Watch** — weekly diff of tracked competitors (categories, review velocity, posts, photos); auto-inserts counter-tasks into the monthly cycle | All groups — reactive defense | A | `my_business_info` batch ~₹1–2/competitor/week, spend-guarded | Cap per client to respect GM-005 |
| FS-113 | **AI-Search Readiness Pack** — entity audit across web, FAQPage schema check, Bing Places + Apple Business Connect sync checklists (both free), local "best-of" editorial outreach list | AI Overviews above-pack visibility; links | M | Own crawler; ₹0 | Differentiator no local competitor offers |
| FS-114 | **Rank-1 Playbook Generator** — per-client 90-day path-to-top-3 plan auto-composed from audit + grid + competitor gaps + velocity data; refreshed monthly; becomes the Optimization Sprint backlog | Orchestrates all levers | A draft / T approve | All existing data; ₹0 | The "brain" feature — sells the ₹4,999 tier |
| FS-115 | **Spam Fighter** — flags keyword-stuffed names / suspect competitor listings on tracked keywords; builds evidence pack for Google Business Redressal form | Removes unfair competitors from the pack | A detect / M submit | Existing scans; ₹0 | High leverage in tier-3 markets; fully white-hat |

**Explicitly out of scope, permanently (policy + law):** review gating, incentivized/fake reviews, bulk fake Q&A, keyword-stuffing the business name. Google policy violations + Indian consumer-protection exposure; the tool refuses to automate these and warns when it detects them on the client's own profile.

**New goal metrics:** GM-007 — median top-3 grid coverage +20 points within 90 days per managed client. GM-008 — review velocity ≥4/week sustained for 80% of clients on FS-102.

### 1.9c Security Hardening Roadmap (SEC-001..SEC-012)

Priorities: **P0** = inside current sprint (owned by the milestone named) · **P1** = before public launch · **P2** = before/at VPS migration.

| ID | Threat (attack surface) | Mitigation | Priority → owner |
|---|---|---|---|
| SEC-001 | **SSRF via website-audit crawler** (user-supplied URLs can point at internal/cloud-metadata addresses) | http(s) only; resolve-then-connect with private/link-local/metadata IP blocklist; 10s timeout; response size cap; redirect depth 2 with re-validation | P0 → M1.5 (backend) |
| SEC-002 | **Prompt injection via reviews/website text** (OWASP LLM01:2025 — attack success up to 84% in agentic setups; "may never be fully patched") | Treat all fetched text as data: delimiter/spotlighting prompts, instruction-hardened system prompt, output validation (length, language, no URLs/phones unless from business record), rejected-output log; approve-before-publish stays the final human backstop | P0 → M3 (backend) |
| SEC-003 | **Stored XSS → PDF injection** (business names/reviews rendered into Playwright HTML) | Escape every interpolation; strip script/iframe/event handlers; CSP in report template; same rules for Devanagari strings | P0 → M4 (backend) |
| SEC-004 | **Public checker abuse / spend-drain** | Turnstile + 3/IP/day + 50/day global (built) **plus** separate public spend sub-cap, phone-format validation, disposable-number heuristic, per-ASN backoff | P1 → M7 |
| SEC-005 | **Supabase authz drift** (the RLS-without-GRANTs class of bug found 12 Jul) | 42501-aware RLS tests in CI (done); migration checklist: every new table ships RLS + policy + grant in the same file; build-time grep that secret key never reaches client bundle | P0 → done, keep in CI (main) |
| SEC-006 | **OAuth refresh-token theft** (TB-009) | AES-256-GCM at rest, key from env only, rotate on disconnect, minimal scope (business.manage), audit log of every publish action | P1 → M6 |
| SEC-007 | **API route hygiene** | zod validation on all inputs (contract), rate limits on mutating routes, structured audit log without client PII, generic error envelopes (no stack traces) | P1 → M5–M7 |
| SEC-008 | **Supply chain / CI** | Dependabot + `npm audit` CI gate, pinned lockfile, GitHub secret scanning, branch protection on `main` (only MAIN agent merges) | P1 → main |
| SEC-009 | **WhatsApp webhook forgery/replay** | Verify `X-Hub-Signature-256`, timestamp replay window, idempotent message handling | P1 → wa.service go-live |
| SEC-010 | **Data loss** (Supabase free-tier pause/limits) | Nightly `pg_dump` to VPS, weekly restore drill, storage export | P2 → M9/VPS |
| SEC-011 | **DPDP Act 2023** (leads + client data) | Consent registry (TB-008 has it), purpose limitation, delete-on-request endpoint, retention job (public leads 180 days), breach-notification runbook | P2 |
| SEC-012 | **VPS exposure at migration** | Let's Encrypt TLS, UFW default-deny, fail2ban, rootless Docker, nginx rate-limit zone in front of public checker | P2 → VPS move |

### 1.9d Phasing & cost impact

| Phase | When | Ships | Cost impact |
|---|---|---|---|
| R1 | Weeks 2–4 (with first clients) | FS-102, FS-103, FS-105, FS-110 + all remaining P0/P1 SEC items | ~₹0 marginal |
| R2 | Aug 2026 | FS-101, FS-104, FS-106, FS-107, FS-111, FS-112 | +₹5–15/client/month — inside GM-005 (<₹500/mo at 20 clients) |
| R3 | Sep–Oct 2026 (v2 tier) | FS-108, FS-109, FS-113, FS-114, FS-115 | justifies a ₹4,999/mo "GMB Boost Pro" tier |

*Research sources: Whitespark 2026 Local Search Ranking Factors; BrightLocal local-algorithm guide & 2026 consumer survey; Google Business Profile Help (relevance/distance/prominence); PinMeTo & local-SEO 2026 AI-search guides; OWASP LLM Top-10 2025/26 (LLM01 prompt injection).*

---


*(Full combined blueprint: GMB_Tool_Development_Plan.md v1.9)*
