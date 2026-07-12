# FRONTEND agent brief — GMB Sarathi

**You are the FRONTEND agent.** Worktree `../GMB_Automation-frontend`, branch
`agents/frontend`. You own `app/(dashboard)/**`, `app/public/**`, `components/**` (plus
`app/login` — replace the M0 placeholder). Never commit to `main`; never edit
`src/server`, `app/api`, `src/types`, `supabase`, `.github`, `docs` — propose contract
changes via `contract-proposal:` commit notes.

**Read first (in order):** `CLAUDE.md` →
`design/handoff/design_handoff_gmb_sarathi/README.md` (tokens + all 14 screens + update
log — your visual truth) → `docs/ERD.md` §2.7b → `docs/agents/API_CONTRACT.md` →
`src/types/` → open `design/handoff/design_handoff_gmb_sarathi/prototype/GMB Sarathi.dc.html`
in a browser (with `support.js` beside it) and CLICK THROUGH every screen before coding it.

## Non-negotiables

1. **Pixel-faithful to the prototype** — tokens are wired into `tailwind.config.ts`
   (bg-app/surface/nav, ink.*, brand.*, band.*, nav.*; fonts `font-sans` = IBM Plex Sans
   + Devanagari, `font-mono` = IBM Plex Mono). Component recipes (score pill, status
   chip, connection glyph ●/○/–, type tag, buttons incl. cost-preview label, segmented
   control, toast, modal, map pin) live in the handoff README — build them once in
   `components/` and reuse.
2. **Devanagari never breaks layout** (ellipsis + tooltip on business names).
3. **Every paid button shows ₹ cost in mono** ("Run audit · ₹1.9"); the cap-hit state
   disables all paid actions app-wide with the red banner (EP-012 drives it).
4. **Approve-before-publish UX** — publish buttons gated by connection status
   (● API / ○ manual-copy / – prospect: copy only).
5. Long operations = staged progress with human captions (never a bare spinner);
   every action → visible state change or bottom-center toast (~2.4s).
6. Mobile <920px: drawer nav, single column, h-scroll tables, P3 sticky action bar.
7. Use shadcn/ui (`components.json` is configured; `npx shadcn@2 add <component>`) +
   Tailwind; Leaflet + OSM for real maps (P5) — never Google Maps JS.

## Build order (dates = docs/PLAN_7DAY.md; mocks first, wire later)

- **Day 1** — app shell (sidebar 230px groups per handoff, topbar 58px with spend pill +
  business switcher) · P1 Dashboard · P2 New Audit (all states: candidates, no-results,
  manual ID, cost preview, staged running, cap-hit).
- **Day 2** — P3 Audit Report (gauge, 10-row rubric, fixes with edit, business card,
  hours anomalies, 27-link pack, WhatsApp modal, mobile accordions + sticky bar) · P4
  Compare (add-competitor modal, flagged/winner cells, AI summary blocks).
- **Day 3** — P5 Grid (Leaflet map, band-colored pins, pin popover, ownership table,
  map/table toggle, teleport mode, before/after compare) · P3b Website Audit · P6 Review
  Inbox (KPI + quality strip, filters, AI draft box with lang/tone, keyword cloud, trend
  with ">1yr approximated" note).
- **Day 4** — P7 Post Audit (metric cards, quarter bars + cumulative line, compare
  callout) · P8 AI Tools (all 7 tabs incl. Category Finder, usage meter, history).
- **Day 5 — integration** — swap ALL mocks for the EP routes per API_CONTRACT.md; spend
  pill + cap banner live on EP-012; loading/error/empty states per §1.6.
- **Day 6** — P12 Optimization Sprint (prereq gate, grouped checklist, AI prefills,
  manual-mode copy buttons, score simulator) · P9 Client Ops (read views + today's-work
  strip) · P11 Settings & Spend (incl. "Preview cap-hit state") · Account page.
- **Day 7** — P10 Public checker (Marathi-first 5-step, ≥14.5px base, 52px CTAs,
  trust chips, blurred teaser, consent gate) · P0 login polish · full mobile pass ·
  Design System reference page.

**Mock data rule:** until Day 5, drive screens from typed mocks built from the fixture
values (`fixtures/*.md`, seed §2.9: मनोवेध 41 amber, the exact rubric split 10/0/7/4/5/
3/1/2/6/3, grid 4.6 with the handoff's 25-pin matrix, 6 businesses). Keep mocks in
`components/mocks/` typed with `@/types` so the Day-5 swap is mechanical.

## Definition of done (every screen)

Matches the prototype side-by-side · typecheck + lint green · renders on mobile ·
Devanagari intact · all states reachable (loading/empty/error/cap-hit) · uses `@/types`
shapes (no ad-hoc interfaces for contract data). Commit small; push `agents/frontend`
at least twice daily. Node 24 at `C:\Program Files\nodejs` (prepend to PATH:
`$env:Path = "C:\Program Files\nodejs;$env:Path"`).
