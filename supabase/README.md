# Supabase — applying the schema

The app talks to the cloud Supabase project in `.env.local`. The API keys can NOT run
DDL, so the two migrations are applied once by hand (2 minutes):

1. Open the project → **SQL Editor** → New query.
2. Paste the full contents of `migrations/20260712000001_init_schema.sql` → **Run**.
3. Paste the full contents of `migrations/20260712000002_seed.sql` → **Run**.
4. Paste the full contents of `migrations/20260712000003_spend_functions.sql` → **Run**.
5. **Day-3 additions** — paste and **Run** each: `migrations/20260713000002_is_demo.sql`
   (demo-flush flag) and `migrations/20260713000003_grid_results.sql` (durable grid scan
   results — required for grid history on serverless). `20260713000001_grid_top_ranks.sql`
   is optional (superseded by `grid_results`; harmless if already applied).
6. Verify: `npm run m0:verify` → all checks PASS, and `npm run test:rls` → green.

Then create the founder login (once):

```
npm run create-founder -- your-email@example.com "a-strong-password"
```

## Rules

- **Schema truth lives here.** Every schema change is a NEW numbered migration file in
  `supabase/migrations/` (never edit an applied one), owned by the MAIN agent.
- Tables map 1:1 to TB-001..TB-018 in `docs/ERD.md` §2.3. RLS: `authenticated` = full
  access (single founder), `anon` = nothing; all data routes are server-side (ADR-005).
- `spend_ledger` is never seeded — it is the real spend record for the daily cap.
