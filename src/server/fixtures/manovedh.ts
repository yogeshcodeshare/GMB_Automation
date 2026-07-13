import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  AuditInput,
  NormalizedPost,
  NormalizedPosts,
  WebsiteFindings,
} from "@/server/audit/input";
import {
  computePostTimeline,
  countLast30d,
  lastPostTs,
} from "@/server/audit/posts";
import { detectRentedSubdomain } from "@/server/audit/sanity";
import type { PostAuditStats } from "@/types";
import { parseBasicAudit, type ParsedBasicAudit } from "./basic";
import { parseReviewAudit, type ParsedReviewAudit } from "./review";
import { parseWebsiteAudit, type ParsedWebsiteAudit } from "./website";

/**
 * Manovedh acceptance fixture (M1 exit test, CLAUDE.md).
 *
 * Post-audit numbers are NOT derivable from fixtures/*.md — the founder's
 * Post Audit export exists only as a PNG. Per docs/agents/BACKEND_BRIEF.md
 * they are asserted against these constants (blueprint §1.3d), which the
 * seed's posts_cache rows mirror.
 */
export const MANOVEDH_POST_STATS: PostAuditStats = {
  total: 7,
  days_per_post: 293, // "one post per 293 days"
  avg_chars: 171,
  avg_words: 26.4,
  with_image: 4,
  with_link: 1,
  with_video: 0,
};

/** The seed's posts_cache rows (supabase/migrations/20260712000002_seed.sql). */
export const MANOVEDH_POSTS: NormalizedPost[] = [
  { post_ts: "2020-11-15T10:00:00+05:30", text: "मनोवेध हिप्नोक्लिनिक — संमोहन उपचाराने भीती, टेंशन आणि नैराश्यातून कायमची मुक्ती. आजच अपॉइंटमेंट घ्या.", char_count: 156, has_media: true, media_type: "image", links: 0 },
  { post_ts: "2021-06-10T10:00:00+05:30", text: "झोप न लागणे, नकारात्मक विचार, आत्मविश्वासाची कमतरता? गोळ्या-औषधांशिवाय उपचार. NLP आणि EFT तंत्राने मानसिक आरोग्य सुधारा. संपर्कासाठी प्रोफाइल पहा.", char_count: 204, has_media: true, media_type: "image", links: 0 },
  { post_ts: "2022-01-20T10:00:00+05:30", text: "नवीन वर्षात नवी सुरुवात — व्यसनमुक्तीसाठी संमोहन उपचार. मोफत सल्ला.", char_count: 98, has_media: false, media_type: null, links: 0 },
  { post_ts: "2022-09-05T10:00:00+05:30", text: "विद्यार्थ्यांसाठी खास — एकाग्रता, स्मरणशक्ती आणि अभ्यासातील प्रगतीसाठी Student Development Program. मर्यादित जागा.", char_count: 187, has_media: true, media_type: "image", links: 0 },
  { post_ts: "2023-04-18T10:00:00+05:30", text: "वैवाहिक आणि कौटुंबिक समस्यांवर समुपदेशन. १५+ वर्षांचा अनुभव. आमच्या वेबसाइटला भेट द्या: https://nlp-eft.grexa.site/", char_count: 240, has_media: false, media_type: null, links: 1 },
  { post_ts: "2024-02-02T10:00:00+05:30", text: "प्राणीक हीलींग सत्रे आता उपलब्ध. आजच बुक करा.", char_count: 120, has_media: false, media_type: null, links: 0 },
  { post_ts: "2025-08-30T10:00:00+05:30", text: "मानसिक आरोग्य हीच खरी संपत्ती. भीती, चिंता, नैराश्य — कोणत्याही समस्येसाठी मनोवेध हिप्नोक्लिनिक, कराड. अपॉइंटमेंटसाठी आजच संपर्क करा.", char_count: 192, has_media: true, media_type: "image", links: 0 },
];

/** GBP photo count — also not in the GMB Everywhere export. §1.3d demo value;
 * lands in the same rubric bucket as the seed's photos score (4/10). */
export const MANOVEDH_PHOTOS_TOTAL = 5;

export const MANOVEDH_CITY = "Karad";

export interface ManovedhFixtureFiles {
  basic: string;
  review: string;
  website: string;
}

