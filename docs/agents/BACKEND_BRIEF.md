# BACKEND agent brief — GMB Sarathi

**You are the BACKEND agent.** Worktree `../GMB_Automation-backend`, branch
`agents/backend`. You own `src/server/**` and `app/api/**` (also maintain
`src/server/spend/` — cap-logic changes need MAIN sign-off). Never commit to `main`;
never edit `app/(dashboard)`, `app/public`, `components`, `src/types`, `supabase`,
`.github`, `docs` — propose changes via `contract-proposal:` commit notes.

**Read first (in order):** `CLAUDE.md` → `docs/PRD.md` §1.3d + §1.6 → `docs/ERD.md` (all)
→ `docs/MILESTONES.md` → `docs/agents/API_CONTRACT.md` → `src/types/` → `fixtures/*.md`.

## Hard constraints (violations get reverted)

1. **Every DataForSEO request goes through `SpendGuard.guarded()`** — no exceptions, no
   direct fetches. Paid POST endpoints implement `{ preview: true }` → `CostPreview`.
2. DataForSEO is the ONLY paid vendor. AI = Groq key first, OpenRouter free models
   fallback (chain in settings.model_chain). PSI = free key. No other external spend.
3. wa.service + GBP publish behind flags (`src/lib/env.ts`) — everything compiles and
   unit-tests with those keys ABSENT; flagged endpoints return `FEATURE_DISABLED` (503).
4. Return the `ApiResponse<T>` envelope with correct HTTP codes on every route.
5. No client passwords; GBP refresh tokens encrypted before TB-009 insert.
6. Marathi is first-class: bilingual tokenizer (MS1-T11), Marathi prompt library,
   UTF-8/Devanagari-safe everywhere including PDF.

## Your milestones (dates = docs/PLAN_7DAY.md)

- **Day 1** — dataforseo.service (auth, task submit/poll, retry ×2, cost table §2.6,
  guarded) · score.service skeleton (rubric §2.5, deterministic, unit-tested) ·
  fixture parser: `fixtures/*.md` → the normalized audit input shape.
- **Day 2 — M1 (exit: fixture test green)** — MS1-T01..T11 + EP-001/002,
  `/api/audit/:id/progress`, `/api/businesses*`, `/api/reviews/:businessId`.
  **The automated Manovedh test must assert:** total 40–55 + band amber · phone-missing
  flag · category "Hospital" flagged generic · services empty · hours anomaly (12–9 AM)
  · reply rate 6.67% · 7 posts, 1/293 days, avg 171 chars · NAP phone mismatch ·
  rented-subdomain (grexa.site) · review stats (30 reviews, 4.9★, 0 photos, 1 Local
  Guide, velocity ~1.2/mo). Suggested per-row target (matches seed):
  10/0/7/4/5/3/1/2/6/3 = 41.
- **Day 3 — M1.5 + M2** — website crawler + PSI + renormalisation (EP-014) · grid
  generator/batcher/poller/rank-extractor (EP-003/004), teleport, history + compare,
  cost <₹5 per 5×5.
- **Day 4 — M3 + M4** — ai.service chain + 7 tool prompt schemas (EP-005/015, approve
  list TB-007) · report HTML → Playwright PDF behind FEATURE_PDF (EP-006) · wa.service
  interface + stub (EP-007). **MVP gate.**
- **Day 5** — integration: fix contract gaps the same day the frontend hits them.
- **Day 6** — EP-021 sprint endpoints in manual mode + prereqs route.
- **Day 7** — EP-008/009 public checker + Turnstile verify + rate limits (TB-011 values)
  + security pass.

## Definition of done (every milestone)

Unit tests green (`npm test`) · typecheck + lint green · endpoint matches
API_CONTRACT.md exactly · fixture/exit criteria verified · CHANGELOG note in the commit
body. Commit small; push `agents/backend` at least twice daily. The MAIN agent merges
daily and verifies exits BEFORE you start the next milestone.

## Environment notes

`.env.local` sits in your worktree (never commit; never print values). Supabase server
access via `createServiceClient()`; migrations are MAIN's — request schema changes, don't
write them. DataForSEO trial has ~$1: prefer the sandbox-cheap `standard` mode; batch
grid points; ALWAYS check `preview` math before a live call. Node 24 at
`C:\Program Files\nodejs` (prepend to PATH in shells: `$env:Path = "C:\Program Files\nodejs;$env:Path"`).
