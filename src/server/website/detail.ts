import type { WebsiteAuditDetail, WebsiteAuditSummary } from "@/types";
import type { WebsiteFindings } from "@/server/audit/input";

/** EP-014 response assembly — findings + PSI + TB-013 row → P3b payload. */
export function buildWebsiteAuditDetail(opts: {
  findings: WebsiteFindings;
  psi_score: number | null;
  schema_ok: boolean | null;
  h1_ok: boolean | null;
  row_id: number;
  business_id: string;
  checked_at: string;
}): WebsiteAuditDetail {
  const w = opts.findings;
  const summary: WebsiteAuditSummary = {
    id: opts.row_id,
    business_id: opts.business_id,
    psi_score: opts.psi_score,
    title_ok: w.title.has_category && w.title.has_city,
    meta_ok: w.meta.has_category && w.meta.has_locality,
    h1_ok: opts.h1_ok,
    schema_ok: opts.schema_ok,
    nap_match: w.nap.every((r) => r.match),
    city_kw: w.local_keywords.some((k) => k.found),
    checked_at: opts.checked_at,
    url: w.url,
    rented_subdomain: w.rented_subdomain,
    provider: w.provider,
  };
  return {
    summary,
    nap: w.nap,
    title: w.title,
    meta: w.meta,
    local_keywords: w.local_keywords,
    hours_match: w.hours_match,
    category_pages: w.category_pages,
    content_depth: w.content_depth,
    spelling_issues: w.spelling_issues,
    headings: w.headings,
    heading_skips: w.heading_skips,
    click_to_call: w.click_to_call,
  };
}
