# Security rules (all agents)

- NEVER print, log, or commit key values. `.env*` is gitignored and deny-listed; refer
  to keys by NAME only.
- NEVER call DataForSEO outside `SpendGuard.guarded()` (src/server/spend) — hard
  constraint #2. Every paid endpoint supports `{ preview: true }` cost preview.
- NEVER weaken RLS, expose the secret key to the client, or add an anon policy.
- wa.service / GBP publishing stay behind feature flags (src/lib/env.ts) until keys
  arrive — code must compile and test without them (FEATURE_DISABLED envelope).
- AI output publishes only after founder approval (`ai_outputs.approved = true`).
- ALWAYS validate input in `app/api/**` route handlers and return the ApiResponse
  envelope with proper HTTP status (docs/agents/API_CONTRACT.md).
