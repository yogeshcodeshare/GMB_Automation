# GMB Sarathi — Claude Code Project Instructions

You are building **GMB Sarathi**, an internal GBP audit + optimization + service-delivery dashboard for a solo agency in Karad, Maharashtra. The single source of truth is `GMB_Tool_Development_Plan.md` (v1.8, Blueprint Forge format: PRD → ERD → Milestones with US/EP/TB/ADR/MS IDs). Read it fully before writing any code. The visual reference is the Claude Design prototype (screens exported by the founder) and `GMB_Sarathi_UI_Mockup.html`.

## Hard constraints (never violate)

1. **DataForSEO is the ONLY paid external service.** No Google Maps/Places billing. No paid LLMs. No paid SaaS. GBP APIs (free), PageSpeed Insights (free key), OpenRouter free models only, Leaflet + OpenStreetMap tiles.
2. **Spend guard first-class:** every DataForSEO call logs to `spend_ledger` (TB-010); middleware blocks calls once the daily cap is reached (EP-012). Build this in M0 before any data feature.
3. **No client passwords, ever.** GBP access = OAuth (encrypted refresh tokens, TB-009) or Manager-access manual mode ("copy value → open Google editor") per ADR-010.
4. **Approve-before-publish:** nothing AI-generated goes live without a founder tap.
5. Devanagari everywhere text renders (UI, PDFs — embed Noto Sans Devanagari in reports).
6. Deploy target: existing Hostinger KVM2 VPS via Docker Compose (nginx + Next.js app; Supabase cloud free tier; n8n already runs on this VPS).

## Stack (ADR-001..010)

Next.js 14 + TypeScript · Supabase (Postgres/Auth/Storage, RLS, single founder user) · DataForSEO client (my_business_info, reviews, my_business_updates, serp/google/maps, local_finder, keywords_data) · gbp.service (OAuth; Business Information, posts, review replies, media, Performance API) · ai.service (OpenRouter free-model fallback chain) · score.service (deterministic rubric §2.5) · pdf.service (Playwright render → PDF) · wa.service (existing Meta WhatsApp Cloud API creds) · Leaflet + OSM.

## Build order — follow the milestones exactly (Part 3 of the blueprint)

M0 foundations → M1 audit engine → M1.5 website audit → M2 grid/teleport → M3 AI layer → M4 PDF + WhatsApp (**MVP gate**) → M5 dashboard UI → M6 GBP publishing + Optimization Sprint (P12, EP-021/022) → M7 public checker + hardening → M9 service-delivery ops. Do not start a milestone before the previous one's exit criteria pass.

## Acceptance fixture (M1 exit test)

`fixtures/` contains the real GMB Everywhere audit of मनोवेध हिप्नोक्लिनिक, Karad (BasicAudit.md, ReviewAudit.md, WebsiteAudit.md). The audit engine MUST reproduce these findings: score 40–55 amber; phone missing; category "Hospital" flagged generic; services empty; hours anomaly (12–9 AM); reply rate 6.67%; 7 posts / one per 293 days; NAP phone mismatch; rented-subdomain website. Write an automated test against this fixture.

## Key product rules

- Costs preview before every paid action (audit ≈ ₹2, 5×5 grid ≈ ₹1.4 standard).
- Optimization Sprint (P12): gated to clients with a plan; requires connection + fresh audit (≤7 days); locks baseline (TB-017); AI-prefilled tasks grouped by audit source (Profile/Reviews/Posts/Website/Visibility/Citations); before/after report (EP-022) → WhatsApp.
- Public checker: rate-limited (3/IP/day, global 50/day, Turnstile), info-only pull, lead capture with consent (TB-008).
- Review timeline: dates >1yr are approximated — label it.
- Bilingual keyword tokenizer for reviews (Marathi + Hinglish + English).

## Skills to use

Install and use the `frontend-design` skill and shadcn/ui blocks for UI work; use the Figma Dev Mode MCP if the design file is connected. Prefer boring, tested code over cleverness; write the spend-guard and RLS tests first.
