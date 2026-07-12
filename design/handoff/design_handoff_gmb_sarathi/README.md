# Handoff: GMB Sarathi — Agency GMB Audit & Ops Dashboard

## Overview
GMB Sarathi is an internal web tool for a solo digital-marketing agency founder in Karad, Maharashtra. It audits, optimises and manages Google Business Profiles for local businesses: run audits before sales visits, generate branded Marathi PDF reports, send them on WhatsApp, scan local rank grids, manage review replies with AI drafts, and deliver the ₹2,999/month "GMB Boost" service per client. One public, login-free Marathi lead-magnet page ("Google Score checker") lives on the agency website.

This bundle contains a **fully interactive high-fidelity prototype** (all 13 screens + login) plus the product blueprint (PRD/ERD/milestones).

## About the Design Files
The files in `prototype/` are **design references created in HTML** — they show intended look and behaviour; they are NOT production code to copy. Your task is to **recreate these designs in the target stack defined in `docs/GMB_Tool_Development_Plan.md`**: Next.js 14 + TypeScript, Supabase (Postgres/Auth/Storage), Docker on a Hostinger VPS, DataForSEO as the only paid API, OpenRouter free models for AI, Leaflet + OSM for maps, Meta WhatsApp Cloud API. Follow the plan's milestones (M0–M9), table schema (TB-001..016) and endpoints (EP-001..020); this design maps 1:1 onto its page inventory (§2.7b).

To view the prototype: open `prototype/GMB Sarathi.dc.html` in a browser (keep `support.js` beside it). It is a single-file React-like app; every screen, state and flow described below is clickable in it.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, copy and states are final intent — recreate pixel-faithfully with your stack's component patterns (e.g. Tailwind + shadcn or plain CSS modules). All data in the prototype is the "Manovedh fixture" demo data from the plan (§1.3d) — real values the audit engine must reproduce.

## Design Tokens (DTCG-style names)

Colors
- `color.bg.app` #F4F2ED (warm paper) · `color.bg.surface` #FFFFFF · `color.bg.nav` #14201C (dark green-ink) · `color.bg.public` #FBF7EF
- `color.ink.primary` #1B2321 · `color.ink.soft` #5A6560 · `color.ink.faint` #8A928D · `color.line` rgba(27,35,33,.10)
- `color.brand.primary` #0F5C48 (deep green; hover #0B4B3A) · `color.brand.accent` #E39A2D (marigold; hover #D68F22)
- Score bands (semantic, used everywhere): `band.good` fg #177B4B / bg #E3F2E9 (score >70) · `band.warn` fg #9A5B00 (bars/gauge #C77D00) / bg #FAEEDC (40–70) · `band.crit` fg #B3372B / bg #F9E5E2 (<40) · `band.none` #8A928D (rank 20+)
- Nav text #C3CEC8 · nav muted #71827A / #8FA098 · dark-surface line rgba(255,255,255,.08)

Typography
- UI: **IBM Plex Sans** + **IBM Plex Sans Devanagari** (one stack — Devanagari must render everywhere, incl. inputs/PDFs)
- Data/numbers/IDs/₹: **IBM Plex Mono**
- Scale: display 21–22/700 · section title 14.5/700 · body 13.5/400 · row-title 13/600 · caption 10.5–11/600 uppercase ls .6–.8px · KPI number 23–26/600 mono · public page base 14.5–17, hero 24–30/700

Spacing & shape
- Space scale: 4/6/8/10/12/14/16/20/24/28 px; card padding 16px 20px; page gutter clamp(14px,3vw,28px); max content width 1180px
- Radius: chips/pills 999 · buttons/inputs 7–10 · cards 12 · modals 14
- Borders: cards 1px rgba(27,35,33,.10); inputs 1.5px rgba(27,35,33,.18); focus/selected #0F5C48
- Shadows: modals `0 12px 40px rgba(15,20,18,.35)`; map pins `0 1px 3px rgba(27,35,33,.35)`; toast `0 8px 24px rgba(15,20,18,.35)`

