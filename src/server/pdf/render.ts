import { features } from "@/lib/env";
import { FeatureDisabledError } from "@/server/errors";

/**
 * MS4-T02 — HTML → PDF via Playwright chromium, behind FEATURE_PDF
 * (ADR-004: off on Vercel, on for the VPS / local dev). Playwright is
 * imported lazily so the app boots fine where the browser isn't installed.
 * UAT-1: every failure mode surfaces a TYPED, human-readable error — the
 * founder must never see a silent 500.
 */

/** The PDF engine itself is unavailable/misconfigured (chromium missing,
 * launch crash). 500 INTERNAL, but with an actionable message. */
export class PdfEngineError extends Error {
  readonly code = "INTERNAL" as const;
  constructor(message: string) {
    super(message);
    this.name = "PdfEngineError";
  }
}

type ChromiumLike = {
  launch: (opts: { headless: boolean }) => Promise<{
    newPage: () => Promise<{
      setContent: (html: string, opts: { waitUntil: string }) => Promise<void>;
      pdf: (opts: Record<string, unknown>) => Promise<Uint8Array>;
    }>;
    close: () => Promise<void>;
  }>;
};

async function loadChromium(): Promise<ChromiumLike> {
  try {
    const { chromium } = await import("playwright");
    return chromium as unknown as ChromiumLike;
  } catch {
    throw new PdfEngineError(
      "PDF engine unavailable — the playwright package is not installed on this server (npm install playwright)."
    );
  }
}

export async function renderPdf(
  html: string,
  opts: { chromium?: ChromiumLike } = {}
): Promise<Buffer> {
  if (!features.pdf()) {
    throw new FeatureDisabledError(
      "PDF rendering is disabled (FEATURE_PDF is not 'on') — enable it where Playwright chromium is installed (VPS / local dev)."
    );
  }
  const chromium = opts.chromium ?? (await loadChromium());

  let browser: Awaited<ReturnType<ChromiumLike["launch"]>>;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    // The classic: playwright installed but the browser binary isn't.
    throw new PdfEngineError(
      `PDF engine unavailable — chromium failed to launch (${
        e instanceof Error ? e.message.split("\n")[0] : "unknown"
      }). Run: npx playwright install chromium`
    );
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } catch (e) {
    throw new PdfEngineError(
      `PDF render failed mid-page (${e instanceof Error ? e.message.split("\n")[0] : "unknown"}) — retry once; if it persists check server memory.`
    );
  } finally {
    await browser.close().catch(() => undefined);
  }
}
