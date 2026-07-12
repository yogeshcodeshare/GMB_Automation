# General Project Memory — GMB Sarathi

## Project: GMB Sarathi (internal GBP audit + ops dashboard)
## Stack: Next.js 14.2 + TS · Supabase (Postgres/Auth/Storage) · Tailwind + shadcn
## Goal type: Production (internal agency tool v1)

## Key decisions at setup (12 Jul 2026)
- Blueprint v1.8 is the single source of truth (GMB_Tool_Development_Plan.md); CLAUDE.md
  header still says v1.7 — the file itself wins.
- Interim deploy Vercel (sprint); Docker/nginx on Hostinger VPS deferred (ADR-004).
  pdf.service behind FEATURE_PDF; wa.service + GBP publish behind flags until keys arrive.
- Env names are UNPREFIXED in .env.local (SUPABASE_URL etc.); next.config.mjs maps the
  two browser-safe values to NEXT_PUBLIC_* at build time. Never add more to that mapping.
- Spend-day boundary = Asia/Kolkata calendar day (startOfTodayIst in src/server/spend).
- Migrations can't be applied via API keys — founder pastes SQL (supabase/README.md).
- reviews_cache stays EXACTLY per TB-006; reviewer stats/owner replies ride in
  audits.raw_snapshot and surface as optional fields on ReviewItem.
- Node.js LTS v24.18.0 installed via winget on this machine (was absent); CI pins node 24.

## Risky assumptions to validate early
1. DataForSEO returns all §1.3d fields (services/attributes/hours/posts of any profile)
   — validate Day 2 with one real call against मनोवेध before finishing the normalizer.
2. Playwright PDF on Vercel functions (size limits, Devanagari embedding) — Day 4; VPS fallback.
3. Founder applies migrations before Day-2 backend integration (blocking).
