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


*(Full combined blueprint: GMB_Tool_Development_Plan.md v1.8)*
