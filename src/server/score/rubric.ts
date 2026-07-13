import {
  bandFor,
  RUBRIC_MAX,
  type AuditScores,
  type RubricKey,
  type RubricRow,
  type RubricRowStatus,
  type ScoreBand,
} from "@/types";
import {
  competitorCategoryMode,
  type AuditInput,
} from "@/server/audit/input";
import { categorySuggestion, isGenericCategory } from "@/server/audit/sanity";

/**
 * score.service — the deterministic /100 rubric (ERD §2.5, MS1-T06). No AI.
 * claimed 10 · category 15 · completeness 15 · photos 10 · reviews count 10 ·
 * 90-day velocity 8 · reply rate 7 · posts 10 · website 10 · NAP 5.
 * Calibrated so the Manovedh fixture lands 10/0/7/4/5/3/1/2/6/3 = 41 amber
 * (the seed's audit_scores row / P3 design-handoff card).
 */

export const RUBRIC_LABELS: Record<RubricKey, string> = {
  claimed: "Profile claimed",
  category: "Primary category",
  completeness: "Profile completeness",
  photos: "Photos",
  reviews_count: "Review count",
  reviews_velocity: "Review velocity",
  reply_rate: "Review reply rate",
  posts: "Posts (last 30 days)",
  website: "Website",
  nap: "NAP consistency",
};

interface RowResult {
  points: number;
  status: RubricRowStatus;
  reason: string;
}

function row(key: RubricKey, r: RowResult): RubricRow {
  return {
    key,
    label: RUBRIC_LABELS[key],
    status: r.status,
    points: r.points,
    max: RUBRIC_MAX[key],
    reason: r.reason,
  };
}

// ---------- claimed (10) ----------
function scoreClaimed(input: AuditInput): RowResult {
  return input.profile.claimed
    ? { points: 10, status: "pass", reason: "Profile is claimed and verified" }
    : {
        points: 0,
        status: "fail",
        reason: "Profile is unclaimed — claim it before anything else",
      };
}

// ---------- category (15) ----------
function scoreCategory(input: AuditInput): RowResult {
  const primary = input.profile.categories.primary;
  if (!primary) {
    return { points: 0, status: "fail", reason: "No primary category set" };
  }
  const mode = competitorCategoryMode(input.competitors);
  if (isGenericCategory(primary)) {
    const suggestion = mode ?? categorySuggestion(primary);
    return {
      points: 0,
      status: "fail",
      reason:
        `"${primary}" is generic` +
        (suggestion
          ? ` — competitors use "${suggestion}"`
          : " — pick the most specific category Google offers"),
    };
  }
  if (mode && mode.toLowerCase() !== primary.toLowerCase()) {
    return {
      points: 8,
      status: "warn",
      reason: `"${primary}" differs from the competitor mode "${mode}" — verify it is the best fit`,
    };
  }
  return { points: 15, status: "pass", reason: `"${primary}" is specific` };
}

// ---------- completeness (15) ----------
// Sub-points: phone 3 · services 3 · website 2 · hours present 2 ·
// hours sane 2 · attributes 2 · address 1 = 15.
function scoreCompleteness(input: AuditInput): RowResult {
  const p = input.profile;
  const missing: string[] = [];
  let points = 0;

  if (p.phone) points += 3;
  else missing.push("phone missing");

  if (p.services.length > 0) points += 3;
  else missing.push("services empty");

  if (p.website) points += 2;
  else missing.push("no website link");

  const hasHours = p.hours.length > 0;
  if (hasHours) points += 2;
  else missing.push("no hours");

  const hoursSane = hasHours && p.hours.every((h) => !h.anomaly);
  if (hoursSane) points += 2;
  else if (hasHours) missing.push("hours anomaly (12–9 AM)");

  if (Object.keys(p.attributes).length > 0) points += 2;
  else missing.push("no attributes");

  if (p.address) points += 1;
  else missing.push("no address");

  const critical = !p.phone || p.services.length === 0;
  return {
    points,
    status: critical ? "fail" : points === 15 ? "pass" : "warn",
    reason:
      missing.length === 0
        ? "All core fields are filled"
        : `Incomplete: ${missing.join(", ")}`,
  };
}

