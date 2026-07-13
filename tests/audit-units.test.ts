import { describe, expect, it } from "vitest";
import { buildKeywordCloud, tokenize } from "@/server/audit/tokenizer";
import { buildLinkPack } from "@/server/audit/links";
import { buildTopFixes } from "@/server/audit/top-fixes";
import { relatedCategoryIntel } from "@/server/audit/categories";
import { hasHoursAnomaly, parseHoursText } from "@/server/audit/hours";
import { detectRentedSubdomain, runSanityChecks } from "@/server/audit/sanity";
import { scoreAudit } from "@/server/score";
import { loadManovedhFixture } from "@/server/fixtures";

const fixture = loadManovedhFixture();

describe("bilingual tokenizer (MS1-T11)", () => {
  it("keeps Marathi-in-Latin content words, drops English stopwords", () => {
    expect(tokenize("I have a best experience and khup chan anubhav")).toEqual([
      "best",
      "experience",
      "khup",
      "chan",
      "anubhav",
    ]);
  });

  it("keeps Devanagari tokens, drops Marathi function words", () => {
    expect(tokenize("खूप छान अनुभव आहे आणि उपचार")).toEqual([
      "खूप",
      "छान",
      "अनुभव",
      "उपचार",
    ]);
  });

  it("strips URLs, digits and Google-Translate artifacts", () => {
    expect(
      tokenize("Translated by Google see original https://x.example 100% result")
    ).toEqual(["result"]);
  });

  it("cloud over the 30 fixture reviews surfaces the export's top words", () => {
    const cloud = buildKeywordCloud(
      fixture.review.reviews.map((r) => r.text),
      { top: 30 }
    );
    const uni = cloud.filter((k) => k.kind === "unigram").map((k) => k.token);
    expect(uni).toContain("experience");
    expect(uni).toContain("best");
    expect(uni).toContain("chan");
    expect(uni).toContain("khup");
    expect(uni).toContain("anubhav");
    const bi = cloud.filter((k) => k.kind === "bigram").map((k) => k.token);
    expect(bi).toContain("chan anubhav");
    expect(bi).toContain("khup chan");
  });
});

describe("link pack (MS1-T09)", () => {
  const groups = buildLinkPack(fixture.input.profile);
  const all = groups.flatMap((g) => g.links);

  it("~25 links across the four groups", () => {
    expect(groups.map((g) => g.group)).toEqual([
      "google",
      "maps",
      "marketing",
      "website",
    ]);
    expect(all.length).toBeGreaterThanOrEqual(23);
    expect(all.length).toBeLessThanOrEqual(30);
  });

  it("reproduces the fixture's key templated links", () => {
    const by = (label: string) => all.find((l) => l.label === label)?.url ?? "";
    expect(by("Review request link")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJI1BROTaCwTsROZLPMoOo_64"
    );
    expect(by("Maps (CID)")).toBe(
      "https://www.google.com/maps/place/?cid=12609982763107324473"
    );
    expect(by("Knowledge panel")).toContain("kgmid=%2Fg%2F11cmqfhs_0");
    expect(by("robots.txt")).toBe("https://nlp-eft.grexa.site/robots.txt");
    expect(by("Google Ads run by business")).toContain("nlp-eft.grexa.site");
  });

  it("skips groups/links whose inputs are missing", () => {
    const bare = buildLinkPack({
      ...fixture.input.profile,
      website: null,
      kg_id: null,
      lat: null,
      lng: null,
    });
    const labels = bare.flatMap((g) => g.links).map((l) => l.label);
    expect(labels).not.toContain("robots.txt");
    expect(labels).not.toContain("Knowledge panel");
    expect(bare.find((g) => g.group === "website")).toBeUndefined();
  });
});

describe("hours sanity", () => {
  it("parses both fixture formats", () => {
    expect(parseHoursText("12–9 am; 10 am–12 am")).toEqual([
      { startMin: 0, endMin: 540 },
      { startMin: 600, endMin: 1440 },
    ]);
    expect(parseHoursText("12:00 AM - 9:00 AM, 10:30 AM - 12:00 AM")).toEqual([
      { startMin: 0, endMin: 540 },
      { startMin: 630, endMin: 1440 },
    ]);
  });

  it("flags midnight openings but not 24h or normal hours", () => {
    expect(hasHoursAnomaly("12–9 am; 10 am–12 am")).toBe(true);
    expect(hasHoursAnomaly("10 am–8 pm")).toBe(false);
    expect(hasHoursAnomaly("12 am–12 am")).toBe(false); // true 24h
    expect(hasHoursAnomaly("Closed")).toBe(false);
  });
});

describe("sanity checks (MS1-T10)", () => {
  it("Manovedh raises all six flags", () => {
    const flags = runSanityChecks(fixture.input);
    const keys = flags.map((f) => f.key).sort();
    expect(keys).toEqual([
      "generic_category",
      "hours_anomaly",
      "nap_mismatch",
      "phone_missing",
      "rented_subdomain",
      "services_empty",
    ]);
    expect(flags.find((f) => f.key === "hours_anomaly")?.message).toContain(
      "all 7 days"
    );
    expect(flags.find((f) => f.key === "rented_subdomain")?.message).toContain(
      "grexa.site"
    );
    expect(flags.find((f) => f.key === "nap_mismatch")?.message).toContain(
      "phone"
    );
  });

  it("rented-subdomain detector", () => {
    expect(detectRentedSubdomain("https://nlp-eft.grexa.site/")).toEqual({
      rented: true,
      provider: "grexa.site",
    });
    expect(detectRentedSubdomain("https://shop.wixsite.com/mysite").rented).toBe(true);
    expect(detectRentedSubdomain("https://manovedh.in/").rented).toBe(false);
    expect(detectRentedSubdomain(null).rented).toBe(false);
    expect(detectRentedSubdomain("not a url").rented).toBe(false);
  });
});

describe("top fixes (bilingual, deterministic)", () => {
  it("Manovedh: 5 fixes in both languages, category first", () => {
    const { rubric } = scoreAudit(fixture.input);
    const fixes = buildTopFixes(rubric);
    expect(fixes.map((f) => f.lang)).toEqual(["en", "mr"]);
    expect(fixes[0].items).toHaveLength(5);
    expect(fixes[1].items).toHaveLength(5);
    // worst first: category (fail, 15 lost) → completeness (fail, 8 lost) …
    expect(fixes[0].items[0]).toContain("category");
    expect(fixes[1].items[0]).toContain("कॅटेगरी");
    // Devanagari renders everywhere text renders (hard constraint 5)
    expect(fixes[1].items.join("")).toMatch(/[ऀ-ॿ]/);
  });
});

describe("category intel (MS1-T07)", () => {
  it("Hospital → specific mental-health alternatives + services", () => {
    const intel = relatedCategoryIntel(["Hospital"]);
    const names = intel.related.map((r) => r.category);
    expect(names).toContain("Mental health clinic");
    expect(names).toContain("Hypnotherapy service");
    expect(intel.related_services).toContain("Hypnotherapy");
    expect(intel.trends_compare_url).toContain("trends.google.com");
    expect(intel.current).toEqual(["Hospital"]);
  });

  it("unknown category → empty related, no crash", () => {
    const intel = relatedCategoryIntel(["Underwater basket weaving"]);
    expect(intel.related).toEqual([]);
  });
});
