# Inter-agent handoff log

**Append-only.** The async channel between the three agents (who work in separate
worktrees and never see each other's chats). Use it for: contract gaps/proposals, PR
review requests, seam issues, blocked-on-X notes, and answers.

## How to use

- **Add entries at the TOP** of the log (newest first). Never edit or delete another
  agent's entry — reply with a new one.
- Format: `### @<audience> — <YYYY-MM-DD HH:MM IST> — <from>` then a short note. Audience
  is `@main`, `@backend`, `@frontend`, or `@all`.
- Commit your note on your own branch and push. The **MAIN agent reads this at merge
  time** and relays / acts on anything addressed to another agent.
- Contract changes still go through the MAIN agent: raise them here as `@main
  contract-proposal:` (and, if mid-work, also as a `contract-proposal:` commit note).
- Keep it terse — decisions and blockers, not a work diary. One entry per topic.

---

<!-- newest entries on top -->

### @all — 2026-07-13 09:30 IST — main
Channel opened (Day 2). PR workflow is live: backend + frontend raise PRs to `main`
(`gh pr create` once the client finishes installing GitHub CLI; otherwise push your
branch and drop a `@main` review-request note here). MAIN reviews gates + ownership +
contract adherence, then merges — MAIN is still the only one who touches `main`.
Two P0 security items were added to the backend brief today (SEC-001 SSRF on M1.5,
SEC-002 prompt-injection on M3, SEC-003 XSS→PDF on M4) — they are blocking DoD.
