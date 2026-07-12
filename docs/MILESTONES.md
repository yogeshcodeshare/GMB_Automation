# GMB Sarathi — Milestones — v1.8

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
| M6 | GBP OAuth + publishing + Performance-API keywords + WhatsApp approve/edit flow + festival creatives + **Optimization Sprint page + Before/After report (EP-021/022)** | 14–19 h |
| M7 | Public score checker + hardening + launch checklist | 6–8 h |
| M8 *(optional)* | Private companion Chrome extension | 4–6 h |
| **M9 — Service Delivery Ops** *(build after first paying clients)* | Delivery checklist, media inbox → GBP publish, review-request machine, scheduled monthly client reports, bulk festival hours/creatives, info-edit forms, NAP tracker | 12–16 h |
| **Total core (M0–M7)** | | **73–98 h** |
| **Total with M9 service layer** | | **85–114 h** |

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

MS2-T01 grid generator · T02 task batch + poller · T03 rank extractor · T04 Leaflet heatmap + avg-rank card · T05 Teleport UI (top-10 list + pin distance) · T06 history + before/after compare · T07 **rank tables: pin popover top-5, area-ownership table, map/table toggle, per-business movement in compare**.

## 3.5 M3 — AI layer (exit: US-004/005; 10 Marathi replies human-quality; ₹0)

MS3-T01 OpenRouter client + fallback + counter · T02 prompt library (reply/post/description/Q&A/FB post × Marathi/English × tone) · T03 approve/edit list · T04 **per-tool input schemas (CTA types, review picker, char counters, Q&A batch, emoji level, template picker) per §2.7b P8**.

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

*v1.8 design-sync: every Claude-Design iteration written back — differentiated AI mini-tools + Category Finder tab (P8), rank tables/popovers/table-toggle (P5+MS2-T07), Website Audit detail page (P3b), grouped ~23-task sprint catalog with vendor brief (P12), Today's-work strip + plan popover (P9), dashboard connection dots + sprint badges (P1), P2 states, review-quality strip (P6). *v1.7 (final for dev): sprint entry gated by prerequisites (client+contact+connection+fresh audit — US-024); client contact fields on TB-001; sprint checklist completed against 2026-standard GBP checklists (logo/cover, opening date, social links, service-area, expanded attributes, UTM website link — US-025). v1.6 adds the Optimization Sprint (P12): baseline-locked before/after proof for paying clients — the delivery vehicle for the ₹4,999 setup fee (pattern validated against Localo task-checklists and BrightLocal white-label improvement reports, July 2026). v1.5 added access & entitlements (ADR-010). v1.4 makes the blueprint production-ready: real-audit field spec (§1.3d), page & field inventory (§2.7b), link-generator pack, sanity checks, bilingual analytics, and the Manovedh acceptance fixture as M1's exit test. v1.3 adds the agency service-delivery layer (M9 + Flow D + TB-014..016 + EP-016..020 + GM-006): the tool now also DELIVERS the ₹2,999/mo GMB Boost package — review-request machine, WhatsApp media inbox, scheduled monthly Marathi client reports, bulk festival actions and a per-client delivery checklist. v1.2 added Dhanda AI parity (incl. WhatsApp approve/edit reply flow); v1.1 added full GMB Everywhere parity (Post Audit via verified `my_business_updates`, Website Audit, optional M8 extension). Forge-compatible: feed milestone-by-milestone to Claude Code.*
