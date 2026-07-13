import { createServiceClient } from "@/lib/supabase/server";
import { buildSprintComparison, renderSprintReportHtml } from "@/server/sprint";
import { renderPdf, uploadReport } from "@/server/pdf";
import { sendReport } from "@/server/wa/service";
import { FeatureDisabledError } from "@/server/errors";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** EP-022 — POST /api/sprint/:id/report { send_whatsapp? } →
 * { pdf_path, sent }. PDF behind FEATURE_PDF; WA behind its keys (sent=false
 * with the flag off — the PDF still lands in storage). */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "sprint id must be a UUID");
  }
  const raw = (await readJson(req)) as { send_whatsapp?: unknown } | undefined;
  const sendWhatsapp = raw?.send_whatsapp === true;

  try {
    const db = createServiceClient();
    const comparison = await buildSprintComparison(db, params.id);
    if (!comparison) {
      return err("NOT_FOUND", "No sprint (with a locked baseline) under this id");
    }

    const pdf = await renderPdf(renderSprintReportHtml(comparison));
    const fileName = `sprint-${params.id}.pdf`;
    const uploaded = await uploadReport(db, fileName, pdf);

    let sent = false;
    if (sendWhatsapp && comparison.business.owner_whatsapp) {
      try {
        await sendReport({
          phone: comparison.business.owner_whatsapp,
          pdf_path: uploaded.pdf_path,
          summary: `${comparison.business.name} — Optimization Sprint report`,
        });
        sent = true;
      } catch (e) {
        if (!(e instanceof FeatureDisabledError)) throw e;
        // WA keys pending (week 2): the PDF exists, sending just didn't.
      }
    }

    return ok({ pdf_path: uploaded.pdf_path, sent });
  } catch (e) {
    return errFrom(e);
  }
}
