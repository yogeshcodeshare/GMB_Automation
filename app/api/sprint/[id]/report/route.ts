import type { SprintReportResponse, WaSendStatus } from "@/types";
import { createServiceClient } from "@/lib/supabase/server";
import { buildSprintComparison, renderSprintReportHtml } from "@/server/sprint";
import { PDF_LANGUAGES, renderPdf, uploadReport, type PdfLanguage } from "@/server/pdf";
import { sendReport } from "@/server/wa/service";
import { FeatureDisabledError } from "@/server/errors";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** EP-022 — POST /api/sprint/:id/report (SprintReportRequest) →
 * SprintReportResponse. PDF behind FEATURE_PDF; the WA leg NEVER hard-fails
 * the request (wa_status explains sent=false; the PDF is already saved). */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "sprint id must be a UUID");
  }
  const raw = (await readJson(req)) as
    | { language?: unknown; send_whatsapp?: unknown }
    | undefined;
  const language = (raw?.language ?? "mr") as PdfLanguage;
  if (!PDF_LANGUAGES.includes(language)) {
    return err("VALIDATION_ERROR", `language must be one of: ${PDF_LANGUAGES.join(", ")}`);
  }
  const sendWhatsapp = raw?.send_whatsapp === true;

  try {
    const db = createServiceClient();
    const data = await buildSprintComparison(db, params.id);
    if (!data) {
      return err("NOT_FOUND", "No sprint (with a locked baseline) under this id");
    }

    const pdf = await renderPdf(renderSprintReportHtml(data, language));
    const fileName = `sprint-${params.id}-${language}.pdf`;
    const uploaded = await uploadReport(db, fileName, pdf);

    let sent = false;
    let wa_status: WaSendStatus = "not_requested";
    if (sendWhatsapp) {
      if (!data.business.owner_whatsapp) {
        wa_status = "failed"; // nothing to send to — PDF still saved
      } else {
        try {
          await sendReport({
            phone: data.business.owner_whatsapp,
            pdf_path: uploaded.pdf_path,
            summary: `${data.business.name} — Optimization Sprint report`,
          });
          sent = true;
          wa_status = "sent";
        } catch (e) {
          wa_status = e instanceof FeatureDisabledError ? "skipped_flag_off" : "failed";
        }
      }
    }

    const response: SprintReportResponse = {
      pdf_path: uploaded.pdf_path,
      storage_url: uploaded.storage_url,
      sent,
      wa_status,
      report: data.report,
    };
    return ok(response);
  } catch (e) {
    return errFrom(e);
  }
}
