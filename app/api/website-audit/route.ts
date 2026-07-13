import type { CostPreview } from "@/types";
import { createServiceClient } from "@/lib/supabase/server";
import type { AuditInput } from "@/server/audit/input";
import { getBusiness, insertWebsiteAudit } from "@/server/audit/repo";
import {
  buildWebsiteAuditDetail,
  crawlWebsite,
  psiDesktopScore,
  psiMobileScore,
  type CrawlGbpFacts,
} from "@/server/website";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** EP-014 — POST /api/website-audit {preview?, business_id} → WebsiteAuditDetail.
 * Own crawler (SSRF-guarded) + free PSI: ₹0 — the preview says so honestly. */
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
      estimated_cost_usd: 0,
      estimated_cost_inr: 0,
      breakdown: [
        { item: "own crawler + PageSpeed Insights (free)", cost_usd: 0 },
      ],
    };
    return ok(preview);
  }

  try {
    const db = createServiceClient();
    const business = await getBusiness(db, b.business_id);
    if (!business) return err("NOT_FOUND", "No business with this id");
    if (!business.website) {
      return err(
        "VALIDATION_ERROR",
        "This business has no website linked — nothing to crawl (the audit score renormalises instead)"
      );
    }

    // GBP facts for NAP/category checks — richest source is the last audit.
    const { data: auditRow, error: auditErr } = await db
      .from("audits")
      .select("raw_snapshot")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (auditErr) throw new Error(auditErr.message);
    const input = (auditRow?.raw_snapshot as { input?: AuditInput } | null)?.input;
    const gbp: CrawlGbpFacts = {
      name: input?.profile.name ?? business.name,
      address: input?.profile.address ?? null,
      phone: input?.profile.phone ?? null,
      city: input?.profile.city ?? business.city,
      categories: input
        ? [
            ...(input.profile.categories.primary
              ? [input.profile.categories.primary]
              : []),
            ...input.profile.categories.secondary,
          ]
        : [],
    };

    const [outcome, psi, psiDesktop] = await Promise.all([
      crawlWebsite(business.website, gbp),
      psiMobileScore(business.website),
      psiDesktopScore(business.website),
    ]);
    if (!outcome.reachable || !outcome.findings) {
      return err(
        "UPSTREAM_ERROR",
        `Website unreachable — section will be skipped and the score renormalised. (${outcome.error})`
      );
    }

    const w = outcome.findings;
    const rowId = await insertWebsiteAudit(db, business.id, {
      psi_score: psi,
      title_ok: w.title.has_category && w.title.has_city,
      meta_ok: w.meta.has_category && w.meta.has_locality,
      h1_ok: outcome.h1_ok,
      schema_ok: outcome.schema_ok,
      nap_match: w.nap.every((r) => r.match),
      city_kw: w.local_keywords.some((k) => k.found),
    });

    return ok(
      buildWebsiteAuditDetail({
        findings: w,
        psi_score: psi,
        psi_desktop: psiDesktop,
        schema_ok: outcome.schema_ok,
        h1_ok: outcome.h1_ok,
        row_id: rowId,
        business_id: business.id,
        checked_at: new Date().toISOString(),
      })
    );
  } catch (e) {
    return errFrom(e);
  }
}
