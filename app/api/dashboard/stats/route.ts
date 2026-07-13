import { createServiceClient } from "@/lib/supabase/server";
import { computeDashboardStats } from "@/server/dashboard/stats";
import { errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/dashboard/stats → DashboardStats (P1 KPI strip, ₹0). */
export async function GET() {
  try {
    return ok(await computeDashboardStats(createServiceClient()));
  } catch (e) {
    return errFrom(e);
  }
}
