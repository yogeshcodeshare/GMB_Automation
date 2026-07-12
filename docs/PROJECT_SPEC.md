# Project Spec — index

Single source of truth is the blueprint; this index maps the forge-style spec sections
to where they actually live (no duplication):

| Spec section | Lives in |
|---|---|
| Overview, users, goals (NSM, GM-001..006) | [PRD.md](PRD.md) §1.1–1.2 |
| Features & parity matrices | [PRD.md](PRD.md) §1.3–1.3d |
| User stories & flows | [PRD.md](PRD.md) §1.4–1.5 · error states §1.6 |
| Tech stack + ADR-001..010 | [ERD.md](ERD.md) §2.1–2.2 |
| Database schema (TB-001..018) + seed | [ERD.md](ERD.md) §2.3, §2.9 · `supabase/migrations/` |
| API endpoints (EP-001..022) + types | [ERD.md](ERD.md) §2.4 · [agents/API_CONTRACT.md](agents/API_CONTRACT.md) · `src/types/` |
| Scoring rubric | [ERD.md](ERD.md) §2.5 |
| Page/field inventory (P1..P12) | [ERD.md](ERD.md) §2.7b · design handoff README |
| Milestones & exit criteria | [MILESTONES.md](MILESTONES.md) · sprint mapping in [PLAN_7DAY.md](PLAN_7DAY.md) |
| Auth, NFRs, security | [ERD.md](ERD.md) §2.7 · [SECURITY.md](SECURITY.md) |
| Design tokens & screens | [../design/handoff/design_handoff_gmb_sarathi/README.md](../design/handoff/design_handoff_gmb_sarathi/README.md) |
