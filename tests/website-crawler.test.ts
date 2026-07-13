import { describe, expect, it } from "vitest";
import {
  analyzeHtml,
  crawlWebsite,
  localityCandidates,
  type CrawlGbpFacts,
} from "@/server/website/crawler";
import { psiMobileScore } from "@/server/website/psi";
import { buildWebsiteAuditDetail } from "@/server/website/detail";
import { scoreAudit } from "@/server/score";
import { loadManovedhFixture } from "@/server/fixtures";

/** Manovedh-shaped homepage: category+city in title, Marathi meta without
 * them, H2→H5 heading skip, no schema, no tel:, one nav link per category. */
const SAMPLE_HTML = `<!doctype html>
<html><head>
<title>मनोवेध हिप्नोक्लिनिक - Hospital in Somwar Peth, Karad</title>
<meta name="description" content="भीती, टेंशन, नैराश्य — गोळ्या औषधांशिवाय कायमची मुक्ती.">
<style>.x{color:red}</style>
<script>var t = "Hospital script noise Karad";</script>
</head><body>
<h1>मनोवेध हिप्नोक्लिनिक - Hospital in Somwar Peth, Karad</h1>
<h2>Hospital Products</h2>
<h5>Trading psychology</h5>
<h5>Minde power</h5>
<h2>Gallery</h2>
<h3>Get in Touch</h3>
<p>Panchavati krIshnabai ghat, Near palkar highschool, 438, Somwar Peth, Karad, Maharashtra 415110</p>
<p>${"मानसिक आरोग्यासाठी संमोहन उपचार. ".repeat(120)}</p>
<a href="/gallery">Gallery</a>
</body></html>`;

const GBP: CrawlGbpFacts = {
  name: "मनोवेध हिप्नोक्लिनिक",
  address:
    "Panchavati krIshnabai ghat, krishnabai ghat, Near palkar highschool, 438, Somwar Peth, Karad, Maharashtra 415110",
  phone: null,
  city: "Karad",
  categories: ["Hospital"],
};

describe("M1.5 crawler — analyzeHtml", () => {
  const result = analyzeHtml("https://nlp-eft.grexa.site/", SAMPLE_HTML, GBP);
  const w = result.findings;

  it("title has category+city; meta has neither", () => {
    expect(w.title.value).toContain("Hospital in Somwar Peth");
    expect(w.title.has_category).toBe(true);
    expect(w.title.has_city).toBe(true);
    expect(w.meta.has_category).toBe(false);
    expect(w.meta.has_locality).toBe(false);
  });

  it("NAP: name+address match, phone mismatch (missing both sides)", () => {
    expect(w.nap.find((r) => r.field === "name")?.match).toBe(true);
    expect(w.nap.find((r) => r.field === "address")?.match).toBe(true);
    expect(w.nap.find((r) => r.field === "phone")?.match).toBe(false);
  });

  it("heading tree flags the H2→H5 skip", () => {
    expect(w.heading_skips).toContain("H2→H5");
    expect(result.h1_ok).toBe(true); // exactly one H1
  });

  it("no structured data, no tel: → not_applicable (no phone anywhere)", () => {
    expect(result.schema_ok).toBe(false);
    expect(w.click_to_call).toBe("not_applicable");
  });

  it("local keywords: city + Somwar Peth found with snippets", () => {
    const karad = w.local_keywords.find((k) => k.keyword === "Karad");
    expect(karad?.found).toBe(true);
    expect(karad?.snippets.length).toBeGreaterThan(0);
    const peth = w.local_keywords.find((k) => k.keyword === "Somwar Peth");
    expect(peth?.found).toBe(true);
  });

  it("category pages: Hospital has no matching page", () => {
    expect(w.category_pages).toEqual([
      { category: "Hospital", matched_page: null },
    ]);
  });

  it("content depth counts Devanagari words; rented subdomain detected", () => {
    expect(w.content_depth.word_count).toBeGreaterThan(300);
    expect(w.rented_subdomain).toBe(true);
    expect(w.provider).toBe("grexa.site");
  });

  it("tel: link flips click-to-call to ok; matching phone matches NAP", () => {
    const html = SAMPLE_HTML.replace(
      "<a href=\"/gallery\">Gallery</a>",
      '<a href="tel:+919876512345">Call</a>'
    );
    const r = analyzeHtml("https://nlp-eft.grexa.site/", html, {
      ...GBP,
      phone: "+91 98765 12345",
    });
    expect(r.findings.click_to_call).toBe("ok");
    expect(r.findings.nap.find((x) => x.field === "phone")?.match).toBe(true);
  });
});

