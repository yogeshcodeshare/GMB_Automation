# PROMPT FOR CLAUDE (DESIGN) — paste everything below this line

---

Design the complete UI for **GMB Sarathi** — a web dashboard used by a solo digital-marketing agency owner in Karad, Maharashtra (tier-3 India) to audit, optimise and manage Google Business Profiles for local businesses (clinics, hotels, coaching classes, salons, shops).

All visual decisions — layout, typography, colours, spacing, components, iconography, charts style, density, theme — are **entirely yours**. I am only giving you the product: users, pages, fields, values, functionality and workflows. Design it the way you believe is best.

## Product context

- Single power-user (the agency founder) uses it daily: mornings for operations, and **live in front of business owners during sales meetings — often from a phone**, so every screen must work beautifully on mobile.
- One public page (no login) lives on the agency website as a lead magnet for business owners who are non-technical and prefer **Marathi**.
- Internal screens are English-first, but content the tool generates (reports, replies, posts) is Marathi/English — text areas must handle Devanagari comfortably.
- The tool's money guard matters: every external data call costs a little (₹1–5), so cost previews and a daily spend cap are part of the UX.
- Personality of the product: professional proof-machine — it must look credible enough that a screenshot of any screen can be shown to a client as evidence.

## Users

1. **Founder (only login):** runs audits before sales visits, approves AI drafts, tracks monthly client deliverables, checks spend.
2. **Prospect (public page only):** a shop/clinic owner, low tech comfort, Marathi-first, on a cheap Android phone.

## Global elements

- Persistent navigation across 11 screens (grouped: Main / Business workspace / Tools / Other).
- A subtle, always-visible indicator: today's data spend vs daily cap (e.g., "₹6.20 / ₹95"). When the cap is hit, a banner state: external calls paused until tomorrow.
- Business-context switcher: most screens (P3–P7) operate on a selected business.
- Every list needs empty, loading (skeleton) and error states. Long operations (audit ~2–4 min, grid scan ~2–5 min) need progress states with what's-happening text.
- Badges used everywhere: score bands (green >70 / amber 40–70 / red <40), "Client" vs "Prospect", ✔/⚠/✖ statuses.

## Screens (11)

### P1 — Dashboard
Purpose: morning glance + jump-off.
- KPI cards: audits this week (12), leads from public checker (4), spend today/cap (₹6.20/₹95 with tiny progress), clients on-track ("3 ✅ 1 ⚠️").
- Businesses table: name (may be Devanagari, long — e.g., "मनोवेध हिप्नोक्लिनिक (संमोहन उपचार, NLP, EFT…)"), city, score badge (41/100 amber), last-audit date, Client/Prospect tag, Open action.
- Primary action: New Audit.

### P2 — New Audit
Purpose: start an audit in under 30 seconds before a sales visit.
- Inputs: business name, city → Search.
- Candidate results list (choose one): name, address, rating (4.9★), review count (30). Radio select.
- Fallback: manual Place ID / CID entry.
- Options: competitors to compare (Top 3 default / Top 5), include website audit (Y/N), include post audit (Y/N).
- Run button with **cost preview** ("Estimated ₹1.9") and time expectation ("~2–4 min").
- Running state: staged progress (profile → reviews → posts → competitors → website → scoring).

### P3 — Audit Report (the heart of the product)
Purpose: the sales weapon; becomes a client-facing PDF.
- Score gauge: 41/100 with band label; audit date; claimed status; rating/review summary.
- Rubric checklist (10 rows), each with points earned/max, status (✔/⚠/✖) and a one-line reason. Real example values:
  - Profile claimed — ✔ 10/10
  - Primary category — ✖ 0/15 — ""Hospital" is generic; competitors use "Mental health clinic""
  - Completeness — ✖ 7/15 — "Phone missing · services empty · hours look wrong (12–9 AM)"
  - Photos — ⚠ 4/10 · Reviews count — ⚠ 5/10 ("30 vs top competitor 91") · Velocity — ⚠ 3/8 ("1.2/mo") · Reply rate — ✖ 1/7 ("6.67%") · Posts — ✖ 2/10 ("7 posts ever, one per 293 days") · Website — ⚠ 6/10 ("rented subdomain; meta issues") · NAP — ⚠ 3/5 ("phone mismatch")
