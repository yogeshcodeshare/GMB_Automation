# 7-Day Sprint Plan (Day 1 = 12 Jul 2026 · Day 7 = 18 Jul; 19 Jul is buffer)

Owners: **B** = backend agent · **F** = frontend agent · **M** = main agent · **Y** = Yogesh (client).
Milestone definitions + exit criteria: [MILESTONES.md](MILESTONES.md). Merge policy at the bottom.

| Day | Deliverables |
|---|---|
| **1 (Sat 12) — CLOSED** | **M ✅ SHIPPED**: M0 complete + adversarially verified — scaffold, schema+seed (applied to live DB), spend guard (atomic reserve, 24 tests green incl. live RLS), contract EP-001..022, CI, briefs, worktrees; `m0:verify` **12/12** incl. live DataForSEO ping → spend_ledger (M0 exit criterion met); PM verification fixes committed (grants migration 0004, script path fixes, RLS test flavours, CLAUDE.md v1.8). **F ⏩ CARRY-OVER → Day 2**: app shell + P1 Dashboard + P2 New Audit (no Day-1 commits on `agents/frontend`). **B ⏩ CARRY-OVER → Day 2**: dataforseo.service client + score.service skeleton + fixture parser (no Day-1 commits on `agents/backend`). |
| **2 (Sun 13) — CLOSED** | **B ◑ M1 PARTIAL (3 PRs merged)**: ✅ fixture parser (`fixtures/*.md`→AuditInput) · ✅ score.service (§2.5, Manovedh calibration test green: **41 amber, 10/0/7/4/5/3/1/2/6/3**) · ✅ dataforseo.service (all 6 §2.6 endpoints guarded, preview overloads, creds safe) · ✅ sanity checks + post stats. **Still open for M1 exit (→ Day 3)**: business resolver + EP `resolve`, reviews/posts normalize, competitor discovery, category intel (in progress, uncommitted), link pack, persistence, **EP-001/002 routes**, and the **end-to-end audit test reproducing the fixture through the pipeline**. Scoring calibration (the heart of the fixture) is proven; engine assembly + routes remain. **F ✅ SHIPPED (PR #3)**: app shell (sidebar/topbar/spend pill/biz switcher) + P1 Dashboard + P2 New Audit + 14-screen scaffold + shared UI kit + design-system page, typed mocks, rendered & verified on `/public/dev`. **M ✅**: merged 3 PRs (2 B + 1 F) into `main` `01234d8`, each re-gated (typecheck/lint/78 tests/build), arbitrated the `resolve`/`BusinessCandidate` contract gap, ran local CI substitute (Actions still disabled). **M1 NOT declared done** — carries to Day 3. |
| **3 (Mon 14) — REARRANGED** | **B (AM): FINISH M1 first** — resolver + EP `resolve`, reviews/posts normalize, competitor discovery, category intel, link pack (~25), persistence, **EP-001/002**, and the **end-to-end fixture test** (the real M1 exit; MAIN verifies before M1.5). **B (PM): M1.5** website audit (crawler + PSI + renormalise, EP-014) **with SEC-001 SSRF guard** (P0). **M2 grid/teleport slips to Day 4** (was Day 3) — realistic given the M1 tail. **F**: build out **P3 Audit Report + P4 Compare** (Day-2 targets, still mocks), then start P6 Review Inbox; P5 Grid + P3b Website move with M2 to Day 4. **M**: continuous merges; once EP-001/002 land, verify M1 exit end-to-end; grid spot-check moves to Day 4. |
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
