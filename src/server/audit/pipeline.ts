import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditProgress,
  AuditRequest,
  Business,
  CompetitorCompareRow,
} from "@/types";
import type { DataForSeoClient } from "@/server/dataforseo/client";
import {
  candidatesFromSerp,
  competitorsFromSerp,
  normalizeBusinessInfo,
  normalizeReviewItem,
  normalizeUpdateItem,
  type ResolveCandidate,
} from "@/server/dataforseo/normalize";
import { scoreAudit } from "@/server/score";
import type {
  AuditInput,
  CompetitorSnapshot,
  NormalizedPosts,
  NormalizedProfile,
  NormalizedReviews,
} from "./input";
import { buildNormalizedReviews } from "./reviews";
import {
  computePostStats,
  computePostTimeline,
  countLast30d,
  lastPostTs,
} from "./posts";
import { buildLinkPack } from "./links";
import { buildTopFixes } from "./top-fixes";
import { runSanityChecks } from "./sanity";
import { finishProgress, initProgress, setStage } from "./progress";
import {
  insertAudit,
  insertScores,
  replacePosts,
  updateAuditSnapshot,
  upsertReviews,
} from "./repo";

/** EP-001 — the M1 audit pipeline (MS1-T01..T11). */

export interface AuditPipelineDeps {
  dfs: DataForSeoClient;
  db: SupabaseClient;
  now?: () => Date;
}

export interface StartedAudit {
  audit_id: string;
  business_id: string;
  /** Resolves when the pipeline finishes (routes fire-and-forget; the smoke
   * script and tests await it). */
  done: Promise<AuditProgress>;
}

/** MS1-T01 — name+city → candidate cards (one guarded serp/maps call). */
export async function resolveBusiness(
  dfs: DataForSeoClient,
  name: string,
  city: string
): Promise<ResolveCandidate[]> {
  const serp = await dfs.serpMaps(
    { keyword: `${name} ${city}`, depth: 10 },
    "standard"
  );
  return candidatesFromSerp(serp?.items ?? []);
}

function keywordFor(business: {
  cid: string | null;
  name: string;
  city: string | null;
}): string {
  if (business.cid) return `cid:${business.cid}`;
  return [business.name, business.city].filter(Boolean).join(" ");
}

/** Target row + competitor snapshots → P4 compare table (M1: reply-rate /
 * velocity / services need per-competitor audits — null until then). */
function compareRows(
  profile: NormalizedProfile,
  reviews: NormalizedReviews | null,
  competitors: CompetitorSnapshot[]
): CompetitorCompareRow[] {
  const target: CompetitorCompareRow = {
    business_id: null,
    name: profile.name,
    distance_km: 0,
    primary_category: profile.categories.primary,
    rating: profile.rating,
    reviews_total: profile.reviews_total,
    velocity_6m: reviews?.stats.velocity_per_month_6m ?? null,
    reply_rate_pct: reviews?.stats.reply_rate_pct ?? null,
    photos: profile.photos_total,
    services_count: profile.services.length,
    is_target: true,
  };
  const rows = competitors.map(
    (c): CompetitorCompareRow => ({
      business_id: null,
      name: c.name,
      distance_km: c.distance_km,
      primary_category: c.primary_category,
      rating: c.rating,
      reviews_total: c.reviews_total,
      velocity_6m: null,
      reply_rate_pct: null,
      photos: c.photos,
      services_count: null,
      is_target: false,
    })
  );
  return [target, ...rows];
}

/** Everything GET /api/audit/:id needs, snapshotted at scoring time so the
 * read path is a plain DB read (TB-002 raw_snapshot). */
export function buildSnapshot(
  input: AuditInput,
  opts: { source: string; auditedAt: string; progress: AuditProgress }
): Record<string, unknown> {
  const { scores, band, rubric } = scoreAudit(input);
  return {
    source: opts.source,
    audited_at: opts.auditedAt,
    input,
    scores,
    band,
    rubric,
    sanity_flags: runSanityChecks(input),
    links_pack: buildLinkPack(input.profile),
    top_fixes: buildTopFixes(rubric),
    competitors_compare: compareRows(input.profile, input.reviews, input.competitors),
    progress: opts.progress,
  };
}

