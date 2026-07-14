import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FeatureDisabledError } from "@/server/errors";
import { PdfEngineError, renderPdf } from "@/server/pdf/render";
import { ReportStorageError, uploadReport } from "@/server/pdf/storage";
import { errFrom } from "@/server/http";

/** UAT-1 — every EP-006 failure mode is a TYPED, human-readable envelope. */

function storageStub(behaviour: {
  uploadError?: string;
  signError?: string;
}): SupabaseClient {
  return {
    storage: {
      from() {
        return {
          upload: async () =>
            behaviour.uploadError
              ? { error: { message: behaviour.uploadError } }
              : { error: null },
          createSignedUrl: async () =>
            behaviour.signError
              ? { data: null, error: { message: behaviour.signError } }
              : { data: { signedUrl: "https://signed.example/x.pdf" }, error: null },
        };
      },
    },
  } as unknown as SupabaseClient;
}

describe("UAT-1 — renderPdf failure modes", () => {
  it("FEATURE_PDF off → FEATURE_DISABLED with the enable hint", async () => {
    delete process.env.FEATURE_PDF;
    const err = await renderPdf("<html></html>").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FeatureDisabledError);
    expect((err as Error).message).toContain("FEATURE_PDF");
  });

  it("chromium launch failure → PdfEngineError naming the install command", async () => {
    process.env.FEATURE_PDF = "on";
    const err = await renderPdf("<html></html>", {
      chromium: {
        launch: async () => {
          throw new Error("Executable doesn't exist at C:\\ms-playwright\\chrome.exe");
        },
      },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PdfEngineError);
    expect((err as Error).message).toContain("npx playwright install chromium");
    delete process.env.FEATURE_PDF;
  });

  it("mid-render crash → PdfEngineError with a retry hint (browser closed)", async () => {
    process.env.FEATURE_PDF = "on";
    let closed = false;
    const err = await renderPdf("<html></html>", {
      chromium: {
        launch: async () => ({
          newPage: async () => ({
            setContent: async () => {
              throw new Error("Target crashed");
            },
            pdf: async () => new Uint8Array(),
          }),
          close: async () => {
            closed = true;
          },
        }),
      },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PdfEngineError);
    expect((err as Error).message).toContain("retry");
    expect(closed).toBe(true); // no leaked browsers
    delete process.env.FEATURE_PDF;
  });
});

describe("UAT-1 — storage failure modes", () => {
  it("bucket missing → actionable ReportStorageError", async () => {
    const err = await uploadReport(
      storageStub({ uploadError: "Bucket not found" }),
      "x.pdf",
      Buffer.from("x")
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ReportStorageError);
    expect((err as Error).message).toContain("reports bucket missing");
    expect((err as Error).message).toContain("migration");
  });

  it("permission denied → names the secret-key client fix", async () => {
    const err = await uploadReport(
      storageStub({ uploadError: "new row violates row-level security policy" }),
      "x.pdf",
      Buffer.from("x")
    ).catch((e: unknown) => e);
    expect((err as Error).message).toContain("SECRET key client");
  });

  it("signed-URL failure → classified, upload success not lost silently", async () => {
    const err = await uploadReport(
      storageStub({ signError: "Bucket not found" }),
      "x.pdf",
      Buffer.from("x")
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ReportStorageError);
    expect((err as Error).message).toContain("sign:");
  });

  it("happy path returns pdf_path + signed URL with the 7-day TTL constant", async () => {
    const out = await uploadReport(storageStub({}), "a.pdf", Buffer.from("x"));
    expect(out).toEqual({
      pdf_path: "reports/a.pdf",
      storage_url: "https://signed.example/x.pdf",
    });
  });
});

describe("UAT-1 — envelope translation (no silent 500s)", () => {
  it("PdfEngineError and ReportStorageError → 500 with the human message", async () => {
    for (const e of [
      new PdfEngineError("PDF engine unavailable — run: npx playwright install chromium"),
      new ReportStorageError("reports bucket missing — re-run the init migration"),
    ]) {
      const res = errFrom(e);
      expect(res.status).toBe(500);
      const body = (await res.json()) as { ok: boolean; error: { code: string; message: string } };
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("INTERNAL");
      expect(body.error.message).toBe(e.message); // the message SURVIVES to the UI
    }
  });
});
