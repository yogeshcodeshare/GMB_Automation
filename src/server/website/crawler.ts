import type { ContentDepthBand, NapMatchRow } from "@/types";
import type { WebsiteFindings } from "@/server/audit/input";
import { buildHeadingTree } from "@/server/audit/headings";
import { detectRentedSubdomain } from "@/server/audit/sanity";
import {
  extractHeadings,
  extractLinks,
  extractMetaDescription,
  extractTitle,
  hasStructuredData,
  normalizeForMatch,
  phoneCandidates,
  phoneDigits,
  telLinks,
  visibleText,
  wordCount,
} from "./html";
import { safeFetch, type SafeFetchOpts, SsrfBlockedError } from "./ssrf";

/** MS15-T01 — own crawler: fetch the homepage through the SSRF guard and
 * check what P3b needs (title/meta/headings/schema/NAP/city keywords/
 * click-to-call/content depth). Single-page by design (M1.5). */

export interface CrawlGbpFacts {
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  categories: string[]; // primary first
}

export interface CrawlOutcome {
  reachable: boolean;
  http_status: number | null;
  error: string | null;
  findings: WebsiteFindings | null;
  /** TB-013 extras not in WebsiteFindings. */
  schema_ok: boolean | null;
  h1_ok: boolean | null;
}

function depthBand(words: number): ContentDepthBand {
  if (words < 300) return "thin";
  if (words < 500) return "light";
  if (words < 800) return "good";
  return "strong";
}

function snippetsAround(text: string, needle: string, max = 2): string[] {
  const out: string[] = [];
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  let from = 0;
  while (out.length < max) {
    const at = lower.indexOf(n, from);
    if (at === -1) break;
    const start = Math.max(0, at - 40);
    const end = Math.min(text.length, at + needle.length + 40);
    out.push((start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : ""));
    from = at + needle.length;
  }
  return out;
}

/** Locality candidates from the GBP address: comma parts that aren't the
 * city/state/PIN — e.g. "Somwar Peth" out of the Manovedh address. */
export function localityCandidates(
  address: string | null,
  city: string | null
): string[] {
  if (!address) return [];
  const skip = new Set(
    ["maharashtra", "india", city?.toLowerCase() ?? ""].filter(Boolean)
  );
  const parts = address
    .split(",")
    .map((p) => p.replace(/\b\d{6}\b/g, "").replace(/^\d+\s*/, "").trim())
    .filter((p) => p.length >= 4 && p.length <= 30)
    .filter((p) => !skip.has(p.toLowerCase()))
    .filter((p) => /^[A-Za-z\sऀ-ॿ]+$/.test(p));
  // Neighbourhood markers first — "Somwar Peth" beats "Near palkar highschool".
  const MARKER = /\b(peth|nagar|chowk|road|colony|galli|wadi|park|market)\b/i;
  return [...parts.filter((p) => MARKER.test(p)), ...parts.filter((p) => !MARKER.test(p))].slice(0, 3);
}

function napRows(
  gbp: CrawlGbpFacts,
  pageText: string,
  html: string
): NapMatchRow[] {
  const normText = normalizeForMatch(pageText);

  const nameMatch = normText.includes(normalizeForMatch(gbp.name));

  let addressMatch = false;
  if (gbp.address) {
    const tokens = normalizeForMatch(gbp.address)
      .split(" ")
      .filter((t) => t.length > 3);
    const present = tokens.filter((t) => normText.includes(t));
    addressMatch = tokens.length > 0 && present.length / tokens.length >= 0.6;
  }

  const gbpPhone = phoneDigits(gbp.phone);
  const sitePhones = [
    ...telLinks(html).map(phoneDigits),
    ...phoneCandidates(pageText).map(phoneDigits),
  ].filter((p): p is string => p !== null);
  const sitePhone = sitePhones[0] ?? null;
  const phoneMatch = gbpPhone !== null && sitePhones.includes(gbpPhone);

  return [
    {
      field: "name",
      gbp_value: gbp.name,
      website_value: nameMatch ? gbp.name : null,
      match: nameMatch,
    },
    {
      field: "address",
      gbp_value: gbp.address,
      website_value: addressMatch ? gbp.address : null,
      match: addressMatch,
    },
    {
      field: "phone",
      gbp_value: gbp.phone,
      website_value: sitePhone,
      // GMB-Everywhere convention: phone missing on BOTH sides is a mismatch
      // (there is nothing consistent to rank on).
      match: phoneMatch,
    },
  ];
}

