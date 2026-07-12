-- ============================================================
-- GMB Sarathi — M0 schema migration
-- Tables TB-001..TB-018 exactly per docs/ERD.md §2.3 (v1.8)
-- RLS: single founder user — `authenticated` has full access,
-- `anon` has NO policies (deny by default). All app data routes
-- run server-side with the secret key (ADR-005).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- TB-001 businesses ----------
create table if not exists public.businesses (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  city              text,
  place_id          text unique,
  cid               text,
  lat               double precision,
  lng               double precision,
  website           text,
  is_client         boolean not null default false,
  gbp_location_id   text,
  plan              jsonb,
  connection_status text not null default 'none'
                    check (connection_status in ('none','manager','oauth')),
  owner_name        text,
  owner_whatsapp    text,
  created_at        timestamptz not null default now()
);

-- ---------- TB-002 audits ----------
create table if not exists public.audits (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  raw_snapshot   jsonb not null default '{}'::jsonb,
  competitor_ids uuid[] not null default '{}',
  created_at     timestamptz not null default now()
);
create index if not exists audits_business_idx on public.audits (business_id, created_at desc);

-- ---------- TB-003 audit_scores ----------
-- Rubric §2.5: claimed 10 · category 15 · completeness 15 · photos 10 ·
-- reviews_count 10 · reviews_velocity 8 · reply_rate 7 · posts 10 · website 10 · nap 5 = 100
create table if not exists public.audit_scores (
  audit_id         uuid primary key references public.audits(id) on delete cascade,
  total            integer not null check (total between 0 and 100),
  claimed          integer not null check (claimed between 0 and 10),
  category         integer not null check (category between 0 and 15),
  completeness     integer not null check (completeness between 0 and 15),
  photos           integer not null check (photos between 0 and 10),
  reviews_count    integer not null check (reviews_count between 0 and 10),
  reviews_velocity integer not null check (reviews_velocity between 0 and 8),
  reply_rate       integer not null check (reply_rate between 0 and 7),
  posts            integer not null check (posts between 0 and 10),
  website          integer not null check (website between 0 and 10),
  nap              integer not null check (nap between 0 and 5)
);

-- ---------- TB-004 grid_scans ----------
create table if not exists public.grid_scans (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  keyword     text not null,
  grid_size   integer not null check (grid_size in (1,3,5,7)),
  radius_m    integer not null check (radius_m between 100 and 10000),
  status      text not null default 'queued'
              check (status in ('queued','running','done','failed','partial')),
  avg_rank    numeric(4,1),
  cost_usd    numeric(8,4),
  created_at  timestamptz not null default now()
);
create index if not exists grid_scans_business_idx on public.grid_scans (business_id, created_at desc);

-- ---------- TB-005 grid_points ----------
create table if not exists public.grid_points (
  id      bigint generated always as identity primary key,
  scan_id uuid not null references public.grid_scans(id) on delete cascade,
  lat     double precision not null,
  lng     double precision not null,
  rank    integer check (rank between 1 and 20) -- null = not in top 20
);
create index if not exists grid_points_scan_idx on public.grid_points (scan_id);

-- ---------- TB-006 reviews_cache ----------
create table if not exists public.reviews_cache (
  id          bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  review_id   text not null,
  rating      integer not null check (rating between 1 and 5),
  text        text,
  author      text,
  review_ts   timestamptz,
  replied     boolean not null default false,
  unique (business_id, review_id)
);
create index if not exists reviews_cache_business_idx on public.reviews_cache (business_id, review_ts desc);

