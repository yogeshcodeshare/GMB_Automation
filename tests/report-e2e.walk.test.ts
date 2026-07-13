import { describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/server";
import { buildAuditReport } from "@/server/audit/report";
import { getAuditWithScores, getBusiness } from "@/server/audit/repo";
import { PDF_LANGUAGES, renderPdf, renderReportHtml, uploadReport } from "@/server/pdf";

/**
 * EP-006 end-to-end (Day-6 close, FEATURE_PDF flip verification) — drives the EXACT
 * chain the /api/report/:auditId route runs (buildAuditReport → renderReportHtml →
 * renderPdf(Playwright) → uploadReport) against the seeded manovedh fixture audit
 * (score 41), for all 3 languages, and asserts a real PDF + a signed storage URL.
 * Gated on service env + FEATURE_PDF=on; skips cleanly otherwise. Uploads 3 objects
 * to the reports bucket (idempotent filenames).
 */
// Opt-in (RUN_PDF_E2E=1): does real chromium renders + storage uploads, so it stays out
// of the default suite + CI. Run deliberately to verify the EP-006 flip.
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const pdfOn = process.env.FEATURE_PDF === "on";
const canRun = Boolean(url && secret && pdfOn && process.env.RUN_PDF_E2E === "1");

const SEEDED_AUDIT_ID = "a1111111-1111-4111-8111-111111111111"; // manovedh, total 41

describe.skipIf(!canRun)("EP-006 report PDF e2e (live, FEATURE_PDF on)", () => {
  it.each(PDF_LANGUAGES)(
    "renders a real PDF + signed URL for lang=%s",
    async (lang) => {
      const db = createServiceClient();
      const found = await getAuditWithScores(db, SEEDED_AUDIT_ID);
      expect(found?.scores).toBeTruthy();
      const business = await getBusiness(db, found!.audit.business_id);
      expect(business).toBeTruthy();

      const report = buildAuditReport(business!, found!.audit, found!.scores!);
      const html = renderReportHtml(report, lang);
      expect(html).toContain("<"); // rendered HTML

      const pdf = await renderPdf(html);
      // Real PDF: %PDF magic + non-trivial size (Devanagari font is bundled).
      const head = Buffer.from(pdf.slice(0, 5)).toString("latin1");
      expect(head).toBe("%PDF-");
      expect(pdf.byteLength).toBeGreaterThan(20_000);

      const out = await uploadReport(db, `${SEEDED_AUDIT_ID}-${lang}.pdf`, pdf);
      expect(out.pdf_path).toContain(lang);
      expect(out.storage_url).toMatch(/^https?:\/\//); // signed URL
    },
    60_000,
  );
});

describe.skipIf(canRun)("EP-006 report PDF e2e — skipped", () => {
  it("skips without service env + FEATURE_PDF=on", () => expect(true).toBe(true));
});
