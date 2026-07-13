import { describe, expect, it } from "vitest";
import type { AuditInput } from "@/server/audit/input";
import { scoreAudit } from "@/server/score";
import { loadManovedhFixture } from "@/server/fixtures";
import { RUBRIC_MAX } from "@/types";

/** Minimal healthy profile — used to probe individual rows. */
function healthyInput(): AuditInput {
  return {
    profile: {
      name: "Test Business",
      address: "Main Road, Karad",
      phone: "+91 90000 00000",
      website: "https://example.in/",
      claimed: true,
      lat: 17.29,
      lng: 74.18,
      rating: 4.6,
      reviews_total: 250,
      place_id: "p1",
      cid: "c1",
      kg_id: null,
      profile_id: null,
      categories: { primary: "Dental clinic", secondary: [] },
      services: ["Root canal"],
      attributes: { Payments: ["UPI"] },
      hours: [{ day: "Monday", text: "10 am–8 pm", anomaly: false }],
      photos_total: 60,
      description: null,
      city: "Karad",
    },
    reviews: {
      stats: {
        avg_rating: 4.6,
        total: 250,
        reply_rate_pct: 85,
        velocity_per_month_6m: 5,
        velocity_per_month_1y: 4.5,
        with_photos: 12,
        textless: 4,
        local_guides: 9,
        avg_reviews_per_reviewer: 12,
        last_30d: 6,
        last_6m: 30,
        last_1y: 54,
      },
      avg_rating_actual: 4.61,
      items: [],
      timeline: [],
      cloud: [],
    },
    posts: {
      stats: {
        total: 40,
        days_per_post: 8,
        avg_chars: 200,
        avg_words: 30,
        with_image: 30,
        with_link: 10,
        with_video: 2,
      },
      items: [],
      timeline: [],
      last_post_ts: "2026-07-01T10:00:00+05:30",
      last_30d_count: 5,
    },
    website: {
      url: "https://example.in/",
      rented_subdomain: false,
      provider: null,
      nap: [
        { field: "name", gbp_value: "Test Business", website_value: "Test Business", match: true },
        { field: "address", gbp_value: "Main Road", website_value: "Main Road", match: true },
        { field: "phone", gbp_value: "+91 90000 00000", website_value: "+91 90000 00000", match: true },
      ],
      title: { value: "Dental clinic in Karad", has_category: true, has_city: true },
      meta: { value: "…", has_category: true, has_locality: true, ai_suggestions: [] },
      local_keywords: [],
      hours_match: [],
      category_pages: [],
      content_depth: { word_count: 900, band: "strong" },
      spelling_issues: [],
      headings: [],
      heading_skips: [],
      click_to_call: "ok",
    },
    competitors: [],
  };
}

