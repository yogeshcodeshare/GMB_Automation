import type { CostPreview, GridScanRequest, GridSize } from "@/types";
import { gridEstimateUsd, toInr } from "@/server/costs";
import { assertLiveDataEnabled } from "@/server/settings/live-flag";
import { makeSpendGuard } from "@/server/spend";
import { makeDataForSeoClient } from "@/server/dataforseo";
import { createServiceClient } from "@/lib/supabase/server";
import { listGridScans, startGridScan } from "@/server/grid";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIZES: GridSize[] = [1, 3, 5, 7];

function parseBody(raw: unknown): GridScanRequest | string {
  if (typeof raw !== "object" || raw === null) return "JSON body required";
  const b = raw as Record<string, unknown>;
  if (typeof b.business_id !== "string" || !UUID_RE.test(b.business_id)) {
    return "business_id (UUID) is required";
  }
  if (typeof b.keyword !== "string" || b.keyword.trim() === "") {
    return "keyword is required";
  }
  if (b.keyword.length > 80) return "keyword too long (max 80 chars)";
  if (!SIZES.includes(b.grid_size as GridSize)) {
    return "grid_size must be 1 (Teleport), 3, 5 or 7";
  }
  const radius = Number(b.radius_m);
  if (!Number.isFinite(radius) || radius < 500 || radius > 5000) {
    return "radius_m must be 500–5000 (0.5–5 km)";
  }
  const isTeleport = b.grid_size === 1;
  const lat = b.lat === undefined ? undefined : Number(b.lat);
  const lng = b.lng === undefined ? undefined : Number(b.lng);
  if (isTeleport && (lat === undefined || lng === undefined)) {
    return "Teleport (grid_size 1) needs lat + lng — the pin to stand on";
  }
  if (
    (lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
    (lng !== undefined && (!Number.isFinite(lng) || lng < -180 || lng > 180))
  ) {
    return "lat/lng out of range";
  }
  return {
    preview: b.preview === true,
    business_id: b.business_id,
    keyword: b.keyword.trim(),
    grid_size: b.grid_size as GridSize,
    radius_m: radius,
    lat,
    lng,
  };
}

/** GET /api/grid?businessId= → GridScan[] newest-first (P5 history, ₹0). */
export async function GET(req: Request) {
  const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
  if (!UUID_RE.test(businessId)) {
    return err("VALIDATION_ERROR", "businessId (UUID) query parameter is required");
  }
  try {
    return ok(await listGridScans(createServiceClient(), businessId));
  } catch (e) {
    return errFrom(e);
  }
}

/** EP-003 — POST /api/grid: `{preview:true}` → CostPreview; else queue the
 * scan and return the GridScan row for P5 to poll via EP-004. */
export async function POST(req: Request) {
  const parsed = parseBody(await readJson(req));
  if (typeof parsed === "string") return err("VALIDATION_ERROR", parsed);

  const estimate = gridEstimateUsd(parsed.grid_size);
  if (parsed.preview) {
    const unit = parsed.grid_size === 1 ? "Teleport (live)" : "grid point (standard)";
    const points = parsed.grid_size === 1 ? 1 : parsed.grid_size ** 2;
    const preview: CostPreview = {
      estimated_cost_usd: estimate,
      estimated_cost_inr: toInr(estimate),
      breakdown: [{ item: `${points} × ${unit}`, cost_usd: estimate }],
    };
    return ok(preview);
  }

  try {
    await assertLiveDataEnabled(createServiceClient()); // CR-1: clean 503 first
    await makeSpendGuard().assertCanSpend(estimate); // clean 402 up front
    const started = await startGridScan(
      { dfs: makeDataForSeoClient(), db: createServiceClient() },
      parsed
    );
    const db = createServiceClient();
    const { data } = await db
      .from("grid_scans")
      .select()
      .eq("id", started.scan_id)
      .single();
    return ok(data, 202);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return err("NOT_FOUND", "business_id not found");
    }
    if (e instanceof Error && e.message.startsWith("VALIDATION:")) {
      return err("VALIDATION_ERROR", e.message.slice("VALIDATION:".length));
    }
    return errFrom(e);
  }
}