export function readManovedhFixtureFiles(
  dir = path.join(process.cwd(), "fixtures")
): ManovedhFixtureFiles {
  return {
    basic: readFileSync(path.join(dir, "BasicAudit.md"), "utf-8"),
    review: readFileSync(path.join(dir, "ReviewAudit.md"), "utf-8"),
    website: readFileSync(path.join(dir, "WebsiteAudit.md"), "utf-8"),
  };
}

function buildWebsiteFindings(
  parsed: ParsedWebsiteAudit,
  url: string,
  primaryCategory: string | null,
  city: string | null
): WebsiteFindings {
  const rented = detectRentedSubdomain(url);
  const isCategory = (term: string) =>
    primaryCategory !== null &&
    term.toLowerCase() === primaryCategory.toLowerCase();
  const isCity = (term: string) =>
    city !== null && term.toLowerCase() === city.toLowerCase();

  const titleCategory = parsed.title.checks.find((c) => isCategory(c.term));
  const titleCity = parsed.title.checks.find((c) => isCity(c.term));
  const metaCategory = parsed.meta.checks.find((c) => isCategory(c.term));
  const metaLocality = parsed.meta.checks.find((c) => !isCategory(c.term));

  return {
    url,
    rented_subdomain: rented.rented,
    provider: rented.provider,
    nap: parsed.nap,
    title: {
      value: parsed.title.value,
      has_category: titleCategory?.found ?? false,
      has_city: titleCity?.found ?? false,
    },
    meta: {
      value: parsed.meta.value,
      has_category: metaCategory?.found ?? false,
      has_locality: metaLocality?.found ?? false,
      ai_suggestions: parsed.meta.suggestions,
    },
    local_keywords: parsed.local_keywords,
    hours_match: parsed.hours_match,
    category_pages: parsed.category_pages,
    content_depth: parsed.content_depth,
    spelling_issues: parsed.spelling_issues,
    headings: parsed.headings,
    heading_skips: parsed.heading_skips,
    click_to_call: parsed.click_to_call,
  };
}

export interface ParsedManovedhFixture {
  basic: ParsedBasicAudit;
  review: ParsedReviewAudit;
  website: ParsedWebsiteAudit;
  input: AuditInput;
}

/** Parse the three fixture exports and assemble the normalized AuditInput —
 * the exact shape a live DataForSEO audit produces. */
export function parseManovedhFixture(
  files: ManovedhFixtureFiles
): ParsedManovedhFixture {
  const basic = parseBasicAudit(files.basic);
  const reportDate = basic.generated ?? "2026-07-11";
  const review = parseReviewAudit(files.review, { reportDate });
  const website = parseWebsiteAudit(files.website);

  const primary = basic.categories[0] ?? null;

  const posts: NormalizedPosts = {
    stats: MANOVEDH_POST_STATS,
    items: MANOVEDH_POSTS,
    timeline: computePostTimeline(MANOVEDH_POSTS),
    last_post_ts: lastPostTs(MANOVEDH_POSTS),
    last_30d_count: countLast30d(
      MANOVEDH_POSTS,
      new Date(`${reportDate}T00:00:00Z`)
    ),
  };

  const input: AuditInput = {
    profile: {
      name: basic.name,
      address: basic.address,
      phone: basic.phone,
      website: basic.website,
      claimed: basic.claimed,
      lat: basic.lat,
      lng: basic.lng,
      rating: basic.rating,
      reviews_total: basic.reviews_total,
      place_id: basic.place_id,
      cid: basic.cid,
      kg_id: basic.kg_id,
      profile_id: basic.profile_id,
      categories: { primary, secondary: basic.categories.slice(1) },
      services: basic.services,
      attributes: basic.attributes,
      hours: basic.hours,
      photos_total: MANOVEDH_PHOTOS_TOTAL,
      description: null,
      city: MANOVEDH_CITY,
    },
    reviews: {
      stats: review.stats,
      avg_rating_actual: review.avg_rating_actual,
      items: review.reviews,
      timeline: review.timeline,
      cloud: [...review.unigrams, ...review.bigrams],
    },
    posts,
    website: basic.website
      ? buildWebsiteFindings(website, basic.website, primary, MANOVEDH_CITY)
      : null,
    competitors: [],
  };

  return { basic, review, website, input };
}

export function loadManovedhFixture(dir?: string): ParsedManovedhFixture {
  return parseManovedhFixture(readManovedhFixtureFiles(dir));
}
