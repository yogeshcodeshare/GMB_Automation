import { createServiceClient } from "@/lib/supabase/server";
import { computePrereqs } from "@/server/sprint";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/sprint/prereqs?businessId= → SprintPrereqs (US-024 gate view). */
export async function GET(req: Request) {
  const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
  if (!UUID_RE.test(businessId)) {
    return err("VALIDATION_ERROR", "businessId (UUID) query parameter is required");
  }
  try {
    const result = await computePrereqs(createServiceClient(), businessId);
    return ok(result.prereqs);
  } catch (e) {
    return errFrom(e);
  }
}
