import type { PostAuditStats, PostItem, PostTimelineBucket } from "@/types";
import { auditReportMock } from "./audit-report";

/**
 * Typed mock of EP-013 `POST /api/posts-audit` response — the Manovedh
 * fixture's 7 posts (§1.3d: one per 293 days, 171 chars / 26.4 words,
 * 4 img / 1 link / 0 video). Verbatim from the design prototype. Swapped
 * for the real route on Day 5.
 */

const BIZ = auditReportMock.business.id;

/** Same object EP-002 embeds — single source for the stats. */
export const postStatsMock: PostAuditStats = auditReportMock.post_stats!;

export const postsMock: PostItem[] = [
  { id: 1, business_id: BIZ, post_ts: "2025-09-12T10:00:00+05:30", text: "मानसिक तणावातून मुक्ती — संमोहन उपचारांबद्दल जाणून घ्या", char_count: 214, has_media: true, links: 0 },
  { id: 2, business_id: BIZ, post_ts: "2025-03-03T10:00:00+05:30", text: "NLP basics — नवीन बॅच सुरू होत आहे", char_count: 142, has_media: true, links: 0 },
  { id: 3, business_id: BIZ, post_ts: "2024-08-18T10:00:00+05:30", text: "स्वातंत्र्यदिनाच्या शुभेच्छा! क्लिनिक १६ ऑगस्टपासून सुरू", char_count: 168, has_media: true, links: 0 },
  { id: 4, business_id: BIZ, post_ts: "2023-11-02T10:00:00+05:30", text: "दिवाळीच्या हार्दिक शुभेच्छा — नवीन वर्षात तणावमुक्त राहा", char_count: 187, has_media: true, links: 0 },
  { id: 5, business_id: BIZ, post_ts: "2022-12-15T10:00:00+05:30", text: "हिवाळी शिबिर — तणावमुक्तीसाठी विशेष सत्रे", char_count: 156, has_media: false, links: 1 },
  { id: 6, business_id: BIZ, post_ts: "2021-06-20T10:00:00+05:30", text: "EFT थेरपी म्हणजे काय? जाणून घ्या", char_count: 131, has_media: false, links: 0 },
  { id: 7, business_id: BIZ, post_ts: "2020-12-28T10:00:00+05:30", text: "मनोवेध हिप्नोक्लिनिक — आता कराडमध्ये", char_count: 199, has_media: false, links: 0 },
];

/** 20 quarters, Q4'20 → Q3'25; counts sum to 7, cumulative ends at 7. */
export const postTimelineMock: PostTimelineBucket[] = (() => {
  const counts = [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1];
  let cum = 0;
  return counts.map((count, i) => {
    cum += count;
    const quarter = `Q${((i + 3) % 4) + 1}'${20 + Math.floor((i + 3) / 4)}`;
    return { quarter, count, cumulative: cum };
  });
})();

/**
 * "Compare vs competitor" contrast card (display mock — competitor post
 * stats come from the audit's competitor pull on Day 5).
 */
export const postCompareMock = {
  competitor: "Hypnotherapy Siddhivinayak Ngr",
  competitor_total: 38,
  competitor_days_per_post: 9,
  competitor_image_pct: 92,
};
