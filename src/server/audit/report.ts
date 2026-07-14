import type {
  Audit,
  AuditReport,
  AuditScores,
  Business,
  CompetitorCompareRow,
  HoursDay,
  LinkPackGroup,
  RubricRow,
  SanityFlag,
  ScoreBand,
  TopFixes,
  WebsiteAuditSummary,
} from "@/types";
import { bandFor } from "@/types";
import type { AuditInput } from "./input";

/** EP-002 — assemble the P3 AuditReport from the snapshot persisted at
 * scoring time (no recomputation on the read path). */

function websiteSummary(
  input: AuditInput,
  businessId: string,
  checkedAt: string
): WebsiteAuditSummary | null {
  const w = input.website;
  if (!w) return null;
  return {
    id: 0, // TB-013 row lands with the M1.5 crawler (EP-014)
    business_id: businessId,
    psi_score: w.psi_score ?? null,
    title_ok: w.title.has_category && w.title.has_city,
    meta_ok: w.meta.has_category && w.meta.has_locality,
    h1_ok: w.heading_skips.length === 0,
    schema_ok: null,
    nap_match: w.nap.every((r) => r.match),
    city_kw: w.local_keywords.some((k) => k.found),
    checked_at: checkedAt,
    url: w.url,
    rented_subdomain: w.rented_subdomain,
    provider: w.provider,
  };
}

export function buildAuditReport(
  business: Business,
  audit: Audit,
  scores: AuditScores
): AuditReport {
  const snap = audit.raw_snapshot as {
    input?: AuditInput;
    band?: ScoreBand;
    rubric?: RubricRow[];
    sanity_flags?: SanityFlag[];
    links_pack?: LinkPackGroup[];
    top_fixes?: TopFixes[];
    competitors_compare?: CompetitorCompareRow[];
    audited_at?: string;
  };
  const input = snap.input;
  if (!input) {
    throw new Error("audit snapshot has no normalized input — audit incomplete");
  }

  const hours: HoursDay[] = input.profile.hours.map((h) => ({
    day: h.day,
    text: h.text,
    anomaly: h.anomaly,
  }));

  return {
    business,
    audit,
    scores,
    band: snap.band ?? bandFor(scores.total),
    rubric: snap.rubric ?? [],
    sanity_flags: snap.sanity_flags ?? [],
    hours,
    categories: {
      primary: input.profile.categories.primary,
      secondary: input.profile.categories.secondary,
      primary_flagged: (snap.sanity_flags ?? []).some(
        (f) => f.key === "generic_category"
      ),
    },
    attributes: input.profile.attributes,
    links_pack: snap.links_pack ?? [],
    top_fixes: snap.top_fixes ?? [],
    review_stats: input.reviews?.stats ?? null,
    post_stats: input.posts?.stats ?? null,
    website: websiteSummary(input, business.id, snap.audited_at ?? audit.created_at),
    competitors: snap.competitors_compare ?? [],
  };
}
