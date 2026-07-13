import { features } from "@/lib/env";
import { FeatureDisabledError } from "@/server/errors";

/**
 * MS4-T02 — HTML → PDF via Playwright chromium, behind FEATURE_PDF
 * (ADR-004: off on Vercel, on for the VPS / local dev). Playwright is
 * imported lazily so the app boots fine where the browser isn't installed.
 */

export async function renderPdf(html: string): Promise<Buffer> {
  if (!features.pdf()) {
    throw new FeatureDisabledError(
      "PDF rendering is disabled (FEATURE_PDF is not 'on') — enable it where Playwright chromium is installed (VPS / local dev)."
    );
  }
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
