-- ============================================================
-- Demo-data flush policy (Day 3) — mark seed rows so they can be wiped
-- before go-live. `npm run flush:demo` deletes every business WHERE is_demo,
-- and ON DELETE CASCADE removes its audits/scores/reviews/posts/grids/etc.
-- Real audits (is_demo defaults false) are never touched.
-- Client: paste in the Supabase SQL editor (idempotent), after the M0 seed.
-- ============================================================

alter table public.businesses
  add column if not exists is_demo boolean not null default false;

-- Flag the six §2.9 seed businesses as demo (safe to re-run).
update public.businesses set is_demo = true
where id in (
  '11111111-1111-4111-8111-111111111111', -- मनोवेध हिप्नोक्लिनिक (fixture)
  '22222222-2222-4222-8222-222222222222', -- Hotel Sahyadri Veg
  '33333333-3333-4333-8333-333333333333', -- श्री डेंटल केअर
  '44444444-4444-4444-8444-444444444444', -- Patil Coaching Classes
  '55555555-5555-4555-8555-555555555555', -- कृष्णा मिसळ हाऊस
  '66666666-6666-4666-8666-666666666666'  -- Elegance Beauty Salon
);

-- Public-checker demo leads are also seed data — mark via a sentinel we can target.
-- (leads_public has no is_demo; the flush script deletes the four seed phone numbers.)
