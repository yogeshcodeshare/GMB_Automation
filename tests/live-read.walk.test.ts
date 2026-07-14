import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { listBusinesses } from "@/server/audit/repo";
import { computeDashboardStats } from "@/server/dashboard/stats";
import { readSettings } from "@/server/settings/store";
import { makeSpendGuard } from "@/server/spend";

/**
 * Day-6 authed live-read walk (data layer) — drives the EXACT server modules
 * the ₹0 routes call (`/api/businesses`, `/api/dashboard/stats`, `/api/settings`,
 * `/api/spend/today`) against the live cloud DB and asserts real seed rows come
 * back. The middleware founder-gate + cookie session (proven separately) sit in
 * front of these; here we prove the read path returns data, not mocks.
 * Gated on service-key env — skips cleanly in CI. Read-only; no writes.
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && secret);
const svc = (): SupabaseClient =>
  createClient(url as string, secret as string, { auth: { persistSession: false } });

describe.skipIf(!hasEnv)("Day-6 live-read walk (live DB)", () => {
  it("/api/businesses → listBusinesses returns the seed rows", async () => {
    const rows = await listBusinesses(svc());
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows[0]).toHaveProperty("name");
  }, 30_000);

  it("/api/dashboard/stats → computeDashboardStats returns a populated object", async () => {
    const stats = await computeDashboardStats(svc());
    expect(stats && typeof stats).toBe("object");
    // whatever the KPI shape, at least one numeric metric must be present
    const nums = Object.values(stats as unknown as Record<string, unknown>).filter(
      (v) => typeof v === "number",
    );
    expect(nums.length).toBeGreaterThan(0);
  }, 30_000);

  it("/api/settings → readSettings returns the seeded row, CR-1 flag fail-safe OFF", async () => {
    const s = await readSettings(svc());
    expect(typeof s.daily_spend_cap_usd).toBe("number");
    expect(Array.isArray(s.model_chain)).toBe(true);
    // Column not applied yet (migration 20260716000001) → reader must fail-safe.
    expect(s.dataforseo_live_enabled).toBe(false);
  }, 30_000);

  it("/api/spend/today → spend guard getStatus resolves with a numeric cap", async () => {
    const status = await makeSpendGuard().getStatus();
    expect(typeof status.cap_usd).toBe("number");
    expect(typeof status.spent_usd).toBe("number");
  }, 30_000);
});

describe.skipIf(hasEnv)("Day-6 live-read walk — skipped (no service env)", () => {
  it("skips without SUPABASE service env", () => expect(true).toBe(true));
});
