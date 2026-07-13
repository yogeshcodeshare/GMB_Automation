import { createServiceClient } from "@/lib/supabase/server";
import { buildAuditReport } from "@/server/audit/report";
import { getAuditWithScores, getBusiness } from "@/server/audit/repo";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** EP-002 — GET /api/audit/:id → AuditReport (P3). */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "audit id must be a UUID");
  }
  try {
    const db = createServiceClient();
    const found = await getAuditWithScores(db, params.id);
    if (!found) return err("NOT_FOUND", "No audit with this id");
    if (!found.scores) {
      return err(
        "NOT_FOUND",
        "Audit is still running — poll /api/audit/:id/progress",
        { audit_id: params.id }
      );
    }
    const business = await getBusiness(db, found.audit.business_id);
    if (!business) return err("NOT_FOUND", "Audited business no longer exists");
    return ok(buildAuditReport(business, found.audit, found.scores));
  } catch (e) {
    return errFrom(e);
  }
}
