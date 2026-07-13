import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { dataForSeoCredentials } from "@/lib/env";
import { DataForSeoClient } from "@/server/dataforseo";
import { SpendGuard, SupabaseSpendStore } from "@/server/spend";
import { startAudit } from "@/server/audit/pipeline";
import { getAuditWithScores, getBusiness } from "@/server/audit/repo";
import { buildAuditReport } from "@/server/audit/report";

/**
 * ONE live end-to-end audit (~₹1–2 of real DataForSEO credit) — the Day-2
 * smoke. NEVER runs in CI/normal suites: requires BOTH the env keys AND an
 * explicit RUN_LIVE_SMOKE=1 opt-in. Run manually:
 *   RUN_LIVE_SMOKE=1 npx vitest run tests/live-smoke.test.ts
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const creds = dataForSeoCredentials();
const optIn = process.env.RUN_LIVE_SMOKE === "1";
const enabled = Boolean(url && secret && creds) && optIn;

describe.skipIf(!enabled)("LIVE smoke — मनोवेध हिप्नोक्लिनिक Karad (₹~2)", () => {
  it("audits end-to-end and logs every call to spend_ledger", async () => {
    const db = createClient(url as string, secret as string, {
      auth: { persistSession: false },
    });
    const guard = new SpendGuard(new SupabaseSpendStore(db));
    const dfs = new DataForSeoClient({ guard, credentials: creds });

    const before = await guard.getStatus();
    console.log(
      `[smoke] spend before: $${before.spent_usd.toFixed(4)} / cap $${before.cap_usd}`
    );

    const started = await startAudit(
      { dfs, db },
      {
        name: "मनोवेध हिप्नोक्लिनिक",
        city: "Karad",
        options: { competitors: 3, website_audit: false, post_audit: true },
      }
    );
    console.log(`[smoke] audit ${started.audit_id} started`);
    const progress = await started.done;
    console.log(`[smoke] pipeline: ${progress.status} ${progress.detail ?? ""}`);
    expect(["done", "partial"]).toContain(progress.status);

    const found = await getAuditWithScores(db, started.audit_id);
    expect(found?.scores).toBeTruthy();
    const business = await getBusiness(db, found!.audit.business_id);
    const report = buildAuditReport(business!, found!.audit, found!.scores!);
    console.log(
      `[smoke] score ${report.scores.total}/100 (${report.band}) · ` +
        report.rubric.map((r) => `${r.key}:${r.points}/${r.max}`).join(" · ")
    );
    console.log(
      `[smoke] sanity: ${report.sanity_flags.map((f) => f.key).join(", ")}`
    );

    // Live Google data drifts from the July-11 fixture export, but the band
    // and the structural findings should hold.
    expect(report.scores.total).toBeGreaterThanOrEqual(30);
    expect(report.scores.total).toBeLessThanOrEqual(65);
    expect(report.sanity_flags.map((f) => f.key)).toContain("generic_category");

    // EP-012: every call landed on the ledger (the "spend pill" source).
    const after = await guard.getStatus();
    const delta = after.spent_usd - before.spent_usd;
    console.log(
      `[smoke] spend after: $${after.spent_usd.toFixed(4)} (Δ $${delta.toFixed(4)} ≈ ₹${(delta * 85).toFixed(2)})`
    );
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(0.03); // ≤ the ₹2.4 preview ceiling
  }, 420_000);
});
