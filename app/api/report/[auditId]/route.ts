import { createServiceClient } from "@/lib/supabase/server";
import { buildAuditReport } from "@/server/audit/report";
import { getAuditWithScores, getBusiness } from "@/server/audit/repo";
import { renderPdf, renderReportHtml, uploadReport } from "@/server/pdf";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** EP-006 — POST /api/report/:auditId { lang } → { pdf_path, storage_url }.
 * Behind FEATURE_PDF (Playwright chromium needs the VPS/local, ADR-004). */
export async function POST(
  req: Request,
  { params }: { params: { auditId: string } }
) {
  if (!UUID_RE.test(params.auditId)) {
    return err("VALIDATION_ERROR", "auditId must be a UUID");
  }
  const raw = await readJson(req);
  const lang = (raw as { lang?: unknown } | undefined)?.lang;
  if (lang !== "mr" && lang !== "en") {
    return err("VALIDATION_ERROR", 'lang must be "mr" or "en"');
  }

  try {
    const db = createServiceClient();
    const found = await getAuditWithScores(db, params.auditId);
    if (!found || !found.scores) {
      return err("NOT_FOUND", "No finished audit with this id");
    }
    const business = await getBusiness(db, found.audit.business_id);
    if (!business) return err("NOT_FOUND", "Audited business no longer exists");

    const report = buildAuditReport(business, found.audit, found.scores);
    const html = renderReportHtml(report, lang);
    const pdf = await renderPdf(html); // throws FEATURE_DISABLED when off
    const fileName = `${params.auditId}-${lang}.pdf`;
    return ok(await uploadReport(db, fileName, pdf));
  } catch (e) {
    return errFrom(e);
  }
}
