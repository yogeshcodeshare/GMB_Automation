import { describe, expect, it } from "vitest";
import { esc, renderReportHtml } from "@/server/pdf/template";
import { manovedhReport } from "./helpers/report";

describe("SEC-003 — esc() primitive", () => {
  it("entity-encodes the XSS alphabet, leaves Devanagari intact", () => {
    expect(esc(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
    expect(esc(`<img src=x onerror=alert(1)>`)).toBe(
      "&lt;img src=x onerror=alert(1)&gt;"
    );
    expect(esc("मनोवेध हिप्नोक्लिनिक & co")).toBe("मनोवेध हिप्नोक्लिनिक &amp; co");
    expect(esc(null)).toBe("");
    expect(esc("a\x00b\x1Fc")).toBe("abc"); // control chars stripped
  });
});

describe("SEC-003 — report template renders hostile data inert", () => {
  const hostileName = `<img src=x onerror=alert(1)> "मनोवेध"`;
  const report = manovedhReport((input, business) => {
    business.name = hostileName;
    input.profile.name = hostileName;
    input.profile.categories.primary = `<script>fetch('https://evil.example')</script>`;
    input.competitors.push({
      name: `<iframe src="https://evil.example">`,
      primary_category: null,
      rating: 4,
      reviews_total: 10,
      distance_km: 1,
      photos: null,
      cid: null,
      place_id: null,
    });
  });
  const html = renderReportHtml(report, "mr", { generatedAt: "2026-07-14T00:00:00Z" });

  it("no live tags survive anywhere in the document body", () => {
    expect(html).not.toMatch(/<img\s+src=x/i);
    expect(html).not.toMatch(/<script>fetch/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/onerror\s*=\s*alert(?![^<]*&)/i);
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;iframe");
  });

  it("carries the CSP meta and only data: fonts (no external fetches)", () => {
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("data:font/ttf;base64,");
    // no http(s) resource loads — the only URLs are display text
    expect(html).not.toMatch(/src="https?:\/\//);
    expect(html).not.toMatch(/href="https?:\/\//);
  });
});

describe("MS4-T01 — Marathi report content", () => {
  const report = manovedhReport();
  const html = renderReportHtml(report, "mr", { generatedAt: "2026-07-14T00:00:00Z" });

  it("shows the business, the 41/amber gauge and all 10 rubric rows", () => {
    expect(html).toContain("मनोवेध हिप्नोक्लिनिक");
    expect(html).toContain(">41<");
    expect(html).toContain("amber");
    expect((html.match(/class="glyph"/g) ?? []).length).toBe(10);
  });

  it("renders the Marathi fixes and section headers in Devanagari", () => {
    expect(html).toContain("पहिली ५ कामे");
    expect(html).toContain("कॅटेगरी"); // fix line
    expect(html).toContain("तपासणी यादी");
  });

  it("English variant renders without Marathi headers", () => {
    const en = renderReportHtml(report, "en");
    expect(en).toContain("Top 5 fixes");
    expect(en).not.toContain("पहिली ५ कामे");
  });
});

describe("CR-2 — half-ring score gauge", () => {
  const report = manovedhReport();
  const html = renderReportHtml(report, "mr");

  it("renders the SVG arc with the amber band token for 41", () => {
    expect(html).toContain('class="score-gauge"');
    expect(html).toContain('data-band="amber"');
    expect(html).toContain('stroke="#d97706"'); // amber arc
    // arc fill ∝ score: 41% of π·80 ≈ 103.04
    expect(html).toMatch(/stroke-dasharray="103\.0\d 251\.33"/);
    expect(html).toContain(">41</text>"); // score centred in the gauge
  });

  it("band colors follow the thresholds", () => {
    const green = manovedhReport();
    green.scores.total = 85;
    green.band = "green";
    expect(renderReportHtml(green, "en")).toContain('stroke="#16a34a"');
    const red = manovedhReport();
    red.scores.total = 20;
    red.band = "red";
    expect(renderReportHtml(red, "en")).toContain('stroke="#dc2626"');
  });
});

describe("CR-3 — language variants", () => {
  const report = manovedhReport();

  it("mr: Devanagari labels", () => {
    const html = renderReportHtml(report, "mr");
    expect(html).toContain("तुमचा Google स्कोअर");
    expect(html).toContain("तपासणी यादी");
    expect(html).toMatch(/[ऀ-ॿ]/);
  });

  it("en: English labels, no Marathi headers", () => {
    const html = renderReportHtml(report, "en");
    expect(html).toContain("Your Google Score");
    expect(html).toContain("Checklist");
    expect(html).not.toContain("तपासणी यादी");
  });

  it("hinglish: Latin-script Marathi labels; en fix lines as fallback", () => {
    const html = renderReportHtml(report, "hinglish");
    expect(html).toContain("Tumcha Google Score");
    expect(html).toContain("Tapasni Yaadi");
    expect(html).toContain("He Turant Sudhara");
    expect(html).toContain("Pahili 5 Kaame");
    // fixes borrow the en list until curated Hinglish copy lands
    expect(html).toContain("Replace the generic primary category");
    // business name stays Devanagari — that's data, not copy
    expect(html).toContain("मनोवेध");
  });
});
