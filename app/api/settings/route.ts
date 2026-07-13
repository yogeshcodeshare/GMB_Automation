import { createServiceClient } from "@/lib/supabase/server";
import {
  patchSettings,
  readSettings,
  validateSettingsPatch,
} from "@/server/settings/store";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/settings → Settings (P11 Settings & Spend + CR-1 Data-sources
 * toggle; founder-auth via middleware). */
export async function GET() {
  try {
    return ok(await readSettings(createServiceClient()));
  } catch (e) {
    return errFrom(e);
  }
}

/** PATCH /api/settings — Partial<Settings>. */
export async function PATCH(req: Request) {
  const raw = await readJson(req);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return err("VALIDATION_ERROR", "JSON object body required");
  }
  const parsed = validateSettingsPatch(raw as Record<string, unknown>);
  if (typeof parsed === "string") return err("VALIDATION_ERROR", parsed);

  try {
    return ok(await patchSettings(createServiceClient(), parsed));
  } catch (e) {
    return errFrom(e);
  }
}
