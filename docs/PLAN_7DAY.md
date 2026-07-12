# 7-Day Sprint Plan (13–19 Jul 2026)

Owners: **B** = backend agent · **F** = frontend agent · **M** = main agent · **Y** = Yogesh (client).
Milestone definitions + exit criteria: [MILESTONES.md](MILESTONES.md). Merge policy at the bottom.

| Day | Deliverables |
|---|---|
| **1 (Sun 13)** | **M**: M0 done ✅ (this commit) — verify founder TODOs land (migrations applied, founder login, `m0:verify` green). **F**: app shell (sidebar/topbar/switcher per handoff) + P1 Dashboard + P2 New Audit with fixture mock data. **B**: dataforseo.service client (guarded, task poll, cost table) + score.service rubric skeleton + fixture parser (`fixtures/*.md` → normalized audit input). |
| **2 (Mon 14)** | **B**: **M1 audit engine complete** — resolver, normalize, competitors, reviews, posts, category intel, link pack, sanity checks, bilingual tokenizer, persistence, EP-001/002 + `/api/businesses`. **Exit test green: Manovedh fixture reproduces** score 40–55 amber · phone missing · "Hospital" generic · services empty · hours 12–9 AM anomaly · reply rate 6.67% · 7 posts / 1 per 293 days · NAP mismatch · rented subdomain. **F**: P3 Audit Report + P4 Compare (mocks). **M**: merge both branches, verify M1 exit vs fixture. |
| **3 (Tue 15)** | **B**: M1.5 website audit (crawler + PSI + renormalise, EP-014) + M2 grid/teleport (generator, batch+poll, rank extract, EP-003/004, history compare). **F**: P5 Grid (Leaflet + OSM live map, pin popovers, ownership table, compare) + P3b Website Audit + P6 Review Inbox (mocks). **M**: daily merge; grid spot-check ±2 vs live Google (Y assists). |
| **4 (Wed 16)** | **B**: M3 AI layer (Groq→OpenRouter chain, 7 tools, Marathi prompts, approve list, EP-005/015) + M4 PDF (report template, Playwright behind FEATURE_PDF) + wa.service stub behind flag (EP-006/007). **F**: P7 Post Audit + P8 AI Tools (all 7 tabs). **= MVP GATE (M4)**: name in → Marathi PDF out (WhatsApp mocked). **Y** reviews 10 Marathi outputs. |
| **5 (Thu 17)** | **Integration day — swap mocks for real API.** **M** merges continuously, owns seam fixes; **F** wires P1–P8 to EP routes (React Query or equivalent), spend pill on EP-012, cap-hit banner; **B** fixes contract gaps same-day. Exit: every screen renders real Supabase data end-to-end on localhost. |
| **6 (Fri 18)** | **B+F**: M6 Optimization Sprint P12 in **MANUAL mode** (prereq gate, grouped checklist, AI prefills, copy-value → open Google editor; no GBP API writes) + P9 Client Ops read views + P11 Settings & Spend. **Y**: UAT on localhost against the 5 key workflows (handoff README) → fix list, same-day burn-down. |
| **7 (Sat 19)** | **B**: M7 public checker (EP-008/009, Turnstile, 3/IP/day + 50/day + 1 report/phone/day) + security pass. **F**: P10 public page (Marathi-first) + P0 polish + mobile pass (<920px). **M**: hardening checklist §1.8 (minus VPS items), deploy to **Vercel**, smoke-test prod. |
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
