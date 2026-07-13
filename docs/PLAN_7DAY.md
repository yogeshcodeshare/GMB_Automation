# 7-Day Sprint Plan (Day 1 = 12 Jul 2026 · Day 7 = 18 Jul; 19 Jul is buffer)

Owners: **B** = backend agent · **F** = frontend agent · **M** = main agent · **Y** = Yogesh (client).
Milestone definitions + exit criteria: [MILESTONES.md](MILESTONES.md). Merge policy at the bottom.

| Day | Deliverables |
|---|---|
| **1 (Sat 12) — CLOSED** | **M ✅ SHIPPED**: M0 complete + adversarially verified — scaffold, schema+seed (applied to live DB), spend guard (atomic reserve, 24 tests green incl. live RLS), contract EP-001..022, CI, briefs, worktrees; `m0:verify` **12/12** incl. live DataForSEO ping → spend_ledger (M0 exit criterion met); PM verification fixes committed (grants migration 0004, script path fixes, RLS test flavours, CLAUDE.md v1.8). **F ⏩ CARRY-OVER → Day 2**: app shell + P1 Dashboard + P2 New Audit (no Day-1 commits on `agents/frontend`). **B ⏩ CARRY-OVER → Day 2**: dataforseo.service client + score.service skeleton + fixture parser (no Day-1 commits on `agents/backend`). |
| **2 (Sun 13) — CLOSED** | **B ✅ M1 DONE + AHEAD (4 PRs)**: fixture parser · score.service (§2.5) · dataforseo.service (all 6 §2.6 endpoints guarded + preview overloads) · **full M1 audit pipeline: resolver, reviews/posts normalize, competitor discovery, category intel, link pack (27), bilingual tokenizer, sanity checks, persistence, report, top-fixes + EP-001/002/013/015 + `/api/businesses` + `/api/reviews`**. **🎯 M1 EXIT VERIFIED by MAIN** — `tests/manovedh-fixture.test.ts` (13 assertions) reproduces the fixture end-to-end: 41 amber, exact rubric, phone/category/services/hours/reply/posts/NAP/subdomain flags, review stats, all six sanity flags, EP-002 payload. **F ✅ SHIPPED + AHEAD (2 PRs)**: app shell + P1 Dashboard + P2 New Audit + **P3 Audit Report** (gauge, 10-row rubric/mobile accordions, fixes मराठी–EN toggle+edit, 27-link pack, WhatsApp modal, Mark-as-Client, mobile sticky bar) + 14-screen scaffold + shared UI kit + design-system page; typed mocks incl. full EP-002 `AuditReport`. **M ✅**: merged **5 PRs** (3 B + 2 F) → `main` `7d77bad`, each re-gated (**107 tests / typecheck / lint / build** all green), arbitrated 2 contract gaps (`resolve` + `dashboard/stats` + `BusinessCandidate`/`DashboardStats` types), local CI substitute (Actions still disabled). **M1 complete a day early.** |
| **3 (Mon 14) — back on original track (M1 done early)** | **B**: **M1.5** website audit (crawler + PSI + renormalise, EP-014) **with SEC-001 SSRF guard (P0, blocking DoD)** + **M2** grid/teleport (generator, batch+poll, rank extract, EP-003/004, history compare). Small M1 tails if any: wire `GET /api/businesses/resolve` + `GET /api/dashboard/stats` (both approved, ₹0). **F**: **P4 Competitor Compare** + **P6 Review Inbox** + **P3b Website Audit** (mocks); P5 Grid next. **M**: continuous merges + gate; grid spot-check ±2 vs live Google (Y assists) once EP-003/004 land; chase the Actions toggle. **⛔ BLOCKER: DataForSEO account UNVERIFIED** (paid endpoints 403 `40104`) — Yogesh must verify at app.dataforseo.com before ANY live audit/grid works; until then everything is fixture-verified only. |
| **4 (Tue 15)** | **B**: M3 AI layer (Groq→OpenRouter chain, 7 tools, Marathi prompts, approve list, EP-005/015) + M4 PDF (report template, Playwright behind FEATURE_PDF) + wa.service stub behind flag (EP-006/007). **F**: P7 Post Audit + P8 AI Tools (all 7 tabs). **= MVP GATE (M4)**: name in → Marathi PDF out (WhatsApp mocked). **Y** reviews 10 Marathi outputs. |
| **5 (Wed 16)** | **Integration day — swap mocks for real API.** **M** merges continuously, owns seam fixes; **F** wires P1–P8 to EP routes (React Query or equivalent), spend pill on EP-012, cap-hit banner; **B** fixes contract gaps same-day. Exit: every screen renders real Supabase data end-to-end on localhost. |
| **6 (Thu 17)** | **B+F**: M6 Optimization Sprint P12 in **MANUAL mode** (prereq gate, grouped checklist, AI prefills, copy-value → open Google editor; no GBP API writes) + P9 Client Ops read views + P11 Settings & Spend. **Y**: UAT on localhost against the 5 key workflows (handoff README) → fix list, same-day burn-down. |
| **7 (Fri 18)** | **B**: M7 public checker (EP-008/009, Turnstile, 3/IP/day + 50/day + 1 report/phone/day) + security pass. **F**: P10 public page (Marathi-first) + P0 polish + mobile pass (<920px). **M**: hardening checklist §1.8 (minus VPS items), deploy to **Vercel**, smoke-test prod. |
| **Week 2** | GBP OAuth publishing + WhatsApp live when keys/approval arrive (flags flip on); M9 ops layer after first paying clients (per blueprint calendar rule). |

## Merge policy (MAIN agent enforces)

1. Only the MAIN agent merges to `main`; both agent branches merge at least once daily
   (more on Day 5).
2. CI (typecheck + lint + test) must be green on the branch before merge.
3. A milestone's exit criteria are verified by the MAIN agent BEFORE the next milestone
   starts (fixture test for M1 is non-negotiable).
4. Agents commit small and push `agents/backend` / `agents/frontend` at least twice daily;
   never touch `main` or the other agent's folders (.claude/rules/ownership.md).
5. Contract changes: `contract-proposal:` note → MAIN edits `src/types` + API_CONTRACT.md
   → both agents pull.
