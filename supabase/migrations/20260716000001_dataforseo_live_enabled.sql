-- ============================================================
-- CR-1 — DataForSEO live kill-switch (Day 5)
-- Adds settings.dataforseo_live_enabled (default FALSE). The dfs client
-- refuses PAID calls unless this is true, independent of account status —
-- a controlled-rollout gate on top of the daily spend cap. Even after the
-- account is API-verified, live calls stay OFF until the founder flips this.
-- Free calls (appendix/user_data balance ping) are unaffected.
-- Idempotent. Client: paste in the Supabase SQL editor.
-- ============================================================

alter table public.settings
  add column if not exists dataforseo_live_enabled boolean not null default false;
