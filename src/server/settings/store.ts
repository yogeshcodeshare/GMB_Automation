import type { SupabaseClient } from "@supabase/supabase-js";
import type { Settings } from "@/types";

/**
 * TB-011 settings read/patch for GET/PATCH /api/settings (contract: response
 * `Settings`, request `Partial<Settings>`; P11 Settings & Spend + the CR-1
 * Data-sources toggle). The single row is id=1 (seeded).
 *
 * NOTE: the CR-1 live-data gate keeps its OWN narrow, fail-closed reader
 * (`readLiveDataFlag`) — it must never depend on the full row parsing.
 */

const DEFAULTS: Settings = {
  daily_spend_cap_usd: 1.0,
  public_daily_limit: 50,
  per_ip_limit: 3,
  model_chain: [],
  dataforseo_live_enabled: false,
};

export async function readSettings(db: SupabaseClient): Promise<Settings> {
  const { data, error } = await db
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`settings read failed: ${error.message}`);
  if (!data) return { ...DEFAULTS };
  return {
    daily_spend_cap_usd: Number(data.daily_spend_cap_usd ?? DEFAULTS.daily_spend_cap_usd),
    public_daily_limit: Number(data.public_daily_limit ?? DEFAULTS.public_daily_limit),
    per_ip_limit: Number(data.per_ip_limit ?? DEFAULTS.per_ip_limit),
    model_chain: Array.isArray(data.model_chain)
      ? (data.model_chain as string[])
      : DEFAULTS.model_chain,
    dataforseo_live_enabled: data.dataforseo_live_enabled === true,
  };
}

/** numeric(6,2) in the schema — 0..9999.99. */
const CAP_MAX = 9999.99;

/** Validate a PATCH body → a typed Partial<Settings> (only present keys), or
 * a human error string. Editing the cap/limits/model chain is founder P11
 * territory; the spend guard still ENFORCES whatever cap value is stored. */
export function validateSettingsPatch(
  body: Record<string, unknown>
): Partial<Settings> | string {
  const patch: Partial<Settings> = {};

  if ("dataforseo_live_enabled" in body) {
    if (typeof body.dataforseo_live_enabled !== "boolean") {
      return "dataforseo_live_enabled must be boolean";
    }
    patch.dataforseo_live_enabled = body.dataforseo_live_enabled;
  }
  if ("daily_spend_cap_usd" in body) {
    const n = body.daily_spend_cap_usd;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > CAP_MAX) {
      return `daily_spend_cap_usd must be a number 0..${CAP_MAX}`;
    }
    patch.daily_spend_cap_usd = Math.round(n * 100) / 100;
  }
  if ("public_daily_limit" in body) {
    const n = body.public_daily_limit;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 100_000) {
      return "public_daily_limit must be an integer 0..100000";
    }
    patch.public_daily_limit = n;
  }
  if ("per_ip_limit" in body) {
    const n = body.per_ip_limit;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 1000) {
      return "per_ip_limit must be an integer 0..1000";
    }
    patch.per_ip_limit = n;
  }
  if ("model_chain" in body) {
    const m = body.model_chain;
    if (
      !Array.isArray(m) ||
      m.length > 20 ||
      m.some((x) => typeof x !== "string" || x.trim() === "" || x.length > 120)
    ) {
      return "model_chain must be an array of up to 20 non-empty model strings";
    }
    patch.model_chain = m as string[];
  }

  if (Object.keys(patch).length === 0) {
    return "Nothing to update — provide one of: dataforseo_live_enabled, daily_spend_cap_usd, public_daily_limit, per_ip_limit, model_chain";
  }
  return patch;
}

/** Apply only the present keys of a validated Partial<Settings>. The caller
 * (route) validates types/bounds; this writer trusts its input and returns
 * the fresh full row. */
export async function patchSettings(
  db: SupabaseClient,
  patch: Partial<Settings>
): Promise<Settings> {
  const update: Record<string, unknown> = {};
  if (patch.daily_spend_cap_usd !== undefined)
    update.daily_spend_cap_usd = patch.daily_spend_cap_usd;
  if (patch.public_daily_limit !== undefined)
    update.public_daily_limit = patch.public_daily_limit;
  if (patch.per_ip_limit !== undefined) update.per_ip_limit = patch.per_ip_limit;
  if (patch.model_chain !== undefined) update.model_chain = patch.model_chain;
  if (patch.dataforseo_live_enabled !== undefined)
    update.dataforseo_live_enabled = patch.dataforseo_live_enabled;

  const { error } = await db.from("settings").update(update).eq("id", 1);
  if (error) {
    throw new Error(
      `settings update failed: ${error.message} — if dataforseo_live_enabled is missing, apply migration 20260716000001`
    );
  }
  return readSettings(db);
}
