import { describe, expect, it } from "vitest";
import { loadManovedhFixture, MANOVEDH_POST_STATS } from "@/server/fixtures";
import { scoreAudit } from "@/server/score";
import { runSanityChecks } from "@/server/audit/sanity";
import { buildSnapshot } from "@/server/audit/pipeline";
import { finishProgress, initProgress } from "@/server/audit/progress";

/**
 * ══════════ M1 EXIT TEST (the milestone gate — CLAUDE.md) ══════════
 * The audit engine MUST reproduce the real GMB Everywhere findings for
 * मनोवेध हिप्नोक्लिनिक, Karad:
 *   score 40–55 amber · phone missing · category "Hospital" flagged generic ·
 *   services empty · hours anomaly (12–9 AM) · reply rate 6.67% ·
 *   7 posts / one per 293 days · NAP phone mismatch · rented-subdomain website ·
 *   review stats (30 reviews, 4.9★, 0 photos, 1 Local Guide, ~1.2/mo).
 */

const { input } = loadManovedhFixture();
const result = scoreAudit(input);
const flags = runSanityChecks(input);
const flag = (key: string) => flags.find((f) => f.key === key);

describe("M1 exit — मनोवेध हिप्नोक्लिनिक reproduces the GMB Everywhere audit", () => {
  it("score lands in 40–55 with band amber", () => {
    expect(result.scores.total).toBeGreaterThanOrEqual(40);
    expect(result.scores.total).toBeLessThanOrEqual(55);
    expect(result.band).toBe("amber");
  });

  it("…at exactly the seed's rubric row (41 = 10/0/7/4/5/3/1/2/6/3)", () => {
    expect(result.scores.total).toBe(41);
    expect([
      result.scores.claimed,
      result.scores.category,
      result.scores.completeness,
      result.scores.photos,
      result.scores.reviews_count,
      result.scores.reviews_velocity,
      result.scores.reply_rate,
      result.scores.posts,
      result.scores.website,
      result.scores.nap,
    ]).toEqual([10, 0, 7, 4, 5, 3, 1, 2, 6, 3]);
  });

  it("phone missing — flagged", () => {
    expect(input.profile.phone).toBeNull();
    expect(flag("phone_missing")).toMatchObject({ severity: "fail" });
  });

  it('category "Hospital" flagged generic', () => {
    expect(input.profile.categories.primary).toBe("Hospital");
    expect(flag("generic_category")?.message).toContain('"Hospital" is generic');
    expect(result.rubric.find((r) => r.key === "category")).toMatchObject({
      points: 0,
      status: "fail",
    });
  });

  it("services empty — flagged", () => {
    expect(input.profile.services).toEqual([]);
    expect(flag("services_empty")).toBeDefined();
  });

  it("hours anomaly: the 12–9 AM overnight block on all 7 days", () => {
    expect(input.profile.hours).toHaveLength(7);
    expect(input.profile.hours.every((h) => h.anomaly)).toBe(true);
    expect(flag("hours_anomaly")?.message).toContain("12–9 AM");
    expect(flag("hours_anomaly")?.message).toContain("all 7 days");
  });

  it("reply rate 6.67% (2 of 30 answered)", () => {
    expect(input.reviews?.stats.reply_rate_pct).toBe(6.67);
    expect(input.reviews?.items.filter((r) => r.replied)).toHaveLength(2);
    expect(result.rubric.find((r) => r.key === "reply_rate")).toMatchObject({
      points: 1,
      status: "fail",
    });
  });

  it("7 posts, one per 293 days", () => {
    expect(input.posts?.stats.total).toBe(7);
    expect(input.posts?.stats.days_per_post).toBe(293);
    expect(input.posts?.stats).toEqual(MANOVEDH_POST_STATS);
    expect(result.rubric.find((r) => r.key === "posts")?.reason).toContain(
      "one per 293 days"
    );
  });

  it("NAP phone mismatch between GBP and website", () => {
    const phone = input.website?.nap.find((r) => r.field === "phone");
    expect(phone?.match).toBe(false);
    expect(flag("nap_mismatch")?.message).toContain("phone");
  });

  it("website on a rented subdomain (grexa.site)", () => {
    expect(input.website?.rented_subdomain).toBe(true);
    expect(input.website?.provider).toBe("grexa.site");
    expect(flag("rented_subdomain")).toBeDefined();
  });

  it("review stats: 30 reviews · 4.9★ (4.93 actual) · 0 photos · 1 Local Guide · 1.2/mo", () => {
    const s = input.reviews!.stats;
    expect(s.total).toBe(30);
    expect(s.avg_rating).toBe(4.9);
    expect(input.reviews!.avg_rating_actual).toBe(4.93);
    expect(s.with_photos).toBe(0);
    expect(s.local_guides).toBe(1);
    expect(s.velocity_per_month_6m).toBe(1.2);
    expect(s.avg_reviews_per_reviewer).toBe(9.87);
    expect(s.last_30d).toBe(1);
    expect(s.last_6m).toBe(7);
    expect(s.last_1y).toBe(15);
  });

  it("all six sanity flags — nothing extra, nothing missing", () => {
    expect(flags.map((f) => f.key).sort()).toEqual([
      "generic_category",
      "hours_anomaly",
      "nap_mismatch",
      "phone_missing",
      "rented_subdomain",
      "services_empty",
    ]);
  });

  it("the full P3 snapshot assembles from this input (EP-002 payload)", () => {
    const snapshot = buildSnapshot(input, {
      source: "fixture",
      auditedAt: "2026-07-11T00:00:00Z",
      progress: finishProgress(initProgress("m1-exit").audit_id, "done"),
    });
    expect(snapshot.band).toBe("amber");
    expect((snapshot.rubric as unknown[]).length).toBe(10);
    expect((snapshot.links_pack as Array<{ links: unknown[] }>).flatMap((g) => g.links).length).toBeGreaterThanOrEqual(23);
    const fixes = snapshot.top_fixes as Array<{ lang: string; items: string[] }>;
    expect(fixes.find((f) => f.lang === "mr")?.items.join("")).toMatch(/[ऀ-ॿ]/);
  });
});
