import type { ReviewStats, ReviewTrendPoint } from "@/types";
import type { NormalizedReview, NormalizedReviews } from "./input";
import { buildKeywordCloud } from "./tokenizer";

/** MS1-T04 — review stats/trend for the LIVE path (the fixture path takes
 * these numbers from the GMB Everywhere summary table instead). */

const MS_PER_DAY = 86_400_000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function countSince(items: NormalizedReview[], ref: Date, days: number): number {
  const cutoff = ref.getTime() - days * MS_PER_DAY;
  return items.filter(
    (r) => r.review_ts !== null && Date.parse(r.review_ts) >= cutoff
  ).length;
}

export function computeReviewStats(
  items: NormalizedReview[],
  opts: {
    reference: Date;
    /** Google's displayed rating + total (profile), when known. */
    displayed_rating?: number | null;
    displayed_total?: number | null;
  }
): { stats: ReviewStats; avg_rating_actual: number | null } {
  const total = opts.displayed_total ?? items.length;
  const analyzed = items.length;
  const replied = items.filter((r) => r.replied).length;
  const rated = items.filter((r) => r.rating > 0);
  const avgActual =
    rated.length > 0
      ? round2(rated.reduce((s, r) => s + r.rating, 0) / rated.length)
      : null;

  const last30d = countSince(items, opts.reference, 30);
  const last6m = countSince(items, opts.reference, 182);
  const last1y = countSince(items, opts.reference, 365);

  const reviewerCounts = items
    .map((r) => r.author_review_count)
    .filter((n): n is number => n !== null);

  const stats: ReviewStats = {
    avg_rating: opts.displayed_rating ?? avgActual ?? 0,
    total,
    reply_rate_pct: analyzed > 0 ? round2((replied / analyzed) * 100) : 0,
    velocity_per_month_6m: round1(last6m / 6),
    velocity_per_month_1y: round1(last1y / 12),
    with_photos: items.filter((r) => r.has_photos).length,
    textless: items.filter((r) => !r.text || r.text.trim() === "").length,
    local_guides: items.filter((r) => r.is_local_guide).length,
    avg_reviews_per_reviewer:
      reviewerCounts.length > 0
        ? round2(reviewerCounts.reduce((a, b) => a + b, 0) / reviewerCounts.length)
        : 0,
    last_30d: last30d,
    last_6m: last6m,
    last_1y: last1y,
  };
  return { stats, avg_rating_actual: avgActual };
}

/** Cumulative trend (dates >1yr approximated — UI labels it). */
export function computeReviewTrend(items: NormalizedReview[]): ReviewTrendPoint[] {
  const dated = items
    .filter((r) => r.review_ts !== null)
    .sort((a, b) => (a.review_ts! < b.review_ts! ? -1 : 1));
  return dated.map((r, i) => ({
    date: r.review_ts as string,
    cumulative: i + 1,
    approximated: r.approximated,
  }));
}

export function buildNormalizedReviews(
  items: NormalizedReview[],
  opts: {
    reference: Date;
    displayed_rating?: number | null;
    displayed_total?: number | null;
  }
): NormalizedReviews {
  const { stats, avg_rating_actual } = computeReviewStats(items, opts);
  return {
    stats,
    avg_rating_actual,
    items,
    timeline: computeReviewTrend(items),
    cloud: buildKeywordCloud(items.map((r) => r.text)),
  };
}