describe("localityCandidates", () => {
  it("extracts Somwar Peth-style parts, skips city/state/PIN/numbers", () => {
    const parts = localityCandidates(GBP.address, "Karad");
    expect(parts).toContain("Somwar Peth");
    expect(parts).not.toContain("Karad");
    expect(parts.join(" ")).not.toContain("415110");
  });
  it("empty address → empty list", () => {
    expect(localityCandidates(null, "Karad")).toEqual([]);
  });
});

describe("crawlWebsite outcomes", () => {
  const PUBLIC_DNS = async () => ["93.184.216.34"];

  it("reachable page → findings", async () => {
    const outcome = await crawlWebsite("https://nlp-eft.grexa.site/", GBP, {
      lookupAll: PUBLIC_DNS,
      fetchImpl: async () =>
        new Response(SAMPLE_HTML, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    });
    expect(outcome.reachable).toBe(true);
    expect(outcome.findings?.title.has_category).toBe(true);
  });

  it("HTTP 500 / non-HTML / SSRF-blocked → unreachable with reason", async () => {
    const err500 = await crawlWebsite("https://a.example/", GBP, {
      lookupAll: PUBLIC_DNS,
      fetchImpl: async () => new Response("x", { status: 500 }),
    });
    expect(err500.reachable).toBe(false);
    expect(err500.error).toContain("HTTP 500");

    const pdf = await crawlWebsite("https://a.example/", GBP, {
      lookupAll: PUBLIC_DNS,
      fetchImpl: async () =>
        new Response("x", { status: 200, headers: { "content-type": "application/pdf" } }),
    });
    expect(pdf.reachable).toBe(false);
    expect(pdf.error).toContain("not HTML");

    const blocked = await crawlWebsite("http://169.254.169.254/", GBP, {});
    expect(blocked.reachable).toBe(false);
    expect(blocked.error).toContain("SSRF");
  });
});

describe("score renormalisation (§2.5)", () => {
  it("no website: total renormalises to /90 basis", () => {
    const { input } = loadManovedhFixture();
    const siteless = {
      ...input,
      profile: { ...input.profile, website: null },
      website: null,
    };
    const r = scoreAudit(siteless);
    // Sitelessness also costs completeness its website sub-points (7→5) and
    // leaves NAP unverifiable (3→2): 10+0+5+4+5+3+1+2+2 = 32 → 32/90 → 36.
    expect(r.scores.website).toBe(0);
    expect(r.scores.completeness).toBe(5);
    expect(r.scores.total).toBe(36);
    const row = r.rubric.find((x) => x.key === "website");
    expect(row?.status).toBe("warn");
    expect(row?.reason).toContain("renormalised");
  });

  it("unreachable website: same renormalisation, different reason", () => {
    const { input } = loadManovedhFixture();
    const dead = { ...input, website: null, website_unreachable: true };
    const r = scoreAudit(dead);
    expect(r.scores.website).toBe(0);
    expect(
      r.rubric.find((x) => x.key === "website")?.reason
    ).toContain("did not respond");
  });

  it("reachable fixture path is untouched (still 41)", () => {
    const { input } = loadManovedhFixture();
    expect(scoreAudit(input).scores.total).toBe(41);
  });
});

describe("PSI (mocked)", () => {
  it("parses the lighthouse performance score", async () => {
    const score = await psiMobileScore("https://x.example/", {
      apiKey: "test-key",
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            lighthouseResult: { categories: { performance: { score: 0.52 } } },
          }),
          { status: 200 }
        )) as typeof fetch,
    });
    expect(score).toBe(52);
  });

  it("no key / HTTP error / bad payload → null", async () => {
    expect(await psiMobileScore("https://x.example/", { apiKey: null })).toBeNull();
    expect(
      await psiMobileScore("https://x.example/", {
        apiKey: "k",
        fetchImpl: (async () => new Response("err", { status: 500 })) as typeof fetch,
      })
    ).toBeNull();
    expect(
      await psiMobileScore("https://x.example/", {
        apiKey: "k",
        fetchImpl: (async () => new Response("{}", { status: 200 })) as typeof fetch,
      })
    ).toBeNull();
  });
});

describe("EP-014 detail assembly", () => {
  it("summary booleans derive from findings", () => {
    const { findings, schema_ok, h1_ok } = analyzeHtml(
      "https://nlp-eft.grexa.site/",
      SAMPLE_HTML,
      GBP
    );
    const detail = buildWebsiteAuditDetail({
      findings,
      psi_score: 52,
      schema_ok,
      h1_ok,
      row_id: 7,
      business_id: "11111111-1111-4111-8111-111111111111",
      checked_at: "2026-07-13T12:00:00Z",
    });
    expect(detail.summary).toMatchObject({
      id: 7,
      psi_score: 52,
      title_ok: true,
      meta_ok: false,
      h1_ok: true,
      schema_ok: false,
      nap_match: false,
      city_kw: true,
      rented_subdomain: true,
      provider: "grexa.site",
    });
    expect(detail.heading_skips).toContain("H2→H5");
  });
});
