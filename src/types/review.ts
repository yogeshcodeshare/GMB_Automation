/** TB-006 reviews_cache + P6 Review Inbox shapes. */

export interface ReviewItem {
  id: number;
  business_id: string;
  review_id: string;
  rating: number;
  text: string | null;
  author: string | null;
  review_ts: string | null; // dates >1yr are approximated — UI must label this
  replied: boolean;
  /** Enrichment from audits.raw_snapshot (not TB-006 columns). */
  author_stats?: {
    review_count: number;
    photo_count: number;
    is_local_guide: boolean;
  };
  owner_reply?: string | null;
}

/** P6 KPI row + review-quality strip. */
export interface ReviewStats {
  avg_rating: number;
  total: number;
  reply_rate_pct: number;
  velocity_per_month_6m: number;
  velocity_per_month_1y: number;
  with_photos: number;
  textless: number;
  local_guides: number;
  avg_reviews_per_reviewer: number;
  last_30d: number;
  last_6m: number;
  last_1y: number;
}

/** Bilingual keyword cloud (MS1-T11 tokenizer: Marathi + Hinglish + English). */
export interface KeywordCloudItem {
  token: string;
  count: number;
  kind: "unigram" | "bigram";
}

export interface ReviewTrendPoint {
  date: string;
  cumulative: number;
  approximated: boolean; // >1yr old
}