Component recipes (reused everywhere)
- **Score pill**: mono 700 12.5px, 3px 10px, pill, band bg/fg
- **Status chip**: 20px circle, glyph ✓ / ! / ✕, band colors
- **Connection indicator**: ● Connected (good) / ○ Manager access (warn) / – Not connected (grey) — chip or bare glyph
- **Type tag**: Client = solid #14201C/white pill; Prospect = 1.5px outline grey pill
- **Buttons**: primary (green solid) / secondary (green outline) / ghost (grey outline) / danger (#B3372B) / disabled (#E5E1D8 bg, #8A928D text) / loading (spinner 13px, border-top white). Paid actions ALWAYS show cost in mono ("Run audit · ₹1.9")
- **Segmented control**: pill group, 1.5px border, active = green solid
- **Toast**: fixed bottom-center dark pill (#14201C), auto-dismiss ~2.4s — feedback for every action
- **Modal**: centered card ≤400–440px on rgba(15,20,18,.55) backdrop
- **Map pin**: 27px circle (mini 19px), white 2px ring, mono rank number, band color by rank (1–3 good, 4–10 amber, 11–19 red, 20+ grey); target pin gets 2px #14201C outline + "TARGET" label

## Screens (14)

### P0 Login
Centered 380px column on paper bg: brand mark (52px rounded square #14201C with "सा" in marigold), "GMB सारथी" 22/700, sub "Agency ops · founder login". White card: Email + Password inputs, full-width green "Sign in", "Forgot password?" link (sends WhatsApp reset). Footnotes: "Single founder account · sessions expire after 30 days" and a link to the public checker. Signing in stores the typed email as the account identity (shown in sidebar footer, Account page, toast).

### App shell (all internal screens)
- **Sidebar 230px**, bg #14201C: brand header; grouped nav — MAIN (Dashboard, New Audit), BUSINESS WORKSPACE (Audit Report, Competitors, Grid Scan, Review Inbox `28` badge, Post Audit), TOOLS (AI Tools, Client Ops), OTHER (Public Checker `PUBLIC` outline badge, Settings & Spend, Account, Design System). Item: 8px 12px, radius 8, 13.5/500 #C3CEC8; active = white 600 on rgba(255,255,255,.10); hover rgba(255,255,255,.07). Thin custom scrollbar (6px, rgba(255,255,255,.25)). Footer = account row (initial avatar, user name + email, chevron → Account page).
- **Top bar 58px** white: screen title 16/700 · business switcher (workspace screens only) · spacer · **spend pill** (mono "₹6.20 / ₹95", clickable → Settings, red at cap) · date · "+ New Audit" primary (disabled grey at cap).
- **Business switcher**: pill with band-colored dot + truncated name; opens 320px dropdown listing all 6 businesses (conn glyph, name, score pill); beside it a connection chip for the selected business. Selecting a non-audited business shows a dashed empty-state card on workspace pages ("run an audit / switch back").
- **Cap-hit state (global)**: red banner "Daily spend cap reached… paused until tomorrow" + "Adjust cap"; every paid button becomes disabled with reason; spend meters go red/full. Previewable via Settings → "Preview cap-hit state".
- **Mobile (<920px)**: sidebar → hamburger drawer (same nav + account footer); dark top bar with brand + spend pill; content single column; tables scroll horizontally (min-width 700–980px).

### P1 Dashboard
KPI grid (auto-fit ≥175px): Audits this week **12** (+3 vs last week, green) · Leads from checker **4** (2 new today · "view page" link) · Spend today **₹6.20 / ₹95** with 5px bar + "7% of daily cap" · Clients on-track **✓ 3** / **! 1** chips + "Patil Coaching: posts 6/8 behind". Businesses card: header (title, count, filter chips All 6 / Clients 3 / Prospects 3 — functional), table grid `2.4fr .8fr .7fr .9fr .9fr .7fr`: business (600, ellipsis + title tooltip — Devanagari names must never break layout), city, score pill, last audit (mono), type tag + connection glyph, "Open →" (selects that business and opens its report). Row hover #FAF8F4. Mobile adds a full-width "+ New Audit" button.

### P2 New Audit
Card 1 "Find the business": name + city inputs + dark Search button. Results: "2 MATCHES ON GOOGLE — PICK ONE" radio-cards (selected = green border + #F0F5F2): मनोवेध हिप्नोक्लिनिक (Somwar Peth, Karad — 4.9★ · 30 reviews) and Avani Hypnotism & Wellness (Janvhi Arcade — 4.7★ · 18). **No-results state** (search any unknown text): dashed card + prominent dark "Enter Place ID / CID" button. "Enter Place ID / CID manually" link reveals two mono inputs. Card 2 "Options": segmented Top 3/Top 5 competitors, Website audit Y/N, Post audit Y/N. Card 3: **live cost preview** — mono ₹ recalculates (base .9 + comp .6/1.0 + web .3 + post .1 → ₹1.9 default), "~2–4 min · charged only when the audit runs", big "Run audit →". Cap-hit: disabled + red reason. **Running state**: card with progress bar + 6 staged rows (Profile → Reviews → Posts → Competitors → Website → Scoring; done = green ✓ chip, current = spinner + caption like "my_business_updates — 7 posts found", pending = 50% opacity), ~950ms/stage in the mock, Cancel ghost; auto-lands on P3.

### P3 Audit Report (the sales weapon — presentation grade)
- Header card: business name (Devanagari, clamp 17–21/700), address; chips: Prospect/Client (flips via Mark as Client), connection chip, Claimed ✓, 4.9★ · 30 reviews (mono), Audited 08 Jul 2026 09:12. Actions: **Generate PDF (मराठी)** (→ spinner "Generating PDF…" → toast), **Send on WhatsApp** (→ modal below; after send shows "✓ sent 11 Jul 14:32"), **Re-audit · ₹1.9** (→ P2 running → back), **Mark as Client** (toggles, green "✓ Client — undo").
- Score row: gauge card (SVG 270° arc, r52 stroke 12 round-cap, track #EDEAE3, value #C77D00; center mono 34/700 "41" + "/ 100"; band pill "NEEDS WORK · 40–70"; legend "Red <40 · Amber 40–70 · Green >70") + **rubric card** (10 rows: status chip, name 13.5/600, one-line reason 12.5 soft, points mono colored right): Claimed ✓ 10/10 · Primary category ✕ 0/15 ("Hospital" is generic…) · Completeness ✕ 7/15 (phone missing · services empty · hours 12–9 AM) · Photos ! 4/10 · Reviews ! 5/10 (30 vs 91) · Velocity ! 3/8 (1.2/mo) · Reply rate ✕ 1/7 (6.67%) · Posts ✕ 2/10 (1 per 293 days) · Website ! 6/10 (grexa.site subdomain) · NAP ! 3/5. **Mobile: rows collapse to tap-to-expand accordions** (summary = chip + name + points + ▾; reason expands).
- Top 5 fixes card: मराठी/English segmented toggle; numbered marigold circles; per-row **Edit → inline textarea + Save/Cancel** (edits persist per language, carry into PDF).
- Business data card: Place ID / CID / KG ID / coordinates (mono); Categories chips ("Hospital · primary ✕" in crit colors + 3 normal); Attributes chips. Hours card: 7 rows, anomalies ("12:00 – 9:00 AM") amber + ! chip + "2 anomalies" badge + amber note to confirm with owner.
- Link pack card: "27 auto-generated links · zero API cost", 4 groups of outline-pill links — Google (8: Review request, All reviews, Knowledge panel, Posts feed, Products, Q&A, Same-address GMBs, Same-domain GMBs) · Maps (5: Apple, Bing, HERE WeGo, Facebook Places, Yelp) · Marketing (3: Ads Transparency, FB Ad Library, Google Trends) · Website (11: site: all/past week/6 months, PageSpeed, Rich results, robots.txt, sitemap.xml, OG preview, WHOIS, BuiltWith, Wayback).
- **WhatsApp send modal**: +91 prefix + number input, Recent chips (2), attachment preview row (red PDF chip, "मनोवेध_GMB_Audit_41.pdf · + 2-line Marathi summary"), Cancel/Send → toast "Report sent on WhatsApp ✓".
- **Mobile sticky action bar**: bottom-stuck white card with Generate PDF + Send on WhatsApp (the shop-counter flow).

### P4 Competitor Compare
Header card: title "मनोवेध हिप्नोक्लिनिक vs {3|4} nearby competitors", sub "Discovered via local finder…"; actions: **+ Add competitor** (modal: search + 2 suggestion rows with ₹0.2 note; adding appends a real 5th column "Mind Care Clinic 3.1 km" and header becomes "4 competitors · max") · **Refresh · ₹0.6** (spinner → toast; paused at cap) · **✓ In PDF** toggle chip. Table (h-scroll, grid `1.1fr` + 1fr per competitor): header row = names + distances + solid TARGET badge; 8 metric rows — Primary category (Hospital ✕ flagged), Rating (4.9★ best-green / 4.7 / 4.8 / 4.6), Reviews (30/18/**44**/27), Velocity 6mo (1.2/0.8/**2.5**/1.1 /mo), Reply rate (**7% crit** /22%/**81% good**/35%), Photos (34/14/**52**/21), Services (**0 crit**/6/**11**/4), Distance (—/0.4/1.1/2.3 km). Flagged cell = crit fg 700 on #FCF3F2; winner = good fg 700 on #F2F8F4. AI summary card: three tinted blocks — Strengths (good tint), Weaknesses (crit tint), Fix first (warn tint) + "OpenRouter free model" note.

### P5 Grid Scan / Teleport
Controls card: keyword input ("hypno clinic"), grid segmented (Teleport / 3×3 / 5×5 / 7×7), radius chips (0.5–5 km), **Run scan · ₹{0.2|0.5|1.4|2.7}** (cost follows grid size). Running state: spinner "Querying 25 grid points…". Result (5×5): **stylized map** (square, #E9EDE4, two faint rotated road bands, 2 dashed radius rings, "Karad" + "Malkapur →" labels) with 25 positioned pins (values [[2,1,3,3,7],[1,1,2,4,9],[1,1,1,5,11],[2,2,3,8,14],[3,4,6,9,13]], center = rank 1 TARGET) + 4-item legend. Stats column: Avg rank **4.6** + "▲ +3.2 vs May" chip · In top 3 **56%** + bar · amber callout "Weak to the south-east (Malkapur side)…" · "Rank ≠ demand" card ("hypno clinic" ≈ 20/mo vs "mental health clinic karad" ≈ 320) + "Scan …· ₹1.4" button. History card: "+3.2 in 2 months" badge; rows 11 Jul avg 4.6 THIS RUN / 04 Jun 6.1 / 02 May 7.8; **Compare before/after** toggle → two mini-maps side by side (May avg 7.8 grid vs Jul 4.6) with green → arrow — the monthly proof artifact. **Teleport mode**: selecting Teleport + Run swaps the map for a single-point card: green #1 circle, "Rank at this point", coords mono + "Karad bus stand area · 0.3 km from pin", "Top 3 at this point" list (target #1 + 2 competitors), footnote.

### P6 Review Inbox
KPI row: 4.90★ avg · reply rate **6.67%** crit + "flagged" chip · velocity 1.2/mo · with photos **0** (amber). Filter chips (functional): All 30 / Pending 28 / 5★ 28 / ≤3★ 1 / Replied 2 / "anubhav" ×8. Review cards: avatar initial (30px green circle), name + reviewer stats ("Local Guide · 248 reviews"), stars (amber; ≤3 red), relative date mono, Replied ✓ / No reply badge; review text (often Marathi-in-Latin: "Khupach Chan Anubhav Ala…"); replied rows show grey "Owner reply" block. Pending rows: **AI draft box** (green-tint #F0F5F2): meta "AI DRAFT · मराठी · WARM" + two working dropdowns — **language (मराठी/English)** and **tone (Warm/Professional)** — switching rewrites the draft (personalized with reviewer's first name); actions: Approve & publish (disabled grey for prospects, tooltip "Connect profile or copy manually"), Edit (inline textarea + Save/Cancel), Regenerate (spinner → alternate variant), Copy (clipboard + toast). Rows without drafts: "Draft AI reply" → spinner → draft appears. Side column: bilingual keyword cloud (font-size scales with count: experience ×15, best ×14, chan anubhav ×8, doctor saheb ×5, shant ×4, mental health ×3) + cumulative trend SVG (rising polyline to "30") with footnote "Dates older than 1 year are approximated by Google." Demo note: "Showing 6 of 30 (demo sample)".

### P7 Post Audit
Metric cards: Posts analyzed **7** · Frequency **1 post / 293 days** (crit, "inactive" chip in card header) · Avg length **171 chars · 26.4 words** (side-by-side stats) · With media **4 img · 1 link · 0 video**. Crit-tint callout: **"7 posts in 5 years — Google sees an inactive business."** + "Show this line to the owner." + "Compare vs competitor" toggle → contrast cards (मनोवेध 7 posts · 1/293 days · 57% images VS Siddhivinayak **38 posts · 1/9 days · 92% images**, green-highlighted) + "posts 32× more often" line. Timeline card: 20 quarter bars (Q4'20→Q3'25, 7 green bars at the post quarters, empty = 4% grey stubs) + marigold cumulative polyline overlay + mono quarter labels. Post list: 7 rows (date mono 92px, Devanagari snippet ellipsis, IMAGE/LINK chips).

### P8 AI Tools (six mini-tools)
Tab chips: GBP Post / Review Reply / Description / Q&A draft / Facebook Post / Festival Creative + usage pill "2/1000 free requests today" (increments on generate). Shared left-form fields: business select (with ●/○/– markers; gates publishing), language segmented (मराठी/English/Hinglish — switches outputs), tone segmented, Generate button with per-tab label (Generate post / Draft reply / Rewrite description / Suggest 5 Q&A / Generate creative) + spinner state. Per-tab:
- **GBP Post**: topic input, CTA segmented (Call now/Book/Learn more/Offer), photo picker (thumbs from that client's media inbox; prospects see "no media inbox" note). Output = Google-post card preview (image area w/ filename, text, CTA outline pill) + counter "…/ 1,500".
- **Review Reply**: pending-review picker (3 radio rows "★5 Sandip Jadhav — Khupach Chan…"), length Short/Standard. Output = quoted review + threaded "Owner reply · draft" bubble with सा avatar, exactly as on Google.
- **Description**: read-only "current description" panel, keyword chips to include (hypnotherapy/Karad/NLP/mental health/संमोहन — toggleable). Output = Before (grey) / After (green-tint) compare + "…/ 750" counter + included-keyword ✓ chips.
- **Q&A draft**: question input + "Suggest 5 common questions" button. Output = 5 Q&A pairs with checkboxes, per-row Copy, bulk "Save N selected".
- **Facebook Post**: topic, emoji level (None/Some/Festive — changes output), include-GBP-link Y/N (toggles link preview box), audience segmented. Output = FB-style card (avatar, page name, "Just now · Facebook Page", text, link box); note "also queues to Instagram via cross-post".
- **Festival Creative**: festival select (Ganesh Chaturthi/Diwali/15 August — changes greeting), 3-template picker (dark-green/marigold · ink double-border · light/green), offer-line input (renders as marigold pill on card). Output = 1:1 creative preview (inner border frame, LOGO circle, ॥ शुभेच्छा ॥, big Devanagari greeting, offer pill, client name, phone strip) + "exports PNG 1080×1080".
Actions row: Copy (clipboard) · Regenerate · Save to history (prepends "just now · Pending" row) · Queue to publish (green only for Connected clients; otherwise disabled-look + explanatory toast). History card: type chip + snippet + date + Approved ✓/Pending.

### P9 Client Ops (plan-aware)
Header card: client select (3 clients), month select, connection chip, **plan chips** (GMB Boost solid + add-on outline chips, clickable) + "Manage plan ▾" dashed chip → **popover**: base row "GMB Boost — ₹2,999/mo ✓ Included" + 4 add-on toggle rows (Content Pack / WhatsApp / Social / Ads, "✓ Added"/"+ Add") + amber note "Quotas update from next month's cycle" — chips update live. Right: "Report: Scheduled → 1 Aug 09:00" chip + "View last report (PDF)" link.
- Deliverables card (quotas render ONLY for purchased services): Hotel Sahyadri (Boost+Content) → Posts 6/8, Photos 7/10 (ticks up when photos publish), Replies 100%, Content articles 2/4; श्री डेंटल (Boost+WhatsApp) → 3 bars; Patil (Boost, Manager) → Posts 3/8 crit, Photos 4/10, Replies 92% + amber "Manager access — copy/paste mode" note.
- Media inbox: photo tiles (108×86, filename strip, tap to select = green ring; published = "✓ Published" badge, unselectable) + **Publish N selected to GBP** (Connected) or **Copy N selected for manual upload** (Manager) — publishes mark tiles + tick quota + toast.
- Review-request machine: counters sent 34 (increments) / reminders 12 / new reviews 9 / conversion 26% (good tint); phone input + **Send request** (validates 10 digits → toast + counter) + **Print QR card (PDF)**; note "3-day reminder is automatic…".
- Bulk festival: festival select (15 Aug/Ganesh Chaturthi/Diwali) + marigold "Run for all 3 clients" → spinner → per-client result list (✓ Hotel "hours + creative published", ✓ डेंटल same, ✓ Patil "creative ready — copied for manual post (Manager access)") + "done · 3/3" + "Run another".
- NAP checklist: JustDial ✓ / IndiaMART ✓ / Sulekha ! Pending — tap to toggle.
- Business info editor (Connected clients): description textarea, **service chips with remove ✕ + "+ Add service" inline input**, Save to profile (→ toast + change-log "just now" entry), hours line + edit link, Change log list. Manager clients instead get a dashed "edits open in Google's own manager" card + "Open GBP manager ↗".

### P10 Public Score Checker (no login, Marathi-first, cheap-Android-proof)
Rendered as a preview inside the app (PREVIEW chip + note). Standalone page structure, warm bg #FBF7EF, max 600px, base ≥14.5px, CTA 52px+: header (dashed LOGO box, agency name — pulled from Account settings, मराठी/EN segmented toggle that switches ALL copy). 4 steps:
1. **Form**: hero "तुमचा व्यवसाय Google वर कसा दिसतो?" + sub; big inputs (व्यवसायाचे नाव / शहर); marigold CTA **"तुमचा Google Score फ्री तपासा"**; trust chips १००% मोफत / नोंदणी नाही / ३० सेकंदात निकाल.
2. **Loading**: marigold spinner + 3 staged captions (profile → reviews/photos/hours → score), ~1s each.
3. **Result**: business line, gauge 41/१०० + "सुधारणा आवश्यक" pill; "सापडलेल्या समस्या": 2 visible crit rows ("फोन नंबर नाही — ग्राहक कॉल करू शकत नाहीत.", "सेवांची यादी रिकामी…"); **locked teaser**: 4 blurred rows (blur 5px) under overlay "आणखी ४ समस्या सापडल्या" + green "पूर्ण रिपोर्ट मिळवा →".
4. **Capture**: "पूर्ण रिपोर्ट कुठे पाठवू?", +91 phone input, consent checkbox "मला WhatsApp वर रिपोर्ट मिळण्यास संमती आहे." — submit ("पूर्ण रिपोर्ट WhatsApp वर मिळवा — FREE") enabled only with consent + 10 digits; micro-copy "दिवसाला जास्तीत जास्त ३ तपासण्या · तुमचा डेटा सुरक्षित आहे".
5. **Success**: green ✓ circle, "रिपोर्ट पाठवला! WhatsApp बघा 📲", sub, "आणखी एक व्यवसाय तपासा" reset. Footer: "Powered by GMB सारथी · दिवसाला ३ तपासण्या". Rate limits per plan: 3/IP/day, 50/day global, Turnstile.

### P11 Settings & Spend
Spend cards: Today ₹6.20/₹95 + bar + **"Preview cap-hit state"** button (toggles the global cap state app-wide) · This month ₹214 (112 calls) · Vendor balance $46.10 "credits never expire" · AI requests 2/1000. Connections card: DataForSEO ("The only paid service…", balance + ● Connected) · OpenRouter ("Free models · fallback chain of 3") · WhatsApp Cloud API (Quality: GREEN chip + Connected) · PageSpeed Insights · **Google Business Profile** section: "+ Connect client" → **OAuth modal** (QR placeholder + 3 numbered steps: send link → client taps Allow on Google's own consent screen → status flips; link box + Copy; amber "Waiting for the client to approve…" line; "We never see or store passwords"); per-client rows (● Hotel Sahyadri, ● श्री डेंटल केअर, ○ Patil — Manager) each with **Disconnect** → confirm modal (publishing stops, audits keep working / Cancel / red Disconnect). Guards card: daily cap USD ($1.15 ≈ ₹95), public checker 50/day, per-IP 3/day inputs + amber explainer ("At cap: all external calls pause automatically…") + Save guards (toast).

### Account (admin)
Profile card: avatar (initial), user name (editable — updates sidebar footer + avatar everywhere), WhatsApp number, Agency name (defaults "तुमची डिजिटल एजन्सी" — used on public checker + PDFs), read-only login email; Save details. Security card: current/new password + Update password; session row ("Last login — today 09:12 · Chrome on Windows · Karad") + Sign out other sessions. Sign out card → login screen.

### Design System reference screen
In-app page mirroring this token/component inventory (swatches, type scale, badges, buttons incl. cost-preview, progress bars, spinner, skeleton shimmer, empty + error states, map pins, review row) — keep it in the build as a living style reference or drop it in production.

## Interactions & Behavior (summary)
- Every paid action shows its ₹ cost before running; the daily cap disables all of them app-wide with a banner.
- Approve-before-publish everywhere: nothing AI-generated goes live without a tap; publishing is gated by per-business connection status (● API publish / ○ manual-copy mode / – prospect: Copy only).
- Long operations use staged progress with human captions (audit 6 stages, grid scan, festival bulk run) — never a bare spinner.
- Feedback: every button press yields visible state change and/or a bottom-center toast (~2.4s).
- Animations: `fadeUp` 0.2s ease on modals/steps; `spin` 0.8s linear spinners; progress width transitions 0.6s; skeleton `shimmer` 1.4s.
- 5 key workflows to wire end-to-end (all clickable in the prototype): Sales visit (P2→run→P3→PDF→WhatsApp→Mark as Client, mobile-first) · Daily ops (P1→P6 approve→P9 publish) · Monthly proof (P5 re-scan→compare→P9 report status) · Lead capture (P10 4-step) · Festival day (P9 bulk).

## State Management (from the prototype's working logic)
Per screen: `screen`, `bizSel` (global selected business), cap state; P2 form/options/staged-run; P3 `isClient`, fix edits per language, WhatsApp modal/sent/toast, PDF busy; P4 added-competitor, in-PDF, refresh busy; P5 grid size/radius (drives cost), run state, compare toggle; P6 filter, per-review lang/tone/draft-overrides/busy/edit; P8 tab + per-tab inputs, usage counter, history; P9 client/month, plan add-ons per client, media selection/published, request counter, festival run state, NAP ticks, services per client; P11 modals, guard values; auth `userName`/`userEmail`. In production these map to the plan's tables (TB-001..016) + React Query/Supabase state; keep optimistic UI + toasts.

## Assets
No binary assets. Fonts via Google Fonts: IBM Plex Sans, IBM Plex Sans Devanagari, IBM Plex Mono (self-host for the VPS + PDF rendering; plan specifies Noto Devanagari as PDF fallback). Logo slots are intentional placeholders (dashed "LOGO") — agency + client logos are user-uploaded. Map is a stylized mock — production uses Leaflet + OSM (ADR-003). Festival creatives are HTML/CSS templates rendered to PNG 1080×1080 (no gen-AI images).

## Files
- `prototype/GMB Sarathi.dc.html` — the full interactive prototype (all 14 screens, states, flows). Open in a browser with `support.js` alongside. Single source of truth for visuals; inline styles carry the exact values.
- `prototype/support.js` — prototype runtime (viewer only, not for production).
- `docs/GMB_Tool_Development_Plan.md` — **the build blueprint**: PRD, parity matrices, Manovedh acceptance fixture, architecture, DB schema, API endpoints, milestones M0–M9, costs. Implement milestone-by-milestone; this design is the UI for its §2.7b page inventory.
- `docs/Original_Design_Brief.md` — the original product/design brief (users, fields, workflows).

## Update log — 12 Jul (final design pass)
Everything below is live in the prototype; recreate alongside the original 14 screens:
- **P12 Optimization Sprint** (Tools nav, `PAID` badge): client selector (prospects greyed "audit-only") → **prerequisites gate** (① client & plan w/ Mark-as-Client modal capturing owner name+WhatsApp, ② owner contact w/ inline fields, ③ profile access w/ connect QR modal, ④ fresh-audit ≤7 days w/ inline re-audit) → grouped **fix checklist** (Profile 15 / Reviews 3 / Posts 1 / Website 5 (4 vendor-blocked + copy-brief) / Visibility 1 / Citations 3 + custom-task adder) — every task AI-prefilled with Approve-&-apply (+ Edit mode), time/pts chips, Notify toggles; score simulator (41→live gauge, rubric deltas, grid minis); Client-updates panel (batched daily Marathi WhatsApp); Before/After report modal ("Work delivered" grouped + "Waiting on your website vendor"); states: prospect-gated / no-sprint / active / complete (41→78).
- **Website Audit** screen + P3 expandable section (fed by the "Website 6/10" rubric row): NAP match, title/meta checks + 2 AI replacements, local-keyword snippets, hours match, category pages, 633-word depth bar, spelling, heading tree w/ skip flags, click-to-call state, PageSpeed chip.
- **Category Finder** — 7th AI Tools tab: current-category chips, related-categories grid with volume badges (drill-in), related services + copy-all, from-URL / AI-chat suggesters, "Apply to audit" (updates P3 chips + fix list).
- **P5 realism**: Karad SVG map (Krishna river, प्रीतिसंगम, NH-166E, peth labels), unnumbered band-colored heat dots → tap popover (rank, distance+direction, top-5), Map/Table toggle (25 point rows), "Who owns this area" table (8 rows, Compare→P4), before/after minis + rank-movement list; Teleport = dropped-pin map + bubble + 0.20 km note + top-10 list.
- **P6** review-quality strip (fake-pattern stats). **P9** "Today's work" one-tap strip + owner-contact chip + sprint chip. **P0 Login + Account page** (name/email flow through sidebar). Design System page gained gate-row / task-group / client-selector samples.
- `prototype/GMB Sarathi — Standalone.html` = single-file offline bundle of the whole app (same content as the .dc.html).

## Suggested Claude Code kickoff prompt
> Read `design_handoff_gmb_sarathi/README.md` and `docs/GMB_Tool_Development_Plan.md`. Scaffold M0 (Next.js 14 + TS, Supabase schema TB-001..016, Docker, auth) then implement screens milestone-by-milestone, recreating `prototype/GMB Sarathi.dc.html` pixel-faithfully using the design tokens in the README. Start with P1 Dashboard, P2 New Audit and P3 Audit Report; use the Manovedh fixture values as seed/demo data and acceptance test.
