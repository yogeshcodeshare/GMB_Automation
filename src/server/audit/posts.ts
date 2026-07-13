import type { PostAuditStats, PostTimelineBucket } from "@/types";
import type { NormalizedPost } from "./input";

/** MS1-T05 — post frequency/timeline stats (P7 metric cards + chart). */

const MS_PER_DAY = 86_400_000;

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function computePostStats(items: NormalizedPost[]): PostAuditStats {
  const total = items.length;
  const timestamps = items
    .map((p) => (p.post_ts ? Date.parse(p.post_ts) : NaN))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  let days_per_post: number | null = null;
  if (timestamps.length >= 2) {
    const spanDays =
      (timestamps[timestamps.length - 1] - timestamps[0]) / MS_PER_DAY;
    days_per_post = Math.round(spanDays / (timestamps.length - 1));
  }

  const chars = items.map((p) => p.char_count ?? (p.text ? p.text.length : 0));
  const words = items.map((p) => wordCount(p.text));

  return {
    total,
    days_per_post,
    avg_chars:
      total > 0 ? Math.round(chars.reduce((a, b) => a + b, 0) / total) : null,
    avg_words:
      total > 0
        ? Math.round((words.reduce((a, b) => a + b, 0) / total) * 10) / 10
        : null,
    with_image: items.filter((p) => p.has_media && p.media_type !== "video").length,
    with_link: items.filter((p) => p.links > 0).length,
    with_video: items.filter((p) => p.media_type === "video").length,
  };
}

function quarterLabel(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q}'${String(d.getUTCFullYear() % 100).padStart(2, "0")}`;
}

/** Quarterly bars + cumulative line, contiguous from first to last post. */
export function computePostTimeline(items: NormalizedPost[]): PostTimelineBucket[] {
  const dates = items
    .map((p) => (p.post_ts ? new Date(p.post_ts) : null))
    .filter((d): d is Date => d !== null && Number.isFinite(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return [];

  const counts = new Map<string, number>();
  for (const d of dates) {
    const label = quarterLabel(d);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const buckets: PostTimelineBucket[] = [];
  const cursor = new Date(
    Date.UTC(
      dates[0].getUTCFullYear(),
      Math.floor(dates[0].getUTCMonth() / 3) * 3,
      1
    )
  );
  const last = dates[dates.length - 1];
  let cumulative = 0;
  while (cursor.getTime() <= last.getTime()) {
    const label = quarterLabel(cursor);
    const count = counts.get(label) ?? 0;
    cumulative += count;
    buckets.push({ quarter: label, count, cumulative });
    cursor.setUTCMonth(cursor.getUTCMonth() + 3);
  }
  return buckets;
}

export function countLast30d(items: NormalizedPost[], reference: Date): number {
  const cutoff = reference.getTime() - 30 * MS_PER_DAY;
  return items.filter(
    (p) => p.post_ts !== null && Date.parse(p.post_ts) >= cutoff
  ).length;
}

export function lastPostTs(items: NormalizedPost[]): string | null {
  const ts = items
    .map((p) => p.post_ts)
    .filter((t): t is string => t !== null)
    .sort();
  return ts.length > 0 ? ts[ts.length - 1] : null;
}