-- ---------- TB-007 ai_outputs ----------
create table if not exists public.ai_outputs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  type        text not null
              check (type in ('post','reply','description','qa','fb_post','festival','category')),
  lang        text not null check (lang in ('mr','en','hinglish')),
  output      text not null,
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- TB-008 leads_public ----------
create table if not exists public.leads_public (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  business_name text not null,
  consent_ts    timestamptz not null,
  score_shown   integer,
  report_sent   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------- TB-009 gbp_connections ----------
-- refresh_token is encrypted at the app layer BEFORE insert (TB-009 / ADR-010).
create table if not exists public.gbp_connections (
  business_id   uuid primary key references public.businesses(id) on delete cascade,
  refresh_token text not null,
  scopes        text[] not null default '{}',
  connected_at  timestamptz not null default now()
);

-- ---------- TB-010 spend_ledger ----------
create table if not exists public.spend_ledger (
  id         bigint generated always as identity primary key,
  endpoint   text not null,
  cost_usd   numeric(10,6) not null check (cost_usd >= 0),
  task_id    text,
  created_at timestamptz not null default now()
);
create index if not exists spend_ledger_created_idx on public.spend_ledger (created_at desc);

-- ---------- TB-011 settings (single row) ----------
create table if not exists public.settings (
  id                  smallint primary key default 1 check (id = 1),
  daily_spend_cap_usd numeric(6,2) not null default 1.00,
  public_daily_limit  integer not null default 50,
  per_ip_limit        integer not null default 3,
  model_chain         jsonb not null default '[]'::jsonb
);

-- ---------- TB-012 posts_cache ----------
create table if not exists public.posts_cache (
  id          bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  post_ts     timestamptz,
  text        text,
  char_count  integer,
  has_media   boolean not null default false,
  links       integer not null default 0
);
create index if not exists posts_cache_business_idx on public.posts_cache (business_id, post_ts desc);

-- ---------- TB-013 website_audits ----------
create table if not exists public.website_audits (
  id          bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  psi_score   integer check (psi_score between 0 and 100),
  title_ok    boolean,
  meta_ok     boolean,
  h1_ok       boolean,
  schema_ok   boolean,
  nap_match   boolean,
  city_kw     boolean,
  checked_at  timestamptz not null default now()
);
create index if not exists website_audits_business_idx on public.website_audits (business_id, checked_at desc);

-- ---------- TB-014 service_cycles ----------
create table if not exists public.service_cycles (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  month         date not null, -- first day of the month
  posts_done    integer not null default 0,
  posts_target  integer not null default 0,
  photos_done   integer not null default 0,
  photos_target integer not null default 0,
  replies_pct   numeric(5,2),
  report_sent   boolean not null default false,
  checklist     jsonb not null default '{}'::jsonb,
  unique (business_id, month)
);

-- ---------- TB-015 media_inbox ----------
create table if not exists public.media_inbox (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null,
  received_ts  timestamptz not null default now(),
  published    boolean not null default false,
  gbp_media_id text
);

-- ---------- TB-016 review_requests ----------
create table if not exists public.review_requests (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  customer_phone  text not null,
  sent_ts         timestamptz not null default now(),
  reminded_ts     timestamptz,
  review_detected boolean not null default false
);

-- ---------- TB-017 optimization_sprints ----------
create table if not exists public.optimization_sprints (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  started_at        timestamptz not null default now(),
  baseline_audit_id uuid references public.audits(id),
  baseline_grid_id  uuid references public.grid_scans(id),
  after_audit_id    uuid references public.audits(id),
  after_grid_id     uuid references public.grid_scans(id),
  status            text not null default 'active' check (status in ('active','complete')),
  completed_at      timestamptz
);

-- ---------- TB-018 fix_tasks ----------
create table if not exists public.fix_tasks (
  id            uuid primary key default gen_random_uuid(),
  sprint_id     uuid not null references public.optimization_sprints(id) on delete cascade,
  rubric_key    text not null,
  title         text not null,
  status        text not null default 'todo' check (status in ('todo','doing','done','blocked')),
  source        text not null default 'audit' check (source in ('audit','manual')),
  done_at       timestamptz,
  note          text,
  change_before text,
  change_after  text,
  created_at    timestamptz not null default now()
);
create index if not exists fix_tasks_sprint_idx on public.fix_tasks (sprint_id);

-- ============================================================
-- RLS — enable on every table; authenticated (the founder) gets
-- full access; anon gets nothing (no policy = deny).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'businesses','audits','audit_scores','grid_scans','grid_points',
    'reviews_cache','ai_outputs','leads_public','gbp_connections',
    'spend_ledger','settings','posts_cache','website_audits',
    'service_cycles','media_inbox','review_requests',
    'optimization_sprints','fix_tasks'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'drop policy if exists founder_all on public.%I', t
    );
    execute format(
      'create policy founder_all on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ---------- Storage buckets (PDF reports M4, client photos M9) ----------
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false), ('client-media', 'client-media', false)
on conflict (id) do nothing;
