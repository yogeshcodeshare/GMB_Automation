import { describe, expect, it } from "vitest";
import { renderReportHtml } from "@/server/pdf/template";
import { renderPdf } from "@/server/pdf/render";
import { manovedhReport } from "./helpers/report";

/**
 * ═══════ M4 / MVP GATE SELF-CHECK ═══════
 * Name in → Marathi PDF out: fixture audit → HTML → Playwright chromium →
 * PDF bytes → extracted text contains मनोवेध + "41" + a Devanagari fix line.
 * Skips cleanly when chromium isn't installed (CI) — everything else about
 * the template is covered un-gated in pdf-template.test.ts.
 */

async function chromiumAvailable(): Promise<boolean> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

describe("MVP gate — fixture audit → Marathi PDF", () => {
  it("PDF text carries मनोवेध, the 41 score and Devanagari fixes", async (ctx) => {
    if (!(await chromiumAvailable())) {
      console.warn("[pdf-gate] chromium not installed — skipping (npx playwright install chromium)");
      return ctx.skip();
    }
    process.env.FEATURE_PDF = "on";

    const report = manovedhReport();
    const html = renderReportHtml(report, "mr", {
      generatedAt: "2026-07-14T00:00:00Z",
    });
    const pdf = await renderPdf(html);
    expect(pdf.byteLength).toBeGreaterThan(20_000); // real document, font embedded
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");

    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(pdf) });
    const { text } = await parser.getText();

    expect(text).toContain("41"); // the score
    expect(text).toContain("मनोवेध"); // Devanagari business name survived extraction
    expect(text).toContain("कॅटेगरी"); // a Marathi fix line
    expect(text).not.toContain("<script"); // belt over the SEC-003 braces
  }, 120_000);

  it("CR-2: the Manovedh fixture fits EXACTLY one A4 page", async (ctx) => {
    if (!(await chromiumAvailable())) return ctx.skip();
    process.env.FEATURE_PDF = "on";
    const pdf = await renderPdf(renderReportHtml(manovedhReport(), "mr"));
    const { PDFParse } = await import("pdf-parse");
    const { total } = await new PDFParse({ data: new Uint8Array(pdf) }).getText();
    expect(total).toBe(1);
  }, 120_000);

  it("CR-2: synthetic long detail flows to page 2 at most", async (ctx) => {
    if (!(await chromiumAvailable())) return ctx.skip();
    process.env.FEATURE_PDF = "on";
    const long = manovedhReport((input) => {
      // long-detail scenario: a pile of verbose findings
      for (let i = 0; i < 30; i++) {
        input.profile.services.push(
          `Extra documented service line number ${i} with a fairly long description attached to it`
        );
      }
    });
    long.sanity_flags = Array.from({ length: 28 }, (_, i) => ({
      key: "nap_mismatch" as const,
      severity: "warn" as const,
      message: `Synthetic long finding ${i}: `.padEnd(90, "x"),
    }));
    const pdf = await renderPdf(renderReportHtml(long, "en"));
    const { PDFParse } = await import("pdf-parse");
    const { total } = await new PDFParse({ data: new Uint8Array(pdf) }).getText();
    expect(total).toBeGreaterThanOrEqual(2); // overflow exists…
    expect(total).toBeLessThanOrEqual(2); // …and stops at page 2
  }, 120_000);
});