- Top-5 fixes: AI-drafted, editable, language toggle (मराठी/English).
- Business data block: Place ID, CID, KG ID, coordinates, hours table (with anomaly flags), categories, attributes.
- Link pack: ~25 auto-generated external links grouped (Google links: review request, review list, knowledge panel, posts, products, Q&A, other-GMBs-at-same-address, same-domain GMBs · Maps: Apple, Bing, HERE, Facebook Places, Yelp · Marketing: Google Ads transparency, FB Ad Library, Trends · Website: site-index checks, PageSpeed, rich results, robots.txt, sitemap, OG preview, WHOIS, BuiltWith, Wayback).
- Actions: Generate PDF (Marathi), Send on WhatsApp (enter/choose number), Re-audit, Mark as Client.

### P4 — Competitor Compare
- Side-by-side table: target + 3 competitors. Rows: primary category, rating, review count, velocity (6mo), owner reply-rate, photo count, services count, distance from target.
- AI summary block: strengths / weaknesses / what to fix first.
- Actions: add competitor, refresh, include section in PDF.

### P5 — Grid Scan / Teleport
- Controls: keyword, grid size (Teleport 1-point / 3×3 / 5×5 / 7×7), radius (0.5–5 km), Run with cost preview (₹1.4).
- Result: map heatmap of rank pins (values like 1,2,3…20+; colour by band), average rank (4.6), % in top-3 (56%), weak-direction note ("weak to the south-east").
- Insight callout: pair rank with search volume ("'hypno clinic' ≈ 20 searches/mo; 'mental health clinic karad' ≈ 320 — scan the money keyword too").
- History list with per-run averages and a compare view (May 7.8 → Jun 6.1 → Jul 4.6, delta highlighted). Before/after is a key sales artifact.

### P6 — Review Inbox
- Header KPIs: average rating (4.90★), owner reply-rate (6.67% — flagged), velocity (1.2/mo), reviews-with-photos (0).
- Filters: all / pending (28) / by rating (5★=28, ≤3★=1) / by keyword ("anubhav" ×8) / replied-status / date.
- Review rows: stars, reviewer name, reviewer stats ("Local Guide · 248 reviews"), text (often Marathi-in-Latin-script, e.g., "Khupach Chan Anubhav Ala…"), date, replied badge.
- Per review: AI draft reply shown (Marathi or English, tone selector), actions: Approve & publish (only for connected clients), Edit, Regenerate, Copy (for prospects — manual paste).
- Keyword cloud (bilingual: "experience ×15", "chan anubhav ×8", "mental health ×3").
- Trend chart: cumulative reviews over time, with a note that dates older than 1 year are approximated.

### P7 — Post Audit
- Metric cards: total posts analyzed (7), posting frequency ("one every 293 days" — flagged), avg characters (171), avg words (26.4), posts with images/links/videos (4/1/0).
- Timeline chart: posts per quarter + cumulative line.
- Post list: date, text snippet, has-media, links.
- Callout: plain-language sales line ("7 posts in 5 years — Google sees an inactive business").

### P8 — AI Tools
- Type selector: GBP Post / Review Reply / Business Description / Q&A draft / Facebook Post / Festival Creative.
- Context inputs: business context (prefilled from selected business), topic/offer, language (मराठी/English/Hinglish), tone (Warm/Professional/Festive).
- Output area: generated text (Devanagari-friendly), for Festival Creative also an image preview generated from a template (client logo + text on a festival layout).
- Actions: Generate, Regenerate, Copy, Save to history, Queue to publish (clients only). Small indicator of AI usage today ("2/1000 free requests").
- History list of previous outputs with approved flag.

### P9 — Client Ops (monthly service delivery)
Purpose: prove and track the ₹2,999/month service, per client, per month.
- Month selector + client selector.
- Deliverable progress: Posts 6/8, Photos 7/10, Replies 100%, Monthly report status ("Scheduled → 1 Aug 9:00"). Progress bars auto-tick from actions.
- Media inbox: photo thumbnails arriving from the owner's WhatsApp; select → Publish to GBP; published items marked.
- Review-request machine: counters (sent 34, reminders 12, new reviews detected 9, conversion 26%), actions: send request (enter customer number), print QR card (per-client PDF).
- Bulk festival action: pick festival (Diwali, Ganesh Chaturthi, 15 Aug…) → applies special hours + publishes festival creative for ALL connected clients; confirmation with per-client result list.
- NAP checklist tracker: JustDial ✔ / IndiaMART ✔ / Sulekha ⚠ (manual ticks).
- Business info editor: hours, description, services (writes to the connected profile), with change log ("what changed, when").

