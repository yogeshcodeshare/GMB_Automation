-- ============================================================
-- P12 Optimization Sprint hardening (Day 6, EP-021/022 locked contract)
-- Gives the manual-mode hard guarantees DB-level teeth (not route-only):
--   #4 approve-before-publish  → fix_tasks.approved (+ suggested_value / copy_text /
--                                ai_output_id for the AI-prefill + trail)
--   #3 baseline immutability   → write-once trigger on optimization_sprints
--   one-active-sprint invariant → partial unique index
-- Idempotent. Client: paste in the Supabase SQL editor. No RLS change; new columns
-- inherit the existing table policies. No DataForSEO / no paid path touched.
-- ============================================================

-- ---------- TB-018 fix_tasks: manual-mode + approve-before-publish columns ----------
alter table public.fix_tasks
  add column if not exists approved        boolean not null default false,
  add column if not exists suggested_value text,
  add column if not exists copy_text       text,
  add column if not exists ai_output_id    uuid references public.ai_outputs(id) on delete set null;

-- ---------- TB-017 optimization_sprints: baseline is captured at create ----------
-- Safe: every existing row already has a baseline_audit_id (verified before writing).
alter table public.optimization_sprints
  alter column baseline_audit_id set not null;

-- One ACTIVE sprint per business (US-024 gate has DB-level teeth; a race cannot mint
-- two competing baselines). Completed sprints are unconstrained.
create unique index if not exists optimization_sprints_one_active
  on public.optimization_sprints (business_id)
  where status = 'active';

-- ---------- Baseline write-once + freeze-after-complete (constraint #3) ----------
-- The typed SprintPatchRequest omits baseline_*/after_* so the app cannot mutate them,
-- but a service-role write or a future handler bug could. This trigger is the teeth:
-- baseline_* never change once set, and NO field of a completed sprint may change.
create or replace function public.enforce_sprint_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.baseline_audit_id is not null
     and new.baseline_audit_id is distinct from old.baseline_audit_id then
    raise exception 'optimization_sprints.baseline_audit_id is immutable once set (TB-017)';
  end if;
  if old.baseline_grid_id is not null
     and new.baseline_grid_id is distinct from old.baseline_grid_id then
    raise exception 'optimization_sprints.baseline_grid_id is immutable once set (TB-017)';
  end if;
  -- active -> complete is allowed (this UPDATE sets status/after_*/completed_at);
  -- once already complete, the row is frozen.
  if old.status = 'complete' then
    raise exception 'optimization_sprints row is immutable after completion';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sprint_immutability on public.optimization_sprints;
create trigger trg_sprint_immutability
  before update on public.optimization_sprints
  for each row execute function public.enforce_sprint_immutability();