// ---------- photos (10) ----------
function scorePhotos(input: AuditInput): RowResult {
  const n = input.profile.photos_total;
  const reviewPhotos = input.reviews?.stats.with_photos ?? null;
  const noteReviewPhotos =
    reviewPhotos === 0 ? "; no customer review has a photo" : "";
  if (n === null) {
    return {
      points: 0,
      status: "fail",
      reason: "Photo count unavailable" + noteReviewPhotos,
    };
  }
  if (n === 0) return { points: 0, status: "fail", reason: "No photos on the profile" };
  if (n < 10) {
    return {
      points: 4,
      status: "warn",
      reason: `Only ${n} photos — top profiles keep 25+${noteReviewPhotos}`,
    };
  }
  if (n < 25) return { points: 6, status: "warn", reason: `${n} photos — aim for 25+` };
  if (n < 50) return { points: 8, status: "pass", reason: `${n} photos` };
  return { points: 10, status: "pass", reason: `${n} photos` };
}

// ---------- reviews_count (10) ----------
function scoreReviewsCount(input: AuditInput): RowResult {
  const n =
    input.reviews?.stats.total ?? input.profile.reviews_total ?? 0;
  if (n === 0) return { points: 0, status: "fail", reason: "No reviews yet" };
  if (n < 10) return { points: 2, status: "fail", reason: `Only ${n} reviews` };
  if (n < 25) return { points: 4, status: "warn", reason: `${n} reviews — below the local benchmark` };
  if (n < 50) return { points: 5, status: "warn", reason: `${n} reviews — competitive listings have 50+` };
  if (n < 100) return { points: 7, status: "pass", reason: `${n} reviews` };
  if (n < 200) return { points: 8, status: "pass", reason: `${n} reviews` };
  return { points: 10, status: "pass", reason: `${n} reviews` };
}

// ---------- reviews_velocity (8) ----------
function scoreReviewsVelocity(input: AuditInput): RowResult {
  const v = input.reviews?.stats.velocity_per_month_6m ?? 0;
  const shown = `${v}/month over the last 6 months`;
  if (v >= 4) return { points: 8, status: "pass", reason: shown };
  if (v >= 2) return { points: 6, status: "pass", reason: shown };
  if (v >= 1) {
    return { points: 3, status: "warn", reason: `Slow: ${shown} — ask happy customers for reviews` };
  }
  if (v > 0) return { points: 1, status: "fail", reason: `Nearly stalled: ${shown}` };
  return { points: 0, status: "fail", reason: "No recent reviews" };
}

// ---------- reply_rate (7) ----------
function scoreReplyRate(input: AuditInput): RowResult {
  if (!input.reviews || input.reviews.stats.total === 0) {
    return { points: 0, status: "fail", reason: "No reviews to reply to" };
  }
  const r = input.reviews.stats.reply_rate_pct;
  const shown = `${r}% of reviews get a reply`;
  if (r >= 80) return { points: 7, status: "pass", reason: shown };
  if (r >= 50) return { points: 5, status: "pass", reason: shown };
  if (r >= 25) return { points: 3, status: "warn", reason: shown };
  if (r > 0) {
    return {
      points: 1,
      status: "fail",
      reason: `Only ${r}% of reviews get a reply — replies are a ranking signal`,
    };
  }
  return { points: 0, status: "fail", reason: "Owner has never replied to a review" };
}

