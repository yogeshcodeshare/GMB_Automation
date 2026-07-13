import { createServiceClient } from "@/lib/supabase/server";
import { listCycles } from "@/server/ops/reads";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/ops/cycles?month=YYYY-MM → ClientCycleView[] (P9 read; ₹0).
 * Defaults to the current IST month. Contract-proposal row (HANDOFF). */
export async function GET(req: Request) {
  const param = new URL(req.url).searchParams.get("month");
  const istNow = new Date(Date.now() + (5 * 60 + 30) * 60_000);
  const month = param ?? istNow.toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return err("VALIDATION_ERROR", "month must be YYYY-MM");
  }
  try {
    return ok(await listCycles(createServiceClient(), month));
  } catch (e) {
    return errFrom(e);
  }
}
