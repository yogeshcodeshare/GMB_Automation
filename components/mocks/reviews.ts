import type {
  KeywordCloudItem,
  Language,
  ReviewItem,
  ReviewStats,
  ReviewTrendPoint,
} from "@/types";
import { auditReportMock } from "./audit-report";

/**
 * Typed mock of `GET /api/reviews/:businessId` — the Manovedh fixture's
 * 6-review demo sample (of 30). All values verbatim from the design
 * prototype. Swapped for the real route on Day 5.
 */

const BIZ = auditReportMock.business.id;

export const reviewsMock: ReviewItem[] = [
  {
    id: 1,
    business_id: BIZ,
    review_id: "rev-sandip",
    rating: 5,
    author: "Sandip Jadhav",
    review_ts: "2026-07-06T10:00:00+05:30", // a week ago
    replied: false,
    text: "Khupach Chan Anubhav Ala. kityek varshapasun asanarya samasya sahaj nighun gelya… Thank you doctor saheb.",
    author_stats: { review_count: 1, photo_count: 0, is_local_guide: false },
  },
  {
    id: 2,
    business_id: BIZ,
    review_id: "rev-anirudha",
    rating: 3,
    author: "Anirudha Patil",
    review_ts: "2025-07-10T10:00:00+05:30", // a year ago (approximated)
    replied: false,
    text: "Hypnotism clinic, we tried once.",
    author_stats: { review_count: 248, photo_count: 31, is_local_guide: true },
  },
  {
    id: 3,
    business_id: BIZ,
    review_id: "rev-rutuja",
    rating: 5,
    author: "Rutuja P.",
    review_ts: "2026-05-12T10:00:00+05:30", // 2 months ago
    replied: true,
    text: "Khup chan anubhav. Sir khup shant ani samjun ghenare aahet. Best clinic in Karad!",
    owner_reply: "मनःपूर्वक धन्यवाद, रुतुजा!",
    author_stats: { review_count: 56, photo_count: 4, is_local_guide: true },
  },
  {
    id: 4,
    business_id: BIZ,
    review_id: "rev-mahesh",
    rating: 5,
    author: "Mahesh Kulkarni",
    review_ts: "2026-03-10T10:00:00+05:30", // 4 months ago
    replied: false,
    text: "Sir samjun ghetat, ekdam positive result. Anxiety khup kami zali.",
    author_stats: { review_count: 3, photo_count: 0, is_local_guide: false },
  },
  {
    id: 5,
    business_id: BIZ,
    review_id: "rev-priya",
    rating: 5,
    author: "Priya S.",
    review_ts: "2025-11-10T10:00:00+05:30", // 8 months ago
    replied: false,
    text: "Best mental health clinic in Karad. Highly recommended!",
    author_stats: { review_count: 2, photo_count: 0, is_local_guide: false },
  },
  {
    id: 6,
    business_id: BIZ,
    review_id: "rev-vikram",
    rating: 5,
    author: "Vikram More",
    review_ts: "2025-06-20T10:00:00+05:30", // a year ago (approximated)
    replied: true,
    text: "छान अनुभव. मनापासून धन्यवाद सर.",
    owner_reply: "धन्यवाद विक्रमजी!",
    author_stats: { review_count: 112, photo_count: 18, is_local_guide: true },
  },
];

/** P6 KPI row + quality strip — same object EP-002 embeds. */
export const reviewStatsMock: ReviewStats = auditReportMock.review_stats!;

/** Bilingual keyword cloud (MS1-T11 tokenizer output). */
export const keywordCloudMock: KeywordCloudItem[] = [
  { token: "experience", count: 15, kind: "unigram" },
  { token: "best", count: 14, kind: "unigram" },
  { token: "chan anubhav", count: 8, kind: "bigram" },
  { token: "doctor saheb", count: 5, kind: "bigram" },
  { token: "shant", count: 4, kind: "unigram" },
  { token: "mental health", count: 3, kind: "bigram" },
];

