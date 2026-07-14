import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { backfillDemoSnapshots } from "@/server/audit/backfill";

/**
 * SEED-WIDE BACKFILL RUNNER (utility, MAIN's a1111111 pattern) — gated on
 * RUN_BACKFILL=1 so it never runs in CI. Backfills EVERY display-only demo
 * audit with a deterministic generator snapshot (₹0, no DataForSEO), keeping
 * audit_scores consistent and filling the review/post caches.
 *   Run: RUN_BACKFILL=1 npx vitest run tests/backfill-demo-snapshots.test.ts
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const run = process.env.RUN_BACKFILL === "1" && Boolean(url && secret);

describe.skipIf(!run)("seed-wide demo snapshot backfill (LIVE DB)", () => {
  it("backfills all display-only audits; already-complete ones skipped", async () => {
    const db = createClient(url as string, secret as string, {
      auth: { persistSession: false },
    });
    const result = await backfillDemoSnapshots(db, {});
    console.log(
      `[backfill] updated: ${result.updated.length} (${result.updated.join(", ") || "none"}) · skipped: ${result.skipped.length}`
    );
    // manovedh (a1111111…, real fixture snapshot) must be among the skipped
    expect(result.skipped).toContain("a1111111-1111-4111-8111-111111111111");
    // second run is a no-op — idempotent
    const again = await backfillDemoSnapshots(db, {});
    expect(again.updated).toEqual([]);
  }, 120_000);
});

describe.skipIf(run)("seed-wide demo snapshot backfill — skipped", () => {
  it("skips unless RUN_BACKFILL=1", () => expect(true).toBe(true));
});
