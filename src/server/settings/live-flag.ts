import type { SupabaseClient } from "@supabase/supabase-js";
import { LiveDataDisabledError } from "@/server/errors";

/**
 * CR-1 — the live-data master switch (settings.dataforseo_live_enabled,
 * TB-011). DEFAULT OFF: a missing row, a missing COLUMN (migration not yet
 * applied) or a read error all read as FALSE — no code path may reach the
 * paid vendor unless the founder explicitly enabled it.
 */

export async function readLiveDataFlag(db: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await db
      .from("settings")
      .select("dataforseo_live_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) return false; // unknown column / read failure → OFF
    return data?.dataforseo_live_enabled === true;
  } catch {
    return false;
  }
}

export async function setLiveDataFlag(
  db: SupabaseClient,
  enabled: boolean
): Promise<void> {
  const { error } = await db
    .from("settings")
    .update({ dataforseo_live_enabled: enabled })
    .eq("id", 1);
  if (error) {
    throw new Error(
      `settings update failed: ${error.message} — if the column is missing, apply the dataforseo_live_enabled migration (see HANDOFF contract-proposal)`
    );
  }
}

/** Route pre-check: throws the friendly LIVE_DATA_DISABLED error. */
export async function assertLiveDataEnabled(db: SupabaseClient): Promise<void> {
  if (!(await readLiveDataFlag(db))) {
    throw new LiveDataDisabledError();
  }
}

/**
 * Client-entry gate factory (defense in depth beside SpendGuard): the
 * DataForSeoClient calls this before ANY reserve or network I/O.
 * The flag read is memoised for a short TTL so a 25-point grid fan-out
 * costs ONE settings read, not 25 (PM fix-list, Day 6). A founder toggle
 * takes effect within the TTL — fine for a kill-switch that gates cost,
 * not safety-of-life.
 */
export function makeLiveGate(
  db: SupabaseClient,
  opts: { ttlMs?: number; now?: () => number } = {}
): () => Promise<void> {
  const ttlMs = opts.ttlMs ?? 5_000;
  const now = opts.now ?? Date.now;
  let cached: { value: boolean; at: number } | null = null;
  return async () => {
    if (!cached || now() - cached.at >= ttlMs) {
      cached = { value: await readLiveDataFlag(db), at: now() };
    }
    if (!cached.value) throw new LiveDataDisabledError();
  };
}