/** Cumulative trend — dates >1yr old are approximated by Google (label it). */
export const reviewTrendMock: ReviewTrendPoint[] = [
  { date: "2021-07-01", cumulative: 0, approximated: true },
  { date: "2022-07-01", cumulative: 3, approximated: true },
  { date: "2023-07-01", cumulative: 8, approximated: true },
  { date: "2024-07-01", cumulative: 12, approximated: true },
  { date: "2025-07-01", cumulative: 18, approximated: true },
  { date: "2026-01-01", cumulative: 24, approximated: false },
  { date: "2026-07-13", cumulative: 30, approximated: false },
];

/**
 * Filter chips — counts come from the FULL 30-review set server-side
 * (the 6 above are the demo sample; production derives these).
 */
export const reviewFiltersMock = [
  { key: "all", label: "All 30" },
  { key: "pending", label: "Pending 28" },
  { key: "5", label: "5★ 28" },
  { key: "low", label: "≤3★ 1" },
  { key: "replied", label: "Replied 2" },
  { key: "kw", label: '"anubhav" ×8' },
] as const;

export type ReviewFilterKey = (typeof reviewFiltersMock)[number]["key"];

/** review_ids matching the '"anubhav" ×8' keyword chip in the demo sample. */
export const anubhavReviewIds = new Set(["rev-sandip", "rev-rutuja"]);

/**
 * Reviews that arrive with an AI draft already prepared (P6 demo state).
 * `text` is the pre-generated draft (Devanagari name form); changing
 * language/tone regenerates via draftReplyMock instead.
 */
export const initialDraftsMock: Record<
  string,
  { lang: "mr" | "en"; tone: "Warm" | "Professional"; text: string }
> = {
  "rev-sandip": {
    lang: "mr",
    tone: "Warm",
    text: "धन्यवाद संदीपजी! तुमच्या विश्वासाबद्दल मनःपूर्वक आभार. काळजी घ्या 🙏",
  },
  "rev-anirudha": {
    lang: "en",
    tone: "Professional",
    text: "Thank you for visiting us, Anirudha. If there is anything we could have done better, we would genuinely like to hear it — please call us anytime.",
  },
};

/**
 * Simulates EP-005 reply drafting (OpenRouter free model on Day 5):
 * personalised with the reviewer's first name; `variant` alternates on
 * Regenerate. Language limited to mr/en here (P6's selector); Language
 * type also allows "hinglish" (P8).
 */
export function draftReplyMock(
  author: string,
  lang: Extract<Language, "mr" | "en">,
  tone: "Warm" | "Professional",
  variant: 0 | 1,
): string {
  const first = author.split(" ")[0];
  const RPL = {
    mr: {
      Warm: [
        `धन्यवाद ${first}जी! तुमच्या विश्वासाबद्दल मनःपूर्वक आभार. काळजी घ्या 🙏`,
        `खूप खूप धन्यवाद ${first}जी! तुमच्या शब्दांमुळे आम्हाला प्रोत्साहन मिळते. पुन्हा भेटूया 🙏`,
      ],
      Professional: [
        `नमस्कार ${first}, तुमच्या अभिप्रायाबद्दल धन्यवाद. आपल्या सेवेत सातत्याने सुधारणा करत राहू.`,
        `धन्यवाद ${first}. तुमचा अभिप्राय आमच्यासाठी मौल्यवान आहे.`,
      ],
    },
    en: {
      Warm: [
        `Thank you so much, ${first}! Your trust means a lot to us. Take care 🙏`,
        `So glad to hear this, ${first}! Thank you for the kind words 🙏`,
      ],
      Professional: [
        `Thank you for your feedback, ${first}. We appreciate you taking the time to share it — please reach out anytime.`,
        `We appreciate your review, ${first}. Thank you for choosing us.`,
      ],
    },
  };
  return RPL[lang][tone][variant];
}

/** P6 review-quality strip (fake-pattern checks). */
export const reviewQualityStripMock = [
  { value: "0", label: "reviews without text" },
  { value: "1", label: "Local Guides" },
  { value: "9.87", label: "avg reviews / reviewer" },
  { value: "1", label: "last 30 days" },
  { value: "7", label: "last 6 months" },
  { value: "15", label: "last 1 year" },
];
