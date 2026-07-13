import { createServiceClient } from "@/lib/supabase/server";
import { listBusinesses } from "@/server/audit/repo";
import { errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/businesses → BusinessListItem[] (P1 dashboard table). */
export async function GET() {
  try {
    return ok(await listBusinesses(createServiceClient()));
  } catch (e) {
    return errFrom(e);
  }
}
