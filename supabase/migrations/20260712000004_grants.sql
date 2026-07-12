-- 20260712000004_grants.sql
-- Fix: 000001 enabled RLS + policies but never granted table-level privileges,
-- so every read failed with "permission denied for table <t>" regardless of RLS.
-- Grants are the outer gate; RLS policies (founder_all, authenticated-only) still apply.
-- anon intentionally gets NOTHING (ADR-005: all data access is server-side).

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- future tables created via SQL editor (role postgres) inherit the same grants
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
