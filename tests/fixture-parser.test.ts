import { describe, expect, it } from "vitest";
import {
  loadManovedhFixture,
  MANOVEDH_POSTS,
} from "@/server/fixtures";
import { relativeDateToIso } from "@/server/fixtures/review";
import { computePostStats, computePostTimeline } from "@/server/audit/posts";

const fixture = loadManovedhFixture();

describe("BasicAudit.md parser", () => {
  const b = fixture.basic;

  it("parses identity fields", () => {
    expect(b.name).toContain("मनोवेध हिप्नोक्लिनिक");
    expect(b.generated).toBe("2026-07-11");
    expect(b.address).toContain("Somwar Peth, Karad");
    expect(b.website).toBe("https://nlp-eft.grexa.site/");
    expect(b.place_id).toBe("ChIJI1BROTaCwTsROZLPMoOo_64");
    expect(b.cid).toBe("12609982763107324473");
    expect(b.kg_id).toBe("/g/11cmqfhs_0");
    expect(b.profile_id).toBe("6592322801685579138");
    expect(b.lat).toBeCloseTo(17.293499, 5);
    expect(b.lng).toBeCloseTo(74.1794301, 5);
  });

  it("phone 'not provided' → null; status Claimed → true", () => {
    expect(b.phone).toBeNull();
    expect(b.claimed).toBe(true);
  });

  it("parses ratings and review count", () => {
    expect(b.reviews_total).toBe(30);
    expect(b.rating).toBe(4.9);
  });

  it("parses 7 weekday hours, all with the 12–9 AM overnight anomaly", () => {
    expect(b.hours).toHaveLength(7);
    expect(b.hours.map((h) => h.day)).toContain("Wednesday");
    expect(b.hours.every((h) => h.anomaly)).toBe(true);
    expect(b.hours[0].text).toContain("12–9 am");
  });

  it("categories = [Hospital]; services empty; attributes grouped", () => {
    expect(b.categories).toEqual(["Hospital"]);
    expect(b.services).toEqual([]);
    expect(b.attributes["Amenities"]).toEqual(["Gender-neutral toilets"]);
    expect(b.attributes["Payments"]).toEqual(["Cash only"]);
    expect(b.attributes["Parking"]).toHaveLength(2);
  });

  it("parses the export's link tables", () => {
    const groups = Object.keys(b.links);
    expect(groups.length).toBeGreaterThanOrEqual(4);
    const google = b.links["Google Maps Links"];
    expect(google.length).toBeGreaterThanOrEqual(10);
    expect(
      google.find((l) => l.label === "Review Request Link")?.url
    ).toContain("writereview?placeid=ChIJI1BROTaCwTsROZLPMoOo_64");
  });
});

describe("ReviewAudit.md parser", () => {
  const r = fixture.review;

  it("parses the summary stats", () => {
    expect(r.stats.total).toBe(30);
    expect(r.stats.avg_rating).toBe(4.9);
    expect(r.avg_rating_actual).toBe(4.93);
    expect(r.stats.with_photos).toBe(0);
    expect(r.stats.textless).toBe(0);
    expect(r.stats.local_guides).toBe(1);
    expect(r.stats.avg_reviews_per_reviewer).toBe(9.87);
    expect(r.replied_count).toBe(2);
    expect(r.stats.reply_rate_pct).toBe(6.67);
    expect(r.stats.last_30d).toBe(1);
    expect(r.stats.last_6m).toBe(7);
    expect(r.stats.last_1y).toBe(15);
    expect(r.stats.velocity_per_month_6m).toBe(1.2);
    expect(r.stats.velocity_per_month_1y).toBe(1.3);
  });

  it("parses all 30 reviews with ratings and reviewer stats", () => {
    expect(r.reviews).toHaveLength(30);
    expect(r.reviews.filter((x) => x.rating === 5)).toHaveLength(29);
    const localGuide = r.reviews.find((x) => x.is_local_guide);
    expect(localGuide?.author).toBe("Anirudha Patil");
    expect(localGuide?.rating).toBe(3);
    expect(localGuide?.author_review_count).toBe(248);
    expect(localGuide?.author_photo_count).toBe(1659);
  });

  it("marks exactly the two owner-answered reviews replied (6.67%)", () => {
    const replied = r.reviews.filter((x) => x.replied);
    expect(replied.map((x) => x.author).sort()).toEqual([
      "Janhavi Patil",
      "Varsha Patil",
    ]);
    expect(replied[0].owner_reply).toBeTruthy();
  });

  it("approximates relative dates; >1yr flagged as approximated", () => {
    const first = r.reviews[0]; // "a week ago" → 2026-07-04
    expect(first.review_ts).toBe("2026-07-04");
    expect(first.approximated).toBe(false);
    const old = r.reviews[r.reviews.length - 1]; // "3 years ago"
    expect(old.review_ts).toBe("2023-07-11");
    expect(old.approximated).toBe(true);
  });

  it("parses the timeline with approximated flags for >1yr points", () => {
    expect(r.timeline).toHaveLength(22);
    expect(r.timeline[0]).toEqual({
      date: "2022-09-15",
      cumulative: 1,
      approximated: true,
    });
    const latest = r.timeline[r.timeline.length - 1];
    expect(latest).toEqual({
      date: "2026-07-11",
      cumulative: 30,
      approximated: false,
    });
  });

  it("parses bilingual keyword tables", () => {
    const uni = Object.fromEntries(r.unigrams.map((k) => [k.token, k.count]));
    expect(uni.experience).toBe(15);
    expect(uni.khup).toBe(9);
    expect(uni.anubhav).toBe(8);
    const bi = Object.fromEntries(r.bigrams.map((k) => [k.token, k.count]));
    expect(bi["chan anubhav"]).toBe(8);
    expect(r.bigrams[0].kind).toBe("bigram");
  });
});

