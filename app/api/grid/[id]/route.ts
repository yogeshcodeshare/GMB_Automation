import { createServiceClient } from "@/lib/supabase/server";
import { getGridResult } from "@/server/grid";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** EP-004 — GET /api/grid/:id → GridScanResult | TeleportResult (poll). */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "scan id must be a UUID");
  }
  try {
    const result = await getGridResult(createServiceClient(), params.id);
    if (!result) return err("NOT_FOUND", "No grid scan with this id");
    return ok(result);
  } catch (e) {
    return errFrom(e);
  }
}
