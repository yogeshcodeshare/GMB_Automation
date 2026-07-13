-- ============================================================
-- M3 AI layer — allow the 'fixes' tool type on ai_outputs (Day 4)
-- The top-fixes AI redraft persists like the other 7 tools; the original
-- CHECK (migration 0001) predated it. Idempotent. Client: paste in the SQL editor.
-- ============================================================

alter table public.ai_outputs drop constraint if exists ai_outputs_type_check;

alter table public.ai_outputs
  add constraint ai_outputs_type_check
  check (type in ('post','reply','description','qa','fb_post','festival','category','fixes'));
