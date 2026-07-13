import type { KeywordCloudItem, ReviewItem, ReviewStats, ReviewTrendPoint } from "@/types";
import { createServiceClient } from "@/lib/supabase/server";
import type { AuditInput } from "@/server/audit/input";
import { getCachedReviews } from "@/server/audit/repo";
import { buildKeywordCloud } from "@/server/audit/tokenizer";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTERS = ["all", "unreplied", "low", "textless"] as const;
type Filter = (typeof FILTERS)[number];

/** GET /api/reviews/:businessId?filter= — P6 Review Inbox payload.
 * Stats/cloud/trend come from the latest audit snapshot (they carry the
 * enrichment reviews_cache can't hold); rows come from TB-006 enriched by
 * snapshot author stats. */
export async function GET(
  req: Request,
  { params }: { params: { businessId: string } }
) {
  if (!UUID_RE.test(params.businessId)) {
    return err("VALIDATION_ERROR", "businessId must be a UUID");
  }
  const filterRaw = new URL(req.url).searchParams.get("filter") ?? "all";
  if (!FILTERS.includes(filterRaw as Filter)) {
    return err(
      "VALIDATION_ERROR",
      `filter must be one of: ${FILTERS.join(", ")}`
    );
  }
  const filter = filterRaw as Filter;

  try {
    const db = createServiceClient();
    const rows = await getCachedReviews(db, params.businessId);

    // Latest audit snapshot for stats + enrichment.
    const { data: auditRow, error } = await db
      .from("audits")
      .select("raw_snapshot")
      .eq("business_id", params.businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const input = (auditRow?.raw_snapshot as { input?: AuditInput } | null)?.input;
    const norm = input?.reviews ?? null;

    if (rows.length === 0 && !norm) {
      return err("NOT_FOUND", "No cached reviews — run an audit first");
    }

    const byId = new Map(norm?.items.map((r) => [r.review_id, r]) ?? []);
    let reviews: ReviewItem[] = rows.map((row) => {
      const enrich = byId.get(row.review_id);
      return {
        ...row,
        author_stats: enrich
          ? {
              review_count: enrich.author_review_count ?? 0,
              photo_count: enrich.author_photo_count ?? 0,
              is_local_guide: enrich.is_local_guide,
            }
          : undefined,
        owner_reply: enrich?.owner_reply ?? null,
      };
    });

    if (filter === "unreplied") reviews = reviews.filter((r) => !r.replied);
    if (filter === "low") reviews = reviews.filter((r) => r.rating <= 3);
    if (filter === "textless") {
      reviews = reviews.filter((r) => !r.text || r.text.trim() === "");
    }

    const stats: ReviewStats | null = norm?.stats ?? null;
    const cloud: KeywordCloudItem[] =
      norm?.cloud ?? buildKeywordCloud(rows.map((r) => r.text));
    const trend: ReviewTrendPoint[] = norm?.timeline ?? [];

    return ok({ stats, reviews, cloud, trend });
  } catch (e) {
    return errFrom(e);
  }
}
