# Security Policy

## Non-negotiables (from CLAUDE.md + ERD NFRs)

- **Keys server-side only.** The browser sees ONLY `SUPABASE_URL` + the publishable key
  (designed to be public). `SUPABASE_SECRET_KEY`, DataForSEO, Groq, Google OAuth,
  Turnstile secret, WhatsApp tokens: server-only. Never log or print key values.
- **`.env*` is gitignored.** Secrets live in `.env.local` locally and in Vercel env vars.
  If a key ever lands in a commit or output, rotate it immediately and tell the founder.
- **No client passwords, ever** (ADR-010). GBP access = OAuth on the client's own device
  (refresh tokens encrypted at the app layer before hitting TB-009) or Manager mode.
- **RLS everywhere** (ADR-005): anon sees nothing; data routes run server-side.
  `npm run test:rls` proves the lockout.
- **Public surface** (P10 only): Turnstile + 3/IP/day + 50/day global + 1 report/phone/day.
  The spend guard is the last line — the DataForSEO balance can never drain (US-012).
- **DPDP-lite** (§1.7): leads stored with consent text + timestamp; delete-on-request.

## Headers & middleware

`next.config.mjs` sets X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
`middleware.ts` denies everything except login/public/health without a founder session.

## Reporting

Solo-founder project: report anything suspicious to the founder (Yogesh) directly.
Weekly VPS snapshot once on the VPS; Supabase PITR covers the database.
