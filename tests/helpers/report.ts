import type { Audit, AuditReport, AuditScores, Business } from "@/types";
import { buildSnapshot } from "@/server/audit/pipeline";
import { buildAuditReport } from "@/server/audit/report";
import { finishProgress, initProgress } from "@/server/audit/progress";
import { scoreAudit } from "@/server/score";
import { loadManovedhFixture } from "@/server/fixtures";
import type { AuditInput } from "@/server/audit/input";

/** The Manovedh fixture as a full EP-002 AuditReport (for PDF tests). */
export function manovedhReport(
  mutate?: (input: AuditInput, business: Business) => void
): AuditReport {
  const { input } = loadManovedhFixture();
  const business: Business = {
    id: "11111111-1111-4111-8111-111111111111",
    name: input.profile.name,
    city: input.profile.city,
    place_id: input.profile.place_id,
    cid: input.profile.cid,
    lat: input.profile.lat,
    lng: input.profile.lng,
    website: input.profile.website,
    is_client: false,
    gbp_location_id: null,
    plan: null,
    connection_status: "none",
    owner_name: null,
    owner_whatsapp: null,
    created_at: "2026-07-08T09:12:00+05:30",
  };
  mutate?.(input, business);

  const snapshot = buildSnapshot(input, {
    source: "fixture",
    auditedAt: "2026-07-11T00:00:00Z",
    progress: finishProgress(initProgress("pdf-test").audit_id, "done"),
  });
  const audit: Audit = {
    id: "a1111111-1111-4111-8111-111111111111",
    business_id: business.id,
    raw_snapshot: snapshot,
    competitor_ids: [],
    created_at: "2026-07-11T00:00:00+05:30",
  };
  const scores: AuditScores = {
    audit_id: audit.id,
    ...scoreAudit(input).scores,
  };
  return buildAuditReport(business, audit, scores);
}
