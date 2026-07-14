import { createServiceClient } from "@/lib/supabase/server";
import { listLedger } from "@/server/spend/ledger";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

/** UAT-8 — GET /api/spend/ledger?limit= → SpendLedgerEntry[] (newest first;
 * P11 computes the running total client-side from real rows). */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("limit");
  const limit = raw === null ? 50 : Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return err("VALIDATION_ERROR", "limit must be an integer 1..500");
  }
  try {
    return ok(await listLedger(createServiceClient(), limit));
  } catch (e) {
    return errFrom(e);
  }
}
