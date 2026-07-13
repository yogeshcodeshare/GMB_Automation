import { createServiceClient } from "@/lib/supabase/server";
import { createSprint, SprintGateError } from "@/server/sprint";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** EP-021 — POST /api/sprint (SprintStartRequest) → SprintDetail.
 * Server-side US-024 prereq gate; baseline LOCKS at creation. */
export async function POST(req: Request) {
  const raw = await readJson(req);
  if (typeof raw !== "object" || raw === null) {
    return err("VALIDATION_ERROR", "JSON body required");
  }
  const businessId = (raw as Record<string, unknown>).business_id;
  if (typeof businessId !== "string" || !UUID_RE.test(businessId)) {
    return err("VALIDATION_ERROR", "business_id (UUID) is required");
  }

  try {
    return ok(await createSprint({ db: createServiceClient() }, businessId), 201);
  } catch (e) {
    if (e instanceof SprintGateError) {
      return err("VALIDATION_ERROR", e.message, { reasons: e.reasons });
    }
    return errFrom(e);
  }
}
