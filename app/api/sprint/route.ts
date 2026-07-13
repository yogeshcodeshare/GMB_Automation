import { createServiceClient } from "@/lib/supabase/server";
import {
  createSprint,
  getActiveSprintDetail,
  SprintGateError,
} from "@/server/sprint";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/sprint?businessId= → SprintDetail | null — the page-mount read
 * (loads the ACTIVE sprint without knowing its id). */
export async function GET(req: Request) {
  const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
  if (!UUID_RE.test(businessId)) {
    return err("VALIDATION_ERROR", "businessId (UUID) query parameter is required");
  }
  try {
    const detail = await getActiveSprintDetail(
      { db: createServiceClient() },
      businessId
    );
    return ok(detail); // null = no active sprint (contract: SprintDetail | null)
  } catch (e) {
    return errFrom(e);
  }
}

/** EP-021 — POST /api/sprint (SprintStartRequest) → SprintDetail.
 * The server re-runs the US-024 gate (never trusts the client) and LOCKS the
 * baseline. Gate failure → FORBIDDEN with per-check reasons. */
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
      return err("FORBIDDEN", e.message, { reasons: e.reasons });
    }
    return errFrom(e);
  }
}
