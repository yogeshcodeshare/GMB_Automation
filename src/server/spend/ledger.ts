import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpendLedgerEntry } from "@/types";

/** UAT-8 — TB-010 ledger read for P11's table (read-only; cap logic lives in
 * guard.ts and is untouched). Newest first, real dates, numeric costs. */
export async function listLedger(
  db: SupabaseClient,
  limit: number
): Promise<SpendLedgerEntry[]> {
  const { data, error } = await db
    .from("spend_ledger")
    .select()
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`spend_ledger read failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: Number(row.id),
    endpoint: String(row.endpoint),
    cost_usd: Number(row.cost_usd), // numeric(10,6) arrives as a string
    task_id: (row.task_id as string) ?? null,
    created_at: String(row.created_at),
  }));
}