describe("WebsiteAudit.md parser", () => {
  const w = fixture.website;

  it("NAP: name+address match, phone mismatch", () => {
    expect(w.nap).toHaveLength(3);
    expect(w.nap.find((r) => r.field === "name")?.match).toBe(true);
    expect(w.nap.find((r) => r.field === "address")?.match).toBe(true);
    const phone = w.nap.find((r) => r.field === "phone");
    expect(phone?.match).toBe(false);
    expect(phone?.gbp_value).toBeNull();
    expect(phone?.website_value).toBeNull();
  });

  it("title has category+city; meta misses both", () => {
    expect(w.title.value).toContain("Hospital in Somwar Peth, Karad");
    expect(w.title.checks).toEqual([
      { term: "Hospital", found: true },
      { term: "Karad", found: true },
    ]);
    expect(w.meta.checks).toEqual([
      { term: "Hospital", found: false },
      { term: "krishnabai ghat", found: false },
    ]);
    expect(w.meta.suggestions).toHaveLength(2);
  });

  it("category pages: Hospital unmatched", () => {
    expect(w.category_pages).toEqual([
      { category: "Hospital", matched_page: null },
    ]);
  });

  it("content depth 633 words = good; one spelling issue", () => {
    expect(w.content_depth).toEqual({ word_count: 633, band: "good" });
    expect(w.spelling_issues).toEqual([
      { found: "Minde", suggested: "Mind", location: expect.stringContaining("Minde power") },
    ]);
  });

  it("heading tree with the three skips", () => {
    expect(w.heading_skips).toEqual(["H2→H5", "H2→H4", "H3→H6"]);
    expect(w.headings[0].level).toBe(1);
    const h2 = w.headings[0].children[0];
    expect(h2.level).toBe(2);
    expect(h2.children[0].level).toBe(5);
    expect(h2.children[0].skip_flag).toBe(true);
  });

  it("hours match on all 7 days; click-to-call not applicable", () => {
    expect(w.hours_match).toHaveLength(7);
    expect(w.hours_match.every((h) => h.match)).toBe(true);
    expect(w.click_to_call).toBe("not_applicable");
  });

  it("local keywords found with snippets", () => {
    const karad = w.local_keywords.find((k) => k.keyword === "Karad");
    expect(karad?.found).toBe(true);
    expect(karad?.snippets.length).toBeGreaterThanOrEqual(1);
  });
});

describe("relativeDateToIso", () => {
  const ref = new Date("2026-07-11T00:00:00Z");
  it("handles day/week/month/year units", () => {
    expect(relativeDateToIso("a week ago", ref).iso).toBe("2026-07-04");
    expect(relativeDateToIso("2 months ago", ref).iso).toBe("2026-05-11");
    expect(relativeDateToIso("10 months ago", ref).iso).toBe("2025-09-11");
    expect(relativeDateToIso("a year ago", ref)).toEqual({
      iso: "2025-07-11",
      approximated: true,
    });
    expect(relativeDateToIso("3 years ago", ref).iso).toBe("2023-07-11");
  });
});

describe("combined AuditInput", () => {
  const input = fixture.input;

  it("profile carries the sanity-relevant facts", () => {
    expect(input.profile.phone).toBeNull();
    expect(input.profile.services).toEqual([]);
    expect(input.profile.claimed).toBe(true);
    expect(input.profile.categories.primary).toBe("Hospital");
    expect(input.profile.hours.every((h) => h.anomaly)).toBe(true);
  });

  it("website findings flag the rented grexa.site subdomain", () => {
    expect(input.website?.rented_subdomain).toBe(true);
    expect(input.website?.provider).toBe("grexa.site");
    expect(input.website?.title.has_category).toBe(true);
    expect(input.website?.title.has_city).toBe(true);
    expect(input.website?.meta.has_category).toBe(false);
    expect(input.website?.meta.has_locality).toBe(false);
  });

  it("posts: §1.3d constants + computed timeline/recency", () => {
    expect(input.posts?.stats.total).toBe(7);
    expect(input.posts?.stats.days_per_post).toBe(293);
    expect(input.posts?.stats.avg_chars).toBe(171);
    expect(input.posts?.last_30d_count).toBe(0);
    expect(input.posts?.last_post_ts).toBe("2025-08-30T10:00:00+05:30");
  });
});

describe("computePostStats (live-path math over the seed posts)", () => {
  it("reproduces the derivable §1.3d numbers", () => {
    const stats = computePostStats(MANOVEDH_POSTS);
    expect(stats.total).toBe(7);
    expect(stats.avg_chars).toBe(171); // 1197 / 7 exactly
    expect(stats.with_image).toBe(4);
    expect(stats.with_link).toBe(1);
    expect(stats.with_video).toBe(0);
    // span 2020-11-15 → 2025-08-30 = 1749 days over 6 gaps ≈ 292/post
    // (the fixture's headline "293" is asserted from the §1.3d constant)
    expect(stats.days_per_post).toBe(292);
  });

  it("timeline is contiguous quarters with cumulative line", () => {
    const timeline = computePostTimeline(MANOVEDH_POSTS);
    expect(timeline[0].quarter).toBe("Q4'20");
    expect(timeline[timeline.length - 1].quarter).toBe("Q3'25");
    expect(timeline[timeline.length - 1].cumulative).toBe(7);
    expect(timeline.reduce((a, b) => a + b.count, 0)).toBe(7);
  });
});
