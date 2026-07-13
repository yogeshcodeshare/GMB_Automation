import { createServiceClient } from "@/lib/supabase/server";
import { compareScans } from "@/server/grid";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/grid/compare?before=&after= → GridCompare (MS2-T06/T07). */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const before = params.get("before") ?? "";
  const after = params.get("after") ?? "";
  if (!UUID_RE.test(before) || !UUID_RE.test(after)) {
    return err("VALIDATION_ERROR", "before and after must be grid scan UUIDs");
  }
  if (before === after) {
    return err("VALIDATION_ERROR", "before and after must differ");
  }
  try {
    const result = await compareScans(createServiceClient(), before, after);
    if (!result) {
      return err(
        "NOT_FOUND",
        "Both ids must be finished GRID scans (Teleport runs cannot be compared)"
      );
    }
    return ok(result);
  } catch (e) {
    return errFrom(e);
  }
}