export function analyzeHtml(
  url: string,
  html: string,
  gbp: CrawlGbpFacts
): { findings: WebsiteFindings; schema_ok: boolean; h1_ok: boolean } {
  const text = visibleText(html);
  const normText = normalizeForMatch(text);
  const rented = detectRentedSubdomain(url);
  const primary = gbp.categories[0] ?? null;

  const title = extractTitle(html);
  const meta = extractMetaDescription(html);
  const containsCat = (s: string | null) =>
    s !== null &&
    primary !== null &&
    normalizeForMatch(s).includes(normalizeForMatch(primary));
  const containsCity = (s: string | null) =>
    s !== null &&
    gbp.city !== null &&
    normalizeForMatch(s).includes(normalizeForMatch(gbp.city));

  const headingSeq = extractHeadings(html);
  const { headings, skips } = buildHeadingTree(headingSeq);

  const localities = localityCandidates(gbp.address, gbp.city);
  const localKeywords = [gbp.city, ...localities]
    .filter((k): k is string => Boolean(k))
    .map((keyword) => ({
      keyword,
      found: normText.includes(normalizeForMatch(keyword)),
      snippets: snippetsAround(text, keyword),
    }));

  const links = extractLinks(html);
  const categoryPages = gbp.categories.map((category) => {
    const norm = normalizeForMatch(category);
    const hit = links.find(
      (l) =>
        normalizeForMatch(l.text).includes(norm) ||
        normalizeForMatch(l.href.replace(/[-_/]/g, " ")).includes(norm)
    );
    return { category, matched_page: hit ? hit.href : null };
  });

  const tel = telLinks(html);
  const anyPhone = phoneDigits(gbp.phone) !== null || phoneCandidates(text).length > 0;
  const click_to_call: WebsiteFindings["click_to_call"] =
    tel.length > 0 ? "ok" : anyPhone ? "missing" : "not_applicable";

  const words = wordCount(text);
  const h1Count = headingSeq.filter((h) => h.level === 1).length;

  const findings: WebsiteFindings = {
    url,
    rented_subdomain: rented.rented,
    provider: rented.provider,
    nap: napRows(gbp, text, html),
    title: {
      value: title,
      has_category: containsCat(title),
      has_city: containsCity(title),
    },
    meta: {
      value: meta,
      has_category: containsCat(meta),
      has_locality:
        meta !== null &&
        localities.some((l) => normalizeForMatch(meta).includes(normalizeForMatch(l))),
      ai_suggestions: [], // M3 drafts these (approve-before-publish)
    },
    local_keywords: localKeywords,
    // Reliable hours need structured data both sides — M6 GBP API territory.
    hours_match: [],
    category_pages: categoryPages,
    content_depth: { word_count: words, band: depthBand(words) },
    spelling_issues: [], // fixture-only until a Marathi+English dictionary lands
    headings,
    heading_skips: skips,
    click_to_call,
  };

  return {
    findings,
    schema_ok: hasStructuredData(html),
    h1_ok: h1Count === 1,
  };
}

export async function crawlWebsite(
  url: string,
  gbp: CrawlGbpFacts,
  fetchOpts: SafeFetchOpts = {}
): Promise<CrawlOutcome> {
  let fetched;
  try {
    fetched = await safeFetch(url, fetchOpts);
  } catch (e) {
    return {
      reachable: false,
      http_status: null,
      error:
        e instanceof SsrfBlockedError
          ? e.message
          : `fetch failed: ${e instanceof Error ? e.message : "unknown"}`,
      findings: null,
      schema_ok: null,
      h1_ok: null,
    };
  }

  if (fetched.status < 200 || fetched.status >= 300) {
    return {
      reachable: false,
      http_status: fetched.status,
      error: `HTTP ${fetched.status}`,
      findings: null,
      schema_ok: null,
      h1_ok: null,
    };
  }
  if (fetched.content_type && !/text\/html|xhtml/i.test(fetched.content_type)) {
    return {
      reachable: false,
      http_status: fetched.status,
      error: `not HTML (${fetched.content_type})`,
      findings: null,
      schema_ok: null,
      h1_ok: null,
    };
  }

  return {
    reachable: true,
    http_status: fetched.status,
    error: null,
    ...analyzeHtml(fetched.final_url, fetched.body, gbp),
  };
}
