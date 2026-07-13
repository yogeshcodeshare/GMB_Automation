import { relatedCategoryIntel } from "@/server/audit/categories";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

/** EP-015 — GET /api/categories/related?kw= → CategoryIntel (P8 tool ⑦).
 * Taxonomy + trends link are free; search-volume badges arrive with the
 * guarded keywords_data enrichment (kept off the free path on purpose —
 * every paid action needs its ₹ preview). */
export async function GET(req: Request) {
  const kw = new URL(req.url).searchParams.get("kw")?.trim();
  if (!kw) return err("VALIDATION_ERROR", "kw query parameter is required");
  if (kw.length > 80) return err("VALIDATION_ERROR", "kw too long (max 80 chars)");
  try {
    return ok(relatedCategoryIntel([kw]));
  } catch (e) {
    return errFrom(e);
  }
}
