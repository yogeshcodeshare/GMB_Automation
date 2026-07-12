# Changelog

## [Unreleased]

### Added — M0 foundations (12 Jul 2026, MAIN agent)
- Next.js 14.2 + TS + Tailwind (design tokens) + shadcn wiring; IBM Plex Sans/Devanagari/Mono
- Founder auth (Supabase): login page, middleware gate, sign-out; `create-founder` script
- Supabase migrations: TB-001..TB-018 exactly per ERD §2.3, RLS (founder-only), storage buckets
- Seed per ERD §2.9: 6 demo businesses, full Manovedh fixture audit (30 reviews, 7 posts,
  website audit, rubric 41 amber), 3 grid scans (7.8→6.1→4.6) × 25 points, settings,
  active sprint + 23 fix tasks (+P9/P1 demo extras: service cycles, 4 leads)
- Spend guard (hard constraint #2): `SpendGuard` + ledger store + EP-012 route; 14 unit
  tests green; RLS integration tests (run post-migration)
- Shared contract: `src/types/**` + `docs/agents/API_CONTRACT.md` (EP-001..022)
- CI: GitHub Actions typecheck + lint + test on push (main + agents/**)
- `m0-verify` script: env → schema → RLS → DataForSEO free ping → ledger row
