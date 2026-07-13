-- ============================================================
-- M2 grid — persist computed scan results (Day 3)
-- The grid engine precomputes ownership table, per-point top-5, weak
-- direction, %-in-top-3 and teleport top-10 at scan time and stores them here
-- so EP-004 can serve a HISTORICAL scan without recomputation. Without this
-- column the engine falls back to an in-process registry, which does NOT
-- survive serverless cold starts (Vercel) — so this column is what makes grid
-- history durable in production.
-- Supersedes grid_points.top_ranks (20260713000001), which is now unused but
-- left in place (nullable, harmless). Client: paste in the SQL editor.
-- ============================================================

alter table public.grid_scans
  add column if not exists results jsonb;
