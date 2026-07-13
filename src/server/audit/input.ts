import type {
  ContentDepthBand,
  HeadingNode,
  KeywordCloudItem,
  NapMatchRow,
  PostAuditStats,
  PostTimelineBucket,
  ReviewStats,
  ReviewTrendPoint,
} from "@/types";

/**
 * Normalized audit input — the ONE shape score.service and the sanity checks
 * consume. Two producers: the fixture parser (src/server/fixtures) and the
 * live DataForSEO normalizer (src/server/dataforseo/normalize.ts), so the
 * Manovedh exit test exercises exactly the code path live audits use.
 */

export interface NormalizedHoursDay {
  day: string; // "Monday".."Sunday"
  text: string; // as displayed, e.g. "12–9 am; 10 am–12 am"
  anomaly: boolean;
}

export interface NormalizedProfile {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  claimed: boolean;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviews_total: number | null;
  place_id: string | null;
  cid: string | null;
  kg_id: string | null;
  profile_id: string | null;
  categories: { primary: string | null; secondary: string[] };
  services: string[];
  attributes: Record<string, string[]>;
  hours: NormalizedHoursDay[];
  /** GBP photo count (my_business_info total_photos). Not present in the
   * GMB Everywhere fixture exports — the Manovedh test injects a constant. */
  photos_total: number | null;
  description: string | null;
  city: string | null;
}

export interface NormalizedReview {
  review_id: string;
  rating: number;
  text: string | null;
  author: string | null;
  review_ts: string | null; // ISO
  approximated: boolean; // dates >1yr are approximated — UI must label this
  replied: boolean;
  owner_reply: string | null;
  author_review_count: number | null;
  author_photo_count: number | null;
  is_local_guide: boolean;
}

export interface NormalizedReviews {
  stats: ReviewStats;
  /** Average of the individual ratings (fixture: 4.93 vs displayed 4.9). */
  avg_rating_actual: number | null;
  items: NormalizedReview[];
  timeline: ReviewTrendPoint[];
  cloud: KeywordCloudItem[];
}

export interface NormalizedPost {
  post_ts: string | null; // ISO
  text: string | null;
  char_count: number | null;
  has_media: boolean;
  media_type: "image" | "video" | null;
  links: number;
}

export interface NormalizedPosts {
  stats: PostAuditStats;
  items: NormalizedPost[];
  timeline: PostTimelineBucket[];
  last_post_ts: string | null;
  last_30d_count: number;
}

/** Website findings feeding the rubric's website + nap rows (fixture now;
 * EP-014 crawler emits the same shape in M1.5). */
export interface WebsiteFindings {
  url: string;
  rented_subdomain: boolean;
  provider: string | null; // e.g. "grexa.site"
  nap: NapMatchRow[];
  title: { value: string | null; has_category: boolean; has_city: boolean };
  meta: {
    value: string | null;
    has_category: boolean;
    has_locality: boolean;
    ai_suggestions: string[];
  };
  local_keywords: Array<{ keyword: string; found: boolean; snippets: string[] }>;
  hours_match: Array<{ day: string; gbp: string; website: string; match: boolean }>;
  category_pages: Array<{ category: string; matched_page: string | null }>;
  content_depth: { word_count: number; band: ContentDepthBand };
  spelling_issues: Array<{ found: string; suggested: string; location: string }>;
  headings: HeadingNode[];
  heading_skips: string[]; // e.g. ["H2→H5"]
  click_to_call: "ok" | "missing" | "not_applicable";
}

export interface CompetitorSnapshot {
  name: string;
  primary_category: string | null;
  rating: number | null;
  reviews_total: number | null;
  distance_km: number | null;
  photos: number | null;
  cid: string | null;
  place_id: string | null;
}

export interface AuditInput {
  profile: NormalizedProfile;
  reviews: NormalizedReviews | null; // null = review pull failed/skipped
  posts: NormalizedPosts | null; // null = post audit not run
  website: WebsiteFindings | null; // null = no website audit (renormalise, M1.5)
  competitors: CompetitorSnapshot[];
}

/** Most common primary category among competitors (rubric §2.5 "vs competitor mode"). */
export function competitorCategoryMode(
  competitors: CompetitorSnapshot[]
): string | null {
  const counts = new Map<string, number>();
  for (const c of competitors) {
    if (!c.primary_category) continue;
    counts.set(c.primary_category, (counts.get(c.primary_category) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  counts.forEach((n, cat) => {
    if (n > bestCount) {
      best = cat;
      bestCount = n;
    }
  });
  return best;
}
