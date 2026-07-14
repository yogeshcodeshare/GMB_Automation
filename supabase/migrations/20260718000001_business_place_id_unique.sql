-- ============================================================
-- UAT-6 — prevent duplicate business rows.
-- The two junk मनोवेध rows (place_id NULL, is_demo=false, 13 Jul) came from by-name
-- POST /api/audit attempts that created a provisional business, then failed (DataForSEO
-- deferred) leaving an orphan. Those rows are already deleted from the cloud DB.
-- Guard forward:
--   • a live business is unique by place_id (partial index — NULLs allowed for
--     provisional/by-name rows and demo rows);
--   • demo-mode audits (UAT-2) persist is_demo=true so `flush:demo` reaps any test row.
-- Idempotent. No RLS change. Client: paste in the Supabase SQL editor.
-- ============================================================

create unique index if not exists businesses_place_id_unique
  on public.businesses (place_id)
  where place_id is not null;

-- CID is the other stable identity a Maps link exposes; guard it too when present.
create unique index if not exists businesses_cid_unique
  on public.businesses (cid)
  where cid is not null;
