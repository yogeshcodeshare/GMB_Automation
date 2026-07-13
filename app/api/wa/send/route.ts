import { sendReport } from "@/server/wa/service";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** EP-007 — POST /api/wa/send { phone, pdf_path, summary }.
 * Flag off (keys pending) → FEATURE_DISABLED 503 envelope. */
export async function POST(req: Request) {
  const raw = await readJson(req);
  if (typeof raw !== "object" || raw === null) {
    return err("VALIDATION_ERROR", "JSON body required");
  }
  const b = raw as Record<string, unknown>;
  if (typeof b.phone !== "string" || !/^\+?[0-9][0-9 -]{7,14}$/.test(b.phone)) {
    return err("VALIDATION_ERROR", "phone must be a valid number (+91…)");
  }
  if (typeof b.pdf_path !== "string" || b.pdf_path.trim() === "") {
    return err("VALIDATION_ERROR", "pdf_path is required");
  }
  if (typeof b.summary !== "string" || b.summary.length > 1000) {
    return err("VALIDATION_ERROR", "summary is required (max 1000 chars)");
  }

  try {
    const result = await sendReport({
      phone: b.phone,
      pdf_path: b.pdf_path,
      summary: b.summary,
    });
    return ok(result);
  } catch (e) {
    return errFrom(e);
  }
}