### P10 — Public Score Checker (no login; Marathi-first; lives on the agency website)
- Step 1: single input — business name (+ city), big friendly CTA ("तुमचा Google Score फ्री तपासा").
- Step 2 result: score gauge (41/100 + "सुधारणा आवश्यक"), 2 visible problems in plain Marathi ("फोन नंबर नाही — ग्राहक कॉल करू शकत नाहीत"), remaining 3–4 problems visually locked/teased.
- Step 3 capture: WhatsApp number input + explicit consent checkbox ("मला WhatsApp वर रिपोर्ट मिळण्यास संमती आहे") → "पूर्ण रिपोर्ट WhatsApp वर मिळवा — FREE".
- Success state: "रिपोर्ट पाठवला! WhatsApp बघा 📲".
- Constraints to reflect: rate-limited (3 checks/day per visitor), agency branding ("Powered by …"), must feel trustworthy to a first-time visitor, flawless on cheap Android phones.

### P11 — Settings & Spend
- Spend: today vs cap with bar, month total (₹214), vendor balance ("$46.10 — never expires"), AI requests today (2/1000).
- Connections list with status: DataForSEO (the only paid service), OpenRouter (free models), WhatsApp Cloud API (quality: GREEN), PageSpeed key, Google Business Profile (5 clients connected, + Connect client OAuth button).
- Guards (editable): daily spend cap (USD), public checker global/day (50), per-IP/day (3).
- Explanation state: what happens at cap ("all external calls pause automatically").

## Key workflows to design end-to-end

1. **Sales visit:** P2 search → run (cost preview) → progress → P3 report → Generate PDF → Send on WhatsApp → Mark as Client. (Frequently done ON MOBILE at a shop counter.)
2. **Daily ops (10 min):** P1 glance → P6 approve pending AI replies → P9 publish photos/posts due today.
3. **Monthly proof:** P5 re-scan → compare with last month → P9 monthly report auto-sends on the 1st; founder just verifies status.
4. **Lead capture:** visitor on P10 → partial score → number + consent → confirmation; lead appears in P1 KPI.
5. **Festival day:** P9 bulk action → one confirmation screen → all clients updated.

## Functional notes the design must respect

- Long Devanagari business names must never break layouts (truncate + tooltip/expand).
- Scores/statuses drive colour-band logic in many places (you decide the colours; the three bands are semantic: good / needs-work / critical).
- Costs appear before every paid action (audit ₹~2, grid ₹~1.4–4.5).
- Approve-before-publish is a core principle: nothing AI-generated goes live without a human tap.
- Screenshots of P3, P5-compare and P9 get shown to clients as proof — those three especially must look presentation-grade.

## Developer handoff requirements (structure only — visuals still yours)

This design will be implemented by a developer using Claude Code reading the Figma file through the Figma MCP server / Dev Mode. So please build the file dev-ready:

- Define every colour, text style, spacing step, radius and elevation as **Figma variables/design tokens** (DTCG-friendly names) — no detached hex values on layers.
- Build everything from **components with variants** (e.g., Badge: band=good/needs-work/critical; Button: primary/secondary/danger × default/hover/disabled/loading; table rows; KPI card; progress bar; gauge; heatmap pin with rank value).
- Use **Auto Layout everywhere** with meaningful layer/component names (e.g., `audit/score-gauge`, `reviews/row`, `ops/quota-bar`) — the layer tree becomes the code structure.
- Show **all states as variants**, not separate ad-hoc frames: loading skeletons, empty, error, cap-hit banner, in-progress (staged audit/scan progress).
- Wire the **5 workflows as interactive prototype flows** (named flows) so testers can click through: Sales Visit (mobile), Daily Ops, Monthly Proof, Lead Capture, Festival Day.
- Responsive: desktop + mobile frames for P2, P3, P6, P9, P10 minimum; use constraints/auto layout so breakpoint intent is readable.
- One **"Design System" page** in the file: token table, component inventory with all variants, and any usage notes a developer needs.
- Assets (icons, illustrations, festival-creative template shells) exportable as SVG/PNG.

## Deliverables I'd like from you

High-fidelity screens for all 11 pages (desktop + the mobile versions of P2, P3, P6, P9, P10 at minimum), the 5 workflows above shown as connected states (including loading/empty/error/cap-hit states), and a reusable component set (tables, KPI cards, badges, progress, chat-like review rows, gauge, heatmap pins). Naming: "GMB Sarathi" (may appear as सारथी).

Everything visual is your call.
