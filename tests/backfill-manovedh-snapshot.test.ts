import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { loadManovedhFixture } from "@/server/fixtures";
import { buildSnapshot } from "@/server/audit/pipeline";
import { finishProgress, initProgress } from "@/server/audit/progress";

/**
 * SEED BACKFILL (utility, not a unit test) — gated on RUN_BACKFILL=1 so it never runs in
 * CI/normal test. The seeded audits carry only a DISPLAY snapshot; `buildAuditReport`
 * (EP-002 read + EP-006 PDF) needs the normalized `input` + rubric/fixes/links. This writes
 * the deterministic manovedh FIXTURE snapshot (score 41, ₹0, no DataForSEO) into the seeded
 * audit so the manovedh report renders live end-to-end.
 *   Run once: RUN_BACKFILL=1 SUPABASE_URL=… SUPABASE_SECRET_KEY=… npx vitest run tests/backfill-manovedh-snapshot.test.ts
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const run = process.env.RUN_BACKFILL === "1" && Boolean(url && secret);

const AUDIT_ID = "a1111111-1111-4111-8111-111111111111"; // manovedh, audit_scores.total = 41

describe.skipIf(!run)("backfill manovedh fixture snapshot", () => {
  it("writes the full normalized snapshot into the seeded audit", async () => {
    const db = createClient(url as string, secret as string, {
      auth: { persistSession: false },
    });
    const { input } = loadManovedhFixture();
    initProgress(AUDIT_ID);
    const progress = finishProgress(AUDIT_ID, "done");
    const snapshot = buildSnapshot(input, {
      source: "fixture",
      auditedAt: "2026-07-11T10:00:00+05:30",
      progress,
    });
    // sanity: the fixture must still score 41 (keeps snapshot ↔ audit_scores consistent)
    expect((snapshot.scores as { total: number }).total).toBe(41);
    expect(snapshot.input).toBeTruthy();

    const { error } = await db
      .from("audits")
      .update({ raw_snapshot: snapshot })
      .eq("id", AUDIT_ID);
    expect(error).toBeNull();

    const { data } = await db
      .from("audits")
      .select("raw_snapshot")
      .eq("id", AUDIT_ID)
      .maybeSingle();
    expect((data?.raw_snapshot as { input?: unknown })?.input).toBeTruthy();
  });
});

describe.skipIf(run)("backfill manovedh fixture snapshot — skipped", () => {
  it("skips unless RUN_BACKFILL=1", () => expect(true).toBe(true));
});
