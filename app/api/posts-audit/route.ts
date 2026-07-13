import type { CostPreview, PostItem } from "@/types";
import { COST_USD, toInr } from "@/server/costs";
import { createServiceClient } from "@/lib/supabase/server";
import { makeDataForSeoClient, normalizeUpdateItem } from "@/server/dataforseo";
import {
  computePostStats,
  computePostTimeline,
} from "@/server/audit/posts";
import { getBusiness, getCachedPosts, replacePosts } from "@/server/audit/repo";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** EP-013 — POST /api/posts-audit {preview?, business_id} → P7 payload. */
export async function POST(req: Request) {
  const raw = await readJson(req);
  if (typeof raw !== "object" || raw === null) {
    return err("VALIDATION_ERROR", "JSON body required");
  }
  const b = raw as Record<string, unknown>;
  if (typeof b.business_id !== "string" || !UUID_RE.test(b.business_id)) {
    return err("VALIDATION_ERROR", "business_id (UUID) is required");
  }

  if (b.preview === true) {
    const preview: CostPreview = {
      estimated_cost_usd: COST_USD.my_business_updates,
      estimated_cost_inr: toInr(COST_USD.my_business_updates),
      breakdown: [
        { item: "my_business_updates task", cost_usd: COST_USD.my_business_updates },
      ],
    };
    return ok(preview);
  }

  try {
    const db = createServiceClient();
    const business = await getBusiness(db, b.business_id);
    if (!business) return err("NOT_FOUND", "No business with this id");

    const keyword = business.cid
      ? `cid:${business.cid}`
      : [business.name, business.city].filter(Boolean).join(" ");
    const dfs = makeDataForSeoClient();
    const result = await dfs.myBusinessUpdates({ keyword });
    const items = (result?.items ?? []).map(normalizeUpdateItem);
    await replacePosts(db, business.id, items);

    const posts: PostItem[] = await getCachedPosts(db, business.id);
    return ok({
      stats: computePostStats(items),
      posts,
      timeline: computePostTimeline(items),
    });
  } catch (e) {
    return errFrom(e);
  }
}