// ---------- posts (10) ----------
function scorePosts(input: AuditInput): RowResult {
  if (!input.posts) {
    return { points: 0, status: "fail", reason: "Post audit not run — no post data" };
  }
  const recent = input.posts.last_30d_count;
  const total = input.posts.stats.total;
  if (recent >= 4) return { points: 10, status: "pass", reason: `${recent} posts in the last 30 days` };
  if (recent >= 2) return { points: 7, status: "pass", reason: `${recent} posts in the last 30 days` };
  if (recent === 1) return { points: 5, status: "warn", reason: "Only 1 post in the last 30 days" };
  if (total > 0) {
    const cadence = input.posts.stats.days_per_post;
    return {
      points: 2,
      status: "fail",
      reason: `No posts in the last 30 days — ${total} posts ever${
        cadence ? `, one per ${cadence} days` : ""
      }`,
    };
  }
  return { points: 0, status: "fail", reason: "Never posted" };
}

// ---------- website (10) ----------
// present 4 · title ok 2 · meta ok 2 · owned domain (not rented) 2.
function scoreWebsite(input: AuditInput): RowResult {
  const url = input.profile.website;
  if (!url) {
    return {
      points: 0,
      status: "fail",
      reason: "No website linked (score renormalises in M1.5 when truly siteless)",
    };
  }
  const w = input.website;
  if (!w) {
    return {
      points: 4,
      status: "warn",
      reason: "Website linked — run the website audit for the full check",
    };
  }
  let points = 4;
  const problems: string[] = [];
  const titleOk = w.title.has_category && w.title.has_city;
  if (titleOk) points += 2;
  else problems.push("title tag misses category/city");
  const metaOk = w.meta.has_category && w.meta.has_locality;
  if (metaOk) points += 2;
  else problems.push("meta description misses category/locality");
  if (!w.rented_subdomain) points += 2;
  else problems.push(`rented subdomain (${w.provider})`);
  return {
    points,
    status: points === 10 ? "pass" : "warn",
    reason:
      problems.length === 0 ? "Linked, basics pass" : `Linked, but ${problems.join("; ")}`,
  };
}

// ---------- nap (5) ----------
// name 1 · address 2 · phone 2.
function scoreNap(input: AuditInput): RowResult {
  const rows = input.website?.nap ?? [];
  if (rows.length === 0) {
    return {
      points: 2,
      status: "warn",
      reason: "NAP not verified — no website audit data",
    };
  }
  const match = (field: string) =>
    rows.find((r) => r.field === field)?.match ?? false;
  let points = 0;
  const mismatches: string[] = [];
  if (match("name")) points += 1;
  else mismatches.push("name");
  if (match("address")) points += 2;
  else mismatches.push("address");
  if (match("phone")) points += 2;
  else mismatches.push("phone");
  if (mismatches.length === 0) {
    return { points, status: "pass", reason: "Name, address and phone match the website" };
  }
  const severe = mismatches.includes("name") || mismatches.includes("address");
  return {
    points,
    status: severe ? "fail" : "warn",
    reason: `GBP ↔ website mismatch: ${mismatches.join(", ")}`,
  };
}

export interface ScoreResult {
  scores: Omit<AuditScores, "audit_id">;
  band: ScoreBand;
  rubric: RubricRow[];
}

export function scoreAudit(input: AuditInput): ScoreResult {
  const rubric: RubricRow[] = [
    row("claimed", scoreClaimed(input)),
    row("category", scoreCategory(input)),
    row("completeness", scoreCompleteness(input)),
    row("photos", scorePhotos(input)),
    row("reviews_count", scoreReviewsCount(input)),
    row("reviews_velocity", scoreReviewsVelocity(input)),
    row("reply_rate", scoreReplyRate(input)),
    row("posts", scorePosts(input)),
    row("website", scoreWebsite(input)),
    row("nap", scoreNap(input)),
  ];

  const by = (key: RubricKey) => rubric.find((r) => r.key === key)!.points;
  const total = rubric.reduce((sum, r) => sum + r.points, 0);

  return {
    scores: {
      total,
      claimed: by("claimed"),
      category: by("category"),
      completeness: by("completeness"),
      photos: by("photos"),
      reviews_count: by("reviews_count"),
      reviews_velocity: by("reviews_velocity"),
      reply_rate: by("reply_rate"),
      posts: by("posts"),
      website: by("website"),
      nap: by("nap"),
    },
    band: bandFor(total),
    rubric,
  };
}
