import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/report/[auditId]/route";

/**
 * UAT-1 repro — invokes the EP-006 handler directly with FEATURE_PDF UNSET (the client's
 * running dev session never picked up the late `.env.local` edit — Next reads env at
 * startup). Confirms the exact envelope the frontend receives so genPdf can toast it as an
 * error instead of a fake "PDF ready". Gated on service env (the handler reads the DB).
 */
const hasEnv = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const AUDIT_ID = "a1111111-1111-4111-8111-111111111111";

describe.skipIf(!hasEnv)("UAT-1: EP-006 with FEATURE_PDF off", () => {
  it("returns a FEATURE_DISABLED error envelope (not a success)", async () => {
    const prev = process.env.FEATURE_PDF;
    delete process.env.FEATURE_PDF; // simulate the stale dev-process env
    try {
      const req = new Request(`http://localhost/api/report/${AUDIT_ID}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: "mr" }),
      });
      const res = await POST(req, { params: { auditId: AUDIT_ID } });
      const body = (await res.json()) as { ok: boolean; error?: { code: string; message: string } };
      console.log("UAT-1 repro →", res.status, JSON.stringify(body));
      expect(body.ok).toBe(false);
      expect(body.error?.code).toBe("FEATURE_DISABLED");
    } finally {
      if (prev === undefined) delete process.env.FEATURE_PDF;
      else process.env.FEATURE_PDF = prev;
    }
  });
});

describe.skipIf(hasEnv)("UAT-1 repro — skipped", () => {
  it("skips without service env", () => expect(true).toBe(true));
});
