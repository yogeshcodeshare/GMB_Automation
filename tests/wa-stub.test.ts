import { describe, expect, it } from "vitest";
import { features } from "@/lib/env";
import { FeatureDisabledError } from "@/server/errors";
import { sendReport } from "@/server/wa/service";

describe("EP-007 wa.service stub (keys absent — flag off)", () => {
  it("flag reads false without WHATSAPP_* keys", () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    expect(features.whatsapp()).toBe(false);
  });

  it("sendReport → FEATURE_DISABLED with a human message", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const err = await sendReport({
      phone: "+919000000000",
      pdf_path: "reports/x.pdf",
      summary: "ऑडिट रिपोर्ट",
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FeatureDisabledError);
    expect((err as Error).message).toContain("week 2");
    expect((err as FeatureDisabledError).code).toBe("FEATURE_DISABLED");
  });

  it("flag flips on only when BOTH keys exist", () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "t";
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    expect(features.whatsapp()).toBe(false);
    process.env.WHATSAPP_PHONE_NUMBER_ID = "id";
    expect(features.whatsapp()).toBe(true);
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });
});
