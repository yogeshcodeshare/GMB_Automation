import type { BusinessCandidate, CostPreview } from "@/types";
import { COST_USD, toInr } from "@/server/costs";
import { createServiceClient } from "@/lib/supabase/server";
import { assertLiveDataEnabled } from "@/server/settings/live-flag";
import { demoCandidatesFor } from "@/server/audit/demo";
import { makeDataForSeoClient } from "@/server/dataforseo";
import { resolveBusiness } from "@/server/audit/pipeline";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/businesses/resolve?name=&city=[&preview=1] → BusinessCandidate[]
 * (P2 picker). One guarded serp/maps standard call (~$0.0006); `?preview=1`
 * returns the CostPreview without calling anything. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  const city = params.get("city")?.trim();
  if (!name || !city) {
    return err("VALIDATION_ERROR", "name and city query parameters are required");
  }
  if (name.length > 120 || city.length > 60) {
    return err("VALIDATION_ERROR", "name/city too long");
  }

  // UAT-2: demo mode returns labeled synthetic candidates — no gate, ₹0.
  if (params.get("mode") === "demo") {
    return ok(demoCandidatesFor(name, city));
  }

  if (params.get("preview") === "1") {
    const preview: CostPreview = {
      estimated_cost_usd: COST_USD.serp_maps_standard,
      estimated_cost_inr: toInr(COST_USD.serp_maps_standard),
      breakdown: [
        { item: "serp/google/maps candidate search", cost_usd: COST_USD.serp_maps_standard },
      ],
    };
    return ok(preview);
  }

  try {
    await assertLiveDataEnabled(createServiceClient()); // CR-1
    const candidates = await resolveBusiness(makeDataForSeoClient(), name, city);
    // Contract: BusinessCandidate.place_id is required — drop items without one.
    const data: BusinessCandidate[] = candidates
      .filter((c): c is typeof c & { place_id: string } => c.place_id !== null)
      .map((c) => ({
        name: c.name,
        address: c.address,
        place_id: c.place_id,
        cid: c.cid,
        rating: c.rating,
        reviews_total: c.reviews_total,
      }));
    return ok(data);
  } catch (e) {
    return errFrom(e);
  }
}