async function persistProgress(
  db: SupabaseClient,
  auditId: string,
  snapshot: Record<string, unknown>,
  progress: AuditProgress
): Promise<void> {
  await updateAuditSnapshot(db, auditId, { ...snapshot, progress });
}

/**
 * Attach the resolved profile to the business row. Handles the re-audit
 * dedup: if another row already owns this place_id (unique), the audit is
 * repointed there and the provisional row is removed.
 */
async function attachProfile(
  db: SupabaseClient,
  auditId: string,
  business: Business,
  profile: NormalizedProfile
): Promise<string> {
  const patch = {
    name: profile.name || business.name,
    city: profile.city ?? business.city,
    place_id: profile.place_id ?? business.place_id,
    cid: profile.cid ?? business.cid,
    lat: profile.lat ?? business.lat,
    lng: profile.lng ?? business.lng,
    website: profile.website ?? business.website,
  };
  const { error } = await db.from("businesses").update(patch).eq("id", business.id);
  if (!error) return business.id;

  if (error.code === "23505" && profile.place_id) {
    const { data: existing } = await db
      .from("businesses")
      .select("id")
      .eq("place_id", profile.place_id)
      .maybeSingle();
    if (existing) {
      await db
        .from("audits")
        .update({ business_id: existing.id })
        .eq("id", auditId);
      if (!business.place_id) {
        await db.from("businesses").delete().eq("id", business.id);
      }
      return existing.id as string;
    }
  }
  throw new Error(`business update failed: ${error.message}`);
}

export async function startAudit(
  deps: AuditPipelineDeps,
  req: AuditRequest
): Promise<StartedAudit> {
  const { db } = deps;
  const now = deps.now ?? (() => new Date());

  // ---- target business shell (audit row needs the FK immediately) ----
  let business: Business;
  if (req.business_id) {
    const { data, error } = await db
      .from("businesses")
      .select()
      .eq("id", req.business_id)
      .maybeSingle();
    if (error) throw new Error(`business read failed: ${error.message}`);
    if (!data) throw new Error("NOT_FOUND");
    business = data as Business;
  } else {
    const shell = {
      name: req.name ?? (req.cid ? `cid:${req.cid}` : "(resolving…)"),
      city: req.city ?? null,
      cid: req.cid ?? null,
      place_id: req.place_id ?? null,
    };
    const { data, error } = await db
      .from("businesses")
      .upsert(
        shell,
        req.place_id ? { onConflict: "place_id" } : undefined
      )
      .select()
      .single();
    if (error) throw new Error(`business insert failed: ${error.message}`);
    business = data as Business;
  }

  const startedAt = now().toISOString();
  const progress0 = { progress: initProgress("pending") };
  const auditId = await insertAudit(db, business.id, {
    source: "dataforseo",
    started_at: startedAt,
    ...progress0,
  });
  initProgress(auditId);

  const done = runStages(deps, auditId, business, req, startedAt).catch(
    (e: unknown) => {
      const p = finishProgress(
        auditId,
        "failed",
        e instanceof Error ? e.message : "audit failed"
      );
      return persistProgress(db, auditId, { source: "dataforseo" }, p)
        .catch(() => undefined)
        .then(() => p);
    }
  );

  return { audit_id: auditId, business_id: business.id, done };
}

