import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * RLS integration tests (ADR-005): the anon/publishable key must see and
 * write NOTHING — all data access is server-side with the secret key.
 *
 * Needs SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY (from .env.local) AND the
 * migrations applied to the project. Skips cleanly when env is absent
 * (e.g. CI); fails loudly if tables exist but RLS lets anon through.
 */
const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const hasEnv = Boolean(url && publishableKey);

function anonClient() {
  return createClient(url as string, publishableKey as string, {
    auth: { persistSession: false },
  });
}

function isMissingTable(message: string): boolean {
  return /relation .* does not exist|Could not find the table/i.test(message);
}

describe.skipIf(!hasEnv)("RLS — anon (publishable key) is locked out", () => {
  it("cannot read businesses (seeded with 6 rows)", async (ctx) => {
    const { data, error } = await anonClient().from("businesses").select("id");
    if (error && isMissingTable(error.message)) {
      ctx.skip(); // migrations not applied yet — run npm run test:rls after applying
      return;
    }
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS: no policy for anon → zero rows visible
  });

  it("cannot read spend_ledger", async (ctx) => {
    const { data, error } = await anonClient().from("spend_ledger").select("id");
    if (error && isMissingTable(error.message)) {
      ctx.skip();
      return;
    }
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot insert into spend_ledger", async (ctx) => {
    const { error } = await anonClient()
      .from("spend_ledger")
      .insert({ endpoint: "rls-test", cost_usd: 0 });
    if (error && isMissingTable(error.message)) {
      ctx.skip();
      return;
    }
    expect(error).not.toBeNull(); // insert must be rejected
  });

  it("cannot insert public leads directly (EP-009 goes through the server)", async (ctx) => {
    const { error } = await anonClient().from("leads_public").insert({
      phone: "+910000000000",
      business_name: "rls-test",
      consent_ts: new Date().toISOString(),
    });
    if (error && isMissingTable(error.message)) {
      ctx.skip();
      return;
    }
    expect(error).not.toBeNull();
  });

  it("cannot read gbp_connections (encrypted tokens)", async (ctx) => {
    const { data, error } = await anonClient()
      .from("gbp_connections")
      .select("business_id");
    if (error && isMissingTable(error.message)) {
      ctx.skip();
      return;
    }
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe.skipIf(hasEnv)("RLS — skipped (no Supabase env in this run)", () => {
  it("is skipped without SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY", () => {
    expect(true).toBe(true);
  });
});
