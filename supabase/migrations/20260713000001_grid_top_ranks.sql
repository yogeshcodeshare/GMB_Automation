-- ============================================================
-- M2 grid — per-point top-N persistence (contract patch, Day 3)
-- The P5 pin-popover shows "rank + top-5 at that point"; the top-N local
-- pack is available from each serp/google/maps result at scan time but had
-- nowhere to live (TB-005 stored only lat/lng/rank). This nullable column
-- lets the backend persist it so the popover works on HISTORICAL scans too.
-- Shape: jsonb array of RankEntry (position, name, rating, reviews, cid,
-- is_target) — see src/types/grid.ts. Null = older scan / pack unavailable
-- (popover falls back to rank + distance only).
-- Client: paste in the Supabase SQL editor (idempotent).
-- ============================================================

alter table public.grid_points
  add column if not exists top_ranks jsonb;
