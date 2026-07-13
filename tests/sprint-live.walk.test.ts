import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getActiveSprintDetail } from "@/server/sprint/engine";

/**
 * Day-6 P12 live-read (data layer) — drives the exact fn `GET /api/sprint?businessId=`
 * calls against the seeded active sprint (श्री डेंटल केअर) to confirm the merged engine
 * returns a real, contract-shaped SprintDetail before the client re-tests P12.
 * Gated on service env; skips in CI. Read-only.
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && secret);
const SEED_BUSINESS = "33333333-3333-4333-8333-333333333333"; // active sprint d1111111, 23 tasks

describe.skipIf(!hasEnv)("P12 live sprint detail (live DB)", () => {
  it("getActiveSprintDetail returns the seeded active sprint in the locked shape", async () => {
    const db = createClient(url as string, secret as string, {
      auth: { persistSession: false },
    });
    const detail = await getActiveSprintDetail({ db }, SEED_BUSINESS);
    expect(detail).not.toBeNull();
    expect(detail!.sprint.status).toBe("active");
    expect(detail!.baseline.locked).toBe(true);
    expect(detail!.groups.length).toBeGreaterThan(0);
    expect(detail!.tasks.length).toBe(23);
    expect(typeof detail!.current_projected_score).toBe("number");
    expect(detail!.prereqs).toHaveProperty("eligible");
  });
});

describe.skipIf(hasEnv)("P12 live sprint detail — skipped", () => {
  it("skips without service env", () => expect(true).toBe(true));
});
