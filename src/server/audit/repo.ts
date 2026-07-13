import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Audit,
  AuditScores,
  Business,
  BusinessListItem,
  PostItem,
  ReviewItem,
} from "@/types";
import type { NormalizedPost, NormalizedProfile, NormalizedReview } from "./input";

/** MS1-T08 — persistence (TB-001/002/003/006/012) via the service client. */

function fail(op: string, message: string): never {
  throw new Error(`${op} failed: ${message}`);
}

export async function upsertBusinessFromProfile(
  db: SupabaseClient,
  profile: NormalizedProfile,
  existingId?: string
): Promise<Business> {
  const patch = {
    name: profile.name,
    city: profile.city,
    place_id: profile.place_id,
    cid: profile.cid,
    lat: profile.lat,
    lng: profile.lng,
    website: profile.website,
  };

  if (existingId) {
    const { data, error } = await db
      .from("businesses")
      .update(patch)
      .eq("id", existingId)
      .select()
      .single();
    if (error) fail("business update", error.message);
    return data as Business;
  }

  // Match an existing row by place_id (unique) so re-audits don't duplicate.
  if (profile.place_id) {
    const { data: found, error } = await db
      .from("businesses")
      .select("id")
      .eq("place_id", profile.place_id)
      .maybeSingle();
    if (error) fail("business lookup", error.message);
    if (found) return upsertBusinessFromProfile(db, profile, found.id as string);
  }

  const { data, error } = await db
    .from("businesses")
    .insert(patch)
    .select()
    .single();
  if (error) fail("business insert", error.message);
  return data as Business;
}

export async function insertAudit(
  db: SupabaseClient,
  businessId: string,
  snapshot: Record<string, unknown>
): Promise<string> {
  const { data, error } = await db
    .from("audits")
    .insert({ business_id: businessId, raw_snapshot: snapshot })
    .select("id")
    .single();
  if (error) fail("audit insert", error.message);
  return data.id as string;
}

export async function updateAuditSnapshot(
  db: SupabaseClient,
  auditId: string,
  snapshot: Record<string, unknown>,
  competitorIds: string[] = []
): Promise<void> {
  const { error } = await db
    .from("audits")
    .update({ raw_snapshot: snapshot, competitor_ids: competitorIds })
    .eq("id", auditId);
  if (error) fail("audit snapshot update", error.message);
}

export async function insertScores(
  db: SupabaseClient,
  auditId: string,
  scores: Omit<AuditScores, "audit_id">
): Promise<void> {
  const { error } = await db
    .from("audit_scores")
    .upsert({ audit_id: auditId, ...scores }, { onConflict: "audit_id" });
  if (error) fail("scores insert", error.message);
}

export async function upsertReviews(
  db: SupabaseClient,
  businessId: string,
  reviews: NormalizedReview[]
): Promise<void> {
  if (reviews.length === 0) return;
  const rows = reviews.map((r) => ({
    business_id: businessId,
    review_id: r.review_id,
    rating: Math.min(5, Math.max(1, Math.round(r.rating || 1))),
    text: r.text,
    author: r.author,
    review_ts: r.review_ts,
    replied: r.replied,
  }));
  const { error } = await db
    .from("reviews_cache")
    .upsert(rows, { onConflict: "business_id,review_id" });
  if (error) fail("reviews upsert", error.message);
}

export async function replacePosts(
  db: SupabaseClient,
  businessId: string,
  posts: NormalizedPost[]
): Promise<void> {
  const del = await db.from("posts_cache").delete().eq("business_id", businessId);
  if (del.error) fail("posts delete", del.error.message);
  if (posts.length === 0) return;
  const rows = posts.map((p) => ({
    business_id: businessId,
    post_ts: p.post_ts,
    text: p.text,
    char_count: p.char_count,
    has_media: p.has_media,
    links: p.links,
  }));
  const { error } = await db.from("posts_cache").insert(rows);
  if (error) fail("posts insert", error.message);
}

// ---------- reads ----------

export async function getBusiness(
  db: SupabaseClient,
  id: string
): Promise<Business | null> {
  const { data, error } = await db
    .from("businesses")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) fail("business read", error.message);
  return (data as Business) ?? null;
}

export async function patchBusiness(
  db: SupabaseClient,
  id: string,
  patch: Partial<Pick<Business, "is_client" | "plan" | "owner_name" | "owner_whatsapp">>
): Promise<Business | null> {
  const { data, error } = await db
    .from("businesses")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) fail("business patch", error.message);
  return (data as Business) ?? null;
}

interface AuditJoinRow {
  id: string;
  created_at: string;
  audit_scores: { total: number } | Array<{ total: number }> | null;
}

function rowScore(row: AuditJoinRow): number | null {
  const scores = Array.isArray(row.audit_scores)
    ? row.audit_scores[0]
    : row.audit_scores;
  return scores?.total ?? null;
}

/** Newest audit that actually finished scoring — a failed/running audit
 * must not blank the dashboard score badge. */
function latestScore(rows: AuditJoinRow[]): {
  score: number | null;
  at: string | null;
} {
  const scored = rows.find((r) => rowScore(r) !== null);
  if (scored) return { score: rowScore(scored), at: scored.created_at };
  const newest = rows[0];
  return { score: null, at: newest?.created_at ?? null };
}

export async function listBusinesses(
  db: SupabaseClient
): Promise<BusinessListItem[]> {
  const { data, error } = await db
    .from("businesses")
    .select("*, audits(id, created_at, audit_scores(total))")
    .order("created_at", { ascending: true })
    .order("created_at", { referencedTable: "audits", ascending: false })
    .limit(5, { referencedTable: "audits" });
  if (error) fail("businesses list", error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const audits = (row.audits ?? []) as AuditJoinRow[];
    const latest = latestScore(audits);
    const { audits: _drop, ...business } = row;
    return {
      ...(business as unknown as Business),
      latest_score: latest.score,
      latest_audit_at: latest.at,
      sprint_delta: null, // wired in M6 (optimization sprints)
    };
  });
}

export async function getAuditWithScores(
  db: SupabaseClient,
  auditId: string
): Promise<{ audit: Audit; scores: AuditScores | null } | null> {
  const { data, error } = await db
    .from("audits")
    .select("*, audit_scores(*)")
    .eq("id", auditId)
    .maybeSingle();
  if (error) fail("audit read", error.message);
  if (!data) return null;
  const { audit_scores, ...audit } = data as Record<string, unknown>;
  const scores = Array.isArray(audit_scores) ? audit_scores[0] : audit_scores;
  return {
    audit: audit as unknown as Audit,
    scores: (scores as AuditScores) ?? null,
  };
}

export async function getCachedReviews(
  db: SupabaseClient,
  businessId: string
): Promise<ReviewItem[]> {
  const { data, error } = await db
    .from("reviews_cache")
    .select()
    .eq("business_id", businessId)
    .order("review_ts", { ascending: false });
  if (error) fail("reviews read", error.message);
  return (data ?? []) as ReviewItem[];
}

export async function getCachedPosts(
  db: SupabaseClient,
  businessId: string
): Promise<PostItem[]> {
  const { data, error } = await db
    .from("posts_cache")
    .select()
    .eq("business_id", businessId)
    .order("post_ts", { ascending: false });
  if (error) fail("posts read", error.message);
  return (data ?? []) as PostItem[];
}