async function runStages(
  deps: AuditPipelineDeps,
  auditId: string,
  business: Business,
  req: AuditRequest,
  startedAt: string
): Promise<AuditProgress> {
  const { db, dfs } = deps;
  const now = deps.now ?? (() => new Date());
  const reference = now();
  const warnings: string[] = [];

  // ---- stage: profile (hard requirement — no profile, no audit) ----
  setStage(auditId, "profile");
  const keyword = keywordFor(business);
  const rawInfo = await dfs.myBusinessInfo({ keyword });
  if (!rawInfo) {
    throw new Error(`No Google Business Profile found for "${keyword}"`);
  }
  const profile = normalizeBusinessInfo(rawInfo, { city: business.city });
  const businessId = await attachProfile(db, auditId, business, profile);

  // ---- stage: reviews ----
  setStage(auditId, "reviews");
  let reviews: NormalizedReviews | null = null;
  try {
    const raw = await dfs.reviews({
      keyword: profile.cid ? `cid:${profile.cid}` : keyword,
      depth: 30,
    });
    const items = (raw?.items ?? []).map((item, i) =>
      normalizeReviewItem(item, i, reference)
    );
    reviews = buildNormalizedReviews(items, {
      reference,
      displayed_rating: raw?.rating?.value ?? profile.rating,
      displayed_total: raw?.reviews_count ?? profile.reviews_total,
    });
    setStage(auditId, "posts", `${items.length} reviews analyzed`);
  } catch (e) {
    warnings.push(`reviews: ${e instanceof Error ? e.message : "failed"}`);
    setStage(auditId, "posts", "reviews unavailable");
  }

  // ---- stage: posts ----
  let posts: NormalizedPosts | null = null;
  if (req.options.post_audit) {
    try {
      const raw = await dfs.myBusinessUpdates({
        keyword: profile.cid ? `cid:${profile.cid}` : keyword,
      });
      const items = (raw?.items ?? []).map(normalizeUpdateItem);
      posts = {
        stats: computePostStats(items),
        items,
        timeline: computePostTimeline(items),
        last_post_ts: lastPostTs(items),
        last_30d_count: countLast30d(items, reference),
      };
      setStage(auditId, "competitors", `${items.length} posts found`);
    } catch (e) {
      warnings.push(`posts: ${e instanceof Error ? e.message : "failed"}`);
      setStage(auditId, "competitors", "posts unavailable");
    }
  } else {
    setStage(auditId, "competitors");
  }

  // ---- stage: competitors ----
  let competitors: CompetitorSnapshot[] = [];
  try {
    const category = profile.categories.primary;
    if (category) {
      const serp = await dfs.localFinder({
        keyword: `${category} ${profile.city ?? ""}`.trim(),
        location_coordinate:
          profile.lat !== null && profile.lng !== null
            ? `${profile.lat},${profile.lng},14z`
            : undefined,
        depth: 20,
      });
      competitors = competitorsFromSerp(
        serp?.items ?? [],
        {
          cid: profile.cid,
          place_id: profile.place_id,
          lat: profile.lat,
          lng: profile.lng,
        },
        req.options.competitors
      );
    }
    setStage(auditId, "website", `${competitors.length} competitors`);
  } catch (e) {
    warnings.push(`competitors: ${e instanceof Error ? e.message : "failed"}`);
    setStage(auditId, "website", "competitor discovery unavailable");
  }

  // ---- stage: website (M1.5 crawler lands EP-014; rented-subdomain check
  // already runs off profile.website in sanity + rubric) ----
  setStage(auditId, "scoring");

  // ---- stage: scoring + persistence ----
  const input: AuditInput = {
    profile,
    reviews,
    posts,
    website: null,
    competitors,
  };
  const status = warnings.length > 0 ? "partial" : "done";
  const progress = finishProgress(auditId, status, warnings.join(" · ") || undefined);
  const snapshot = buildSnapshot(input, {
    source: "dataforseo",
    auditedAt: startedAt,
    progress,
  });

  const { scores } = scoreAudit(input);
  await insertScores(db, auditId, scores);
  await updateAuditSnapshot(db, auditId, snapshot);
  if (reviews) await upsertReviews(db, businessId, reviews.items);
  if (posts) await replacePosts(db, businessId, posts.items);

  return progress;
}
