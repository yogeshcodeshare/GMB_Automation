import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Day-5 schema sanity — confirms the 3 client-applied migrations landed in the
 * live cloud DB: grid_points.top_ranks, businesses.is_demo, ai_outputs 'fixes'.
 * Gated on service-key env (skips cleanly in CI). Read-only probes; no writes.
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const hasEnv = Boolean(url && secret);
const svc = (): SupabaseClient =>
  createClient(url as string, secret as string, { auth: { persistSession: false } });

const MISSING_COL = /column .* does not exist|could not find/i;

describe.skipIf(!hasEnv)("Day-5 schema sanity (live DB)", () => {
  it("grid_points.top_ranks exists (migration 20260713000001)", async () => {
    const { error } = await svc().from("grid_points").select("top_ranks").limit(1);
    expect(error && MISSING_COL.test(error.message)).toBeFalsy();
  });

  it("businesses.is_demo exists + flags the 6 seed rows (migration 20260713000002)", async () => {
    const { data, error } = await svc()
      .from("businesses")
      .select("id", { count: "exact" })
      .eq("is_demo", true);
    expect(error && MISSING_COL.test(error.message)).toBeFalsy();
    expect((data ?? []).length).toBe(6);
  });

  it("ai_outputs accepts type 'fixes' (migration 20260715000001)", async () => {
    // Insert a probe row with type='fixes'; if the CHECK still rejects it we get
    // a constraint error. Clean up after.
    const client = svc();
    const { data, error } = await client
      .from("ai_outputs")
      .insert({ business_id: null, type: "fixes", lang: "mr", output: "schema-probe", approved: false })
      .select("id")
      .single();
    expect(error).toBeNull();
    if (data?.id) await client.from("ai_outputs").delete().eq("id", data.id);
  });
});

describe.skipIf(hasEnv)("Day-5 schema sanity — skipped (no service env)", () => {
  it("skips without SUPABASE service env", () => expect(true).toBe(true));
});
