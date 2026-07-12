-- ============================================================
-- Spend-guard hardening (M0 review findings):
-- 1. reserve_spend: ATOMIC cap-check + reservation insert — fixes the TOCTOU
--    race where N concurrent paid calls all passed the check against the same
--    stale sum (e.g. a 5×5 grid batch overshooting the cap).
-- 2. sum_spend_since: DB-side SUM — fixes silent undercounting once a day
--    exceeds PostgREST's default 1000-row response limit.
-- 3. settle_spend: replaces a reservation's estimate with the actual cost.
-- Server-only (service_role); never callable by anon/authenticated.
-- ============================================================

create or replace function public.sum_spend_since(p_since timestamptz)
returns numeric
language sql
stable
as $$
  select coalesce(sum(cost_usd), 0) from public.spend_ledger where created_at >= p_since;
$$;

create or replace function public.reserve_spend(
  p_endpoint text,
  p_estimate numeric,
  p_cap      numeric,
  p_since    timestamptz
) returns bigint
language plpgsql
as $fn$
declare
  v_spent numeric;
  v_id    bigint;
begin
  if p_estimate < 0 then
    raise exception 'estimate must be >= 0';
  end if;
  -- Serialize concurrent reservations so check + insert is atomic.
  lock table public.spend_ledger in share row exclusive mode;
  select coalesce(sum(cost_usd), 0) into v_spent
  from public.spend_ledger
  where created_at >= p_since;
  if p_estimate > 0 and (v_spent >= p_cap or v_spent + p_estimate > p_cap) then
    raise exception 'SPEND_CAP_REACHED spent=% estimate=% cap=%', v_spent, p_estimate, p_cap;
  end if;
  insert into public.spend_ledger (endpoint, cost_usd, task_id)
  values (p_endpoint || ' (reserved)', p_estimate, null)
  returning id into v_id;
  return v_id;
end;
$fn$;

create or replace function public.settle_spend(
  p_reservation_id bigint,
  p_endpoint       text,
  p_actual         numeric,
  p_task_id        text
) returns void
language sql
as $$
  update public.spend_ledger
  set endpoint = p_endpoint,
      cost_usd = greatest(p_actual, 0),
      task_id  = p_task_id
  where id = p_reservation_id;
$$;

revoke all on function public.sum_spend_since(timestamptz) from public, anon, authenticated;
revoke all on function public.reserve_spend(text, numeric, numeric, timestamptz) from public, anon, authenticated;
revoke all on function public.settle_spend(bigint, text, numeric, text) from public, anon, authenticated;
grant execute on function public.sum_spend_since(timestamptz) to service_role;
grant execute on function public.reserve_spend(text, numeric, numeric, timestamptz) to service_role;
grant execute on function public.settle_spend(bigint, text, numeric, text) to service_role;
