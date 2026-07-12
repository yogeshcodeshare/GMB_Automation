/** TB-012 posts_cache + P7 Post Audit shapes. */

export interface PostItem {
  id: number;
  business_id: string;
  post_ts: string | null;
  text: string | null;
  char_count: number | null;
  has_media: boolean;
  links: number;
}

/** P7 metric cards (parity §1.3d). */
export interface PostAuditStats {
  total: number;
  days_per_post: number | null; // null when <2 posts
  avg_chars: number | null;
  avg_words: number | null;
  with_image: number;
  with_link: number;
  with_video: number;
}

/** P7 timeline — quarterly bars + cumulative line. */
export interface PostTimelineBucket {
  quarter: string; // e.g. "Q4'20"
  count: number;
  cumulative: number;
}
