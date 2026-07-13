import { createServiceClient } from "@/lib/supabase/server";
import { todaysWork } from "@/server/ops/reads";
import { errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/ops/today → TodaysWorkItem[] (P9 "Today's work" strip; ₹0).
 * Contract-proposal row (HANDOFF). */
export async function GET() {
  try {
    return ok(await todaysWork(createServiceClient()));
  } catch (e) {
    return errFrom(e);
  }
}
