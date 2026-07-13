import type { KeywordCloudItem, ReviewStats, ReviewTrendPoint } from "@/types";
import type { NormalizedReview } from "@/server/audit/input";
import { findLine, parseTableAt } from "./md";

/** Parsed fixtures/ReviewAudit.md (GMB Everywhere "Review Audit" export). */
export interface ParsedReviewAudit {
  business_name: string | null;
  category: string | null;
  stats: ReviewStats;
  avg_rating_actual: number | null; // "Average of Google review rating" (4.93)
  replied_count: number;
  timeline: ReviewTrendPoint[];
  unigrams: KeywordCloudItem[];
  bigrams: KeywordCloudItem[];
  reviews: NormalizedReview[];
}

const MS_PER_DAY = 86_400_000;

function usDateToIso(value: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function firstNumber(s: string): number | null {
  const m = /-?\d+(?:\.\d+)?/.exec(s.replace(/,/g, ""));
  return m ? Number(m[0]) : null;
}

/**
 * "a week ago" / "2 months ago" / "3 years ago" → approximate ISO date
 * relative to the report date. Google only gives relative dates; anything in
 * years is approximated to within the year (the UI must label this).
 */
export function relativeDateToIso(
  relative: string,
  reference: Date
): { iso: string | null; approximated: boolean } {
  const m = /^(a|an|\d+)\s+(day|week|month|year)s?\s+ago$/i.exec(relative.trim());
  if (!m) return { iso: null, approximated: false };
  const n = /^(a|an)$/i.test(m[1]) ? 1 : Number(m[1]);
  const unit = m[2].toLowerCase();
  const d = new Date(reference.getTime());
  if (unit === "day") d.setUTCDate(d.getUTCDate() - n);
  else if (unit === "week") d.setUTCDate(d.getUTCDate() - n * 7);
  else if (unit === "month") d.setUTCMonth(d.getUTCMonth() - n);
  else d.setUTCFullYear(d.getUTCFullYear() - n);
  return { iso: d.toISOString().slice(0, 10), approximated: unit === "year" };
}

/** "(Local Guide) 248 reviews • 1659 photos" / "1 reviews • 0 photos" */
function parseReviewerStats(cell: string): {
  is_local_guide: boolean;
  review_count: number | null;
  photo_count: number | null;
} {
  const is_local_guide = /local guide/i.test(cell);
  const m = /(\d+)\s*reviews?\s*[•·]\s*(\d+)\s*photos?/i.exec(cell);
  return {
    is_local_guide,
    review_count: m ? Number(m[1]) : null,
    photo_count: m ? Number(m[2]) : null,
  };
}

function keywordRows(rows: string[][], kind: "unigram" | "bigram"): KeywordCloudItem[] {
  return rows
    .filter((r) => r.length >= 2 && r[0] !== "")
    .map((r) => ({ token: r[0], count: Number(r[1]) || 0, kind }));
}

export function parseReviewAudit(
  md: string,
  opts: { reportDate: string } // ISO, e.g. "2026-07-11" (BasicAudit "Generated")
): ParsedReviewAudit {
  const lines = md.split(/\r?\n/);
  const reference = new Date(`${opts.reportDate}T00:00:00Z`);

  const nameMatch = /^\*\*Business:\*\*\s*(.+)$/m.exec(md);
  const categoryMatch = /^\*\*Category:\*\*\s*(.+)$/m.exec(md);

  // ---- Section 1 summary table ----
  const summaryStart = findLine(lines, /^##\s+Section 1: Summary/);
  const { rows: summaryRows } = parseTableAt(lines, summaryStart + 1);
  const metric = (label: RegExp): string | null => {
    const row = summaryRows.find((r) => label.test(r[0] ?? ""));
    return row ? row[1] : null;
  };

  const total = firstNumber(metric(/^Total number of reviews/i) ?? "") ?? 0;
  const googleRating = firstNumber(metric(/^Google rating/i) ?? "");
  const avgActual = firstNumber(metric(/^Average of Google review rating/i) ?? "");
  const withPhotos = firstNumber(metric(/reviews with photos/i) ?? "") ?? 0;
  const textless = firstNumber(metric(/without any text/i) ?? "") ?? 0;
  const localGuides = firstNumber(metric(/Local Guides/i) ?? "") ?? 0;
  const avgPerReviewer =
    firstNumber(metric(/Average number of reviews given/i) ?? "") ?? 0;

  const respondedCell = metric(/received a response/i) ?? "";
  const repliedCount = firstNumber(respondedCell) ?? 0;
  const replyRateMatch = /\(([\d.]+)%\)/.exec(respondedCell);
  const replyRatePct = replyRateMatch ? Number(replyRateMatch[1]) : 0;

  const last30d = firstNumber(metric(/last 30 days/i) ?? "") ?? 0;
  const last6mCell = metric(/last 6 months/i) ?? "";
  const last6m = firstNumber(last6mCell) ?? 0;
  const vel6m = /avg\.\s*([\d.]+)\/month/.exec(last6mCell);
  const last1yCell = metric(/last 1 year/i) ?? "";
  const last1y = firstNumber(last1yCell) ?? 0;
  const vel1y = /avg\.\s*([\d.]+)\/month/.exec(last1yCell);

  // ---- Review timeline ----
  const timelineStart = findLine(lines, /Review Timeline/);
  const { rows: timelineRows } = parseTableAt(lines, timelineStart + 1);
  const oneYearBefore = new Date(reference.getTime());
  oneYearBefore.setUTCFullYear(oneYearBefore.getUTCFullYear() - 1);
  const timeline: ReviewTrendPoint[] = timelineRows
    .map((r) => {
      const iso = usDateToIso(r[0] ?? "");
      if (!iso) return null;
      return {
        date: iso,
        cumulative: Number(r[1]) || 0,
        approximated:
          new Date(`${iso}T00:00:00Z`).getTime() < oneYearBefore.getTime(),
      };
    })
    .filter((p): p is ReviewTrendPoint => p !== null);

  // ---- Keyword tables ----
  const uniStart = findLine(lines, /Most frequent single words/i);
  const { rows: uniRows } = parseTableAt(lines, uniStart + 1);
  const biStart = findLine(lines, /Most frequent two-word phrases/i);
  const { rows: biRows } = parseTableAt(lines, biStart + 1);

  // ---- Individual reviews ----
  const reviewsStart = findLine(lines, /^###\s+Individual Reviews/);
  const { rows: reviewRows } = parseTableAt(lines, reviewsStart + 1);
  const reviews: NormalizedReview[] = reviewRows
    .filter((r) => r.length >= 6 && /^\d+$/.test(r[0]))
    .map((r) => {
      // | # | Rating | Reviewer | Reviewer Stats | Review… | Date |
      // A review containing "|" splits into extra cells — re-join the middle.
      const idx = Number(r[0]);
      const ratingMatch = /\((\d)\)/.exec(r[1]);
      const reviewer = r[2];
      const reviewerStats = parseReviewerStats(r[3]);
      const dateCell = r[r.length - 1];
      const text = r.slice(4, r.length - 1).join(" | ").trim();
      const when = relativeDateToIso(dateCell, reference);
      return {
        review_id: `fixture-r${String(idx).padStart(2, "0")}`,
        rating: ratingMatch ? Number(ratingMatch[1]) : 0,
        text: text || null,
        author: reviewer || null,
        review_ts: when.iso,
        approximated: when.approximated,
        replied: false, // filled from the owner-responses section below
        owner_reply: null,
        // Per-review photos aren't in the export's table; the summary says 0
        // reviews have photos, so false is exact for this fixture.
        has_photos: false,
        author_review_count: reviewerStats.review_count,
        author_photo_count: reviewerStats.photo_count,
        is_local_guide: reviewerStats.is_local_guide,
      };
    });

  // ---- Owner responses ("> **Review #9 — …:** … (owner) — …: Thank you...") ----
  const responsesStart = findLine(lines, /^###\s+Business Responses/);
  if (responsesStart !== -1) {
    for (let i = responsesStart + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t.startsWith("## ") || t.startsWith("### ")) break;
      const m = /^>\s*\*\*Review #(\d+)[^*]*\*\*(.*)$/.exec(t);
      if (!m) continue;
      const idx = Number(m[1]);
      const review = reviews.find((r) => r.review_id.endsWith(String(idx).padStart(2, "0")));
      if (review) {
        review.replied = true;
        // Reply text = everything after the last "ago:" marker.
        const replyMatch = /ago:\s*(.+)$/.exec(m[2]);
        review.owner_reply = replyMatch ? replyMatch[1].trim() : null;
      }
    }
  }

  const stats: ReviewStats = {
    avg_rating: googleRating ?? 0,
    total,
    reply_rate_pct: replyRatePct,
    velocity_per_month_6m: vel6m ? Number(vel6m[1]) : 0,
    velocity_per_month_1y: vel1y ? Number(vel1y[1]) : 0,
    with_photos: withPhotos,
    textless,
    local_guides: localGuides,
    avg_reviews_per_reviewer: avgPerReviewer,
    last_30d: last30d,
    last_6m: last6m,
    last_1y: last1y,
  };

  return {
    business_name: nameMatch ? nameMatch[1].trim() : null,
    category: categoryMatch ? categoryMatch[1].trim() : null,
    stats,
    avg_rating_actual: avgActual,
    replied_count: repliedCount,
    timeline,
    unigrams: keywordRows(uniRows, "unigram"),
    bigrams: keywordRows(biRows, "bigram"),
    reviews,
  };
}
