# Folder ownership (3-agent sprint)

- `src/server/**` + `app/api/**` → **BACKEND agent** (branch `agents/backend`)
- `app/(dashboard)/**` + `app/public/**` + `components/**` → **FRONTEND agent** (branch `agents/frontend`)
- `src/types/**` + `supabase/**` + `.github/**` + `docs/**` → **MAIN agent only**
- `src/lib/**` shared: additive helpers allowed with a handoff note; MAIN arbitrates.

Never commit to `main` — only the MAIN agent merges. Never edit the other agent's
folders. Contract changes go through `docs/agents/API_CONTRACT.md` via the MAIN agent.
