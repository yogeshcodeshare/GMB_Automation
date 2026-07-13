import { createServiceClient } from "@/lib/supabase/server";
import { readLiveDataFlag, setLiveDataFlag } from "@/server/settings/live-flag";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** CR-1 — GET /api/settings → { dataforseo_live_enabled } (founder-only via
 * middleware; P11 "Data sources" toggle reads this). */
export async function GET() {
  try {
    const db = createServiceClient();
    return ok({ dataforseo_live_enabled: await readLiveDataFlag(db) });
  } catch (e) {
    return errFrom(e);
  }
}

/** CR-1 — PATCH /api/settings { dataforseo_live_enabled: boolean }. */
export async function PATCH(req: Request) {
  const raw = await readJson(req);
  if (typeof raw !== "object" || raw === null) {
    return err("VALIDATION_ERROR", "JSON body required");
  }
  const value = (raw as Record<string, unknown>).dataforseo_live_enabled;
  if (typeof value !== "boolean") {
    return err("VALIDATION_ERROR", "dataforseo_live_enabled must be boolean");
  }
  try {
    const db = createServiceClient();
    await setLiveDataFlag(db, value);
    return ok({ dataforseo_live_enabled: await readLiveDataFlag(db) });
  } catch (e) {
    return errFrom(e);
  }
}