describe("score.service — rubric rows", () => {
  it("healthy profile scores 100/100 green", () => {
    const r = scoreAudit(healthyInput());
    expect(r.scores.total).toBe(100);
    expect(r.band).toBe("green");
    expect(r.rubric.every((row) => row.status === "pass")).toBe(true);
  });

  it("row points never exceed the §2.5 maxima", () => {
    const r = scoreAudit(healthyInput());
    for (const row of r.rubric) {
      expect(row.max).toBe(RUBRIC_MAX[row.key]);
      expect(row.points).toBeLessThanOrEqual(row.max);
      expect(row.points).toBeGreaterThanOrEqual(0);
    }
  });

  it("unclaimed profile fails the claimed row", () => {
    const input = healthyInput();
    input.profile.claimed = false;
    const r = scoreAudit(input);
    expect(r.scores.claimed).toBe(0);
    expect(r.rubric.find((x) => x.key === "claimed")?.status).toBe("fail");
  });

  it("generic category scores 0 with a competitor-aware reason", () => {
    const input = healthyInput();
    input.profile.categories.primary = "Hospital";
    input.competitors = [
      { name: "A", primary_category: "Mental health clinic", rating: 4.5, reviews_total: 50, distance_km: 1, photos: 20, cid: null, place_id: null },
      { name: "B", primary_category: "Mental health clinic", rating: 4.2, reviews_total: 30, distance_km: 2, photos: 10, cid: null, place_id: null },
    ];
    const r = scoreAudit(input);
    expect(r.scores.category).toBe(0);
    const row = r.rubric.find((x) => x.key === "category")!;
    expect(row.status).toBe("fail");
    expect(row.reason).toContain('"Hospital" is generic');
    expect(row.reason).toContain("Mental health clinic");
  });

  it("category differing from competitor mode warns at 8", () => {
    const input = healthyInput();
    input.competitors = [
      { name: "A", primary_category: "Orthodontist", rating: null, reviews_total: null, distance_km: null, photos: null, cid: null, place_id: null },
      { name: "B", primary_category: "Orthodontist", rating: null, reviews_total: null, distance_km: null, photos: null, cid: null, place_id: null },
    ];
    const r = scoreAudit(input);
    expect(r.scores.category).toBe(8);
    expect(r.rubric.find((x) => x.key === "category")?.status).toBe("warn");
  });

  it("no website → 0 website points, nap unverifiable warns at 2", () => {
    const input = healthyInput();
    input.profile.website = null;
    input.website = null;
    const r = scoreAudit(input);
    expect(r.scores.website).toBe(0);
    expect(r.scores.nap).toBe(2);
  });

  it("velocity buckets: 1.2/mo → 3 warn; 0 → 0 fail", () => {
    const input = healthyInput();
    input.reviews!.stats.velocity_per_month_6m = 1.2;
    expect(scoreAudit(input).scores.reviews_velocity).toBe(3);
    input.reviews!.stats.velocity_per_month_6m = 0;
    expect(scoreAudit(input).scores.reviews_velocity).toBe(0);
  });

  it("reply-rate buckets: 6.67% → 1 fail; 100% → 7 pass", () => {
    const input = healthyInput();
    input.reviews!.stats.reply_rate_pct = 6.67;
    const r = scoreAudit(input);
    expect(r.scores.reply_rate).toBe(1);
    expect(r.rubric.find((x) => x.key === "reply_rate")?.status).toBe("fail");
    input.reviews!.stats.reply_rate_pct = 100;
    expect(scoreAudit(input).scores.reply_rate).toBe(7);
  });

  it("stale posts (none in 30d, some ever) → 2 fail with cadence in reason", () => {
    const input = healthyInput();
    input.posts!.last_30d_count = 0;
    input.posts!.stats.total = 7;
    input.posts!.stats.days_per_post = 293;
    const r = scoreAudit(input);
    expect(r.scores.posts).toBe(2);
    const row = r.rubric.find((x) => x.key === "posts")!;
    expect(row.status).toBe("fail");
    expect(row.reason).toContain("one per 293 days");
  });

  it("band boundaries: <40 red, 40–70 amber, >70 green", () => {
    const input = healthyInput();
    // degrade to red
    input.profile.claimed = false;
    input.profile.categories.primary = "Hospital";
    input.profile.phone = null;
    input.profile.services = [];
    input.profile.photos_total = 0;
    input.reviews!.stats.total = 0;
    input.reviews!.stats.velocity_per_month_6m = 0;
    input.reviews!.stats.reply_rate_pct = 0;
    input.posts!.stats.total = 0;
    input.posts!.last_30d_count = 0;
    const r = scoreAudit(input);
    expect(r.scores.total).toBeLessThan(40);
    expect(r.band).toBe("red");
  });
});

describe("score.service — Manovedh fixture (the M1 calibration)", () => {
  const { input } = loadManovedhFixture();
  const result = scoreAudit(input);

  it("lands exactly on the seed rubric row: 10/0/7/4/5/3/1/2/6/3 = 41 amber", () => {
    expect(result.scores).toEqual({
      total: 41,
      claimed: 10,
      category: 0,
      completeness: 7,
      photos: 4,
      reviews_count: 5,
      reviews_velocity: 3,
      reply_rate: 1,
      posts: 2,
      website: 6,
      nap: 3,
    });
    expect(result.band).toBe("amber");
  });

  it("row statuses match the design-handoff card", () => {
    const status = Object.fromEntries(
      result.rubric.map((r) => [r.key, r.status])
    );
    expect(status).toEqual({
      claimed: "pass",
      category: "fail",
      completeness: "fail",
      photos: "warn",
      reviews_count: "warn",
      reviews_velocity: "warn",
      reply_rate: "fail",
      posts: "fail",
      website: "warn",
      nap: "warn",
    });
  });

  it("reasons carry the fixture's findings", () => {
    const reason = (key: string) =>
      result.rubric.find((r) => r.key === key)!.reason;
    expect(reason("category")).toContain('"Hospital" is generic');
    expect(reason("completeness")).toContain("phone missing");
    expect(reason("completeness")).toContain("services empty");
    expect(reason("completeness")).toContain("hours anomaly");
    expect(reason("reply_rate")).toContain("6.67%");
    expect(reason("posts")).toContain("one per 293 days");
    expect(reason("website")).toContain("rented subdomain (grexa.site)");
    expect(reason("nap")).toContain("phone");
  });
});
