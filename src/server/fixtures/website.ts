import type { ContentDepthBand, HeadingNode, NapMatchRow, NapField } from "@/types";
import { findLine, parseTableAt, sectionLines } from "./md";

/** Parsed fixtures/WebsiteAudit.md (GMB Everywhere "Website Audit" export).
 * URL / rented-subdomain / provider are NOT in this export — the combiner
 * derives them from BasicAudit's website URL (sanity detector). */
export interface ParsedWebsiteAudit {
  nap: NapMatchRow[];
  title: { value: string | null; checks: Array<{ term: string; found: boolean }> };
  meta: {
    value: string | null;
    checks: Array<{ term: string; found: boolean }>;
    suggestions: string[];
  };
  local_keywords: Array<{ keyword: string; found: boolean; snippets: string[] }>;
  hours_match: Array<{ day: string; gbp: string; website: string; match: boolean }>;
  category_pages: Array<{ category: string; matched_page: string | null }>;
  content_depth: { word_count: number; band: ContentDepthBand };
  spelling_issues: Array<{ found: string; suggested: string; location: string }>;
  headings: HeadingNode[];
  heading_skips: string[]; // e.g. ["H2→H5", "H2→H4", "H3→H6"]
  click_to_call: "ok" | "missing" | "not_applicable";
}

const NAP_FIELDS: Record<string, NapField> = {
  Name: "name",
  Address: "address",
  Phone: "phone",
};

function cellValue(cell: string): string | null {
  const t = cell.trim();
  return t === "" || t === "-" ? null : t;
}

function unquote(s: string): string {
  return s.replace(/^["“]/, "").replace(/["”]$/, "").trim();
}

/** Bullets like `- ✅ "Hospital" found` / `- ❌ "krishnabai ghat" missing`. */
function parseTermChecks(lines: string[]): Array<{ term: string; found: boolean }> {
  const checks: Array<{ term: string; found: boolean }> = [];
  for (const line of lines) {
    const m = /^-\s*(✅|❌)\s*[""]([^"""]+)[""]\s*(found|missing)/i.exec(line.trim());
    if (m) checks.push({ term: m[2], found: m[1] === "✅" });
  }
  return checks;
}

function parseHeadings(lines: string[]): {
  headings: HeadingNode[];
  skips: string[];
} {
  const roots: HeadingNode[] = [];
  const stack: HeadingNode[] = [];
  const skips: string[] = [];
  for (const raw of lines) {
    const m = /^\s*-\s*\*\*H([1-6]):\*\*\s*(.+)$/.exec(raw);
    if (!m) continue;
    const level = Number(m[1]) as HeadingNode["level"];
    const node: HeadingNode = {
      level,
      text: m[2].trim(),
      skip_flag: false,
      children: [],
    };
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) {
      node.skip_flag = level > parent.level + 1;
      if (node.skip_flag) {
        const skip = `H${parent.level}→H${level}`;
        if (!skips.includes(skip)) skips.push(skip);
      }
      parent.children.push(node);
    } else {
      node.skip_flag = level > 1 && roots.length === 0;
      roots.push(node);
    }
    stack.push(node);
  }
  return { headings: roots, skips };
}

export function parseWebsiteAudit(md: string): ParsedWebsiteAudit {
  const lines = md.split(/\r?\n/);

  // ---- NAP table ----
  const napStart = findLine(lines, /Name, Address, Phone \(NAP\) Match/i);
  const { rows: napRows } = parseTableAt(lines, napStart + 1);
  const nap: NapMatchRow[] = napRows
    .filter((r) => r.length >= 4 && r[0] in NAP_FIELDS)
    .map((r) => ({
      field: NAP_FIELDS[r[0]],
      gbp_value: cellValue(r[1]),
      website_value: cellValue(r[2]),
      match: /✅/.test(r[3]),
    }));

  // ---- Title tag ----
  const titleIdx = findLine(lines, /^\*\*Title Tag:\*\*/);
  let titleValue: string | null = null;
  const titleChecks: Array<{ term: string; found: boolean }> = [];
  if (titleIdx !== -1) {
    for (let i = titleIdx + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t === "") continue;
      if (t.startsWith("**") || t.startsWith("#")) break;
      if (t.startsWith("- ")) {
        titleChecks.push(...parseTermChecks([t]));
      } else if (titleValue === null) {
        titleValue = unquote(t);
      }
    }
  }

  // ---- Meta description ----
  const metaIdx = findLine(lines, /^\*\*Meta Description:\*\*/);
  let metaValue: string | null = null;
  const metaChecks: Array<{ term: string; found: boolean }> = [];
  if (metaIdx !== -1) {
    for (let i = metaIdx + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t === "") continue;
      if (t.startsWith("**") || t.startsWith("#") || t.startsWith(">")) break;
      if (t.startsWith("- ")) {
        metaChecks.push(...parseTermChecks([t]));
      } else if (metaValue === null) {
        metaValue = unquote(t);
      }
    }
  }
  const suggestions: string[] = [];
  const sugIdx = findLine(lines, /^\*\*Suggested Descriptions:\*\*/);
  if (sugIdx !== -1) {
    for (let i = sugIdx + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      const m = /^\d+\.\s*(.+)$/.exec(t);
      if (m) suggestions.push(unquote(m[1]));
      else if (t !== "" && !t.startsWith(">")) break;
    }
  }

  // ---- Local keywords ----
  const local_keywords: Array<{ keyword: string; found: boolean; snippets: string[] }> = [];
  {
    const kwLines = sectionLines(lines, /^###\s+Local Keywords/, 3);
    let current: { keyword: string; found: boolean; snippets: string[] } | null = null;
    for (const raw of kwLines) {
      const top = /^-\s*\*\*[""]?([^"""*]+?)[""]?(?:\s+in page content)?:?\*\*:?\s*(✅|❌)/.exec(
        raw.trim()
      );
      const snippet = /^-\s*[""](.+)[""]\s*(?:\(matched:.*\))?$/.exec(raw.trim());
      const isIndented = /^\s{2,}-/.test(raw);
      if (top && !isIndented) {
        current = {
          keyword: top[1].replace(/:$/, "").trim(),
          found: top[2] === "✅",
          snippets: [],
        };
        local_keywords.push(current);
      } else if (snippet && isIndented && current) {
        current.snippets.push(snippet[1]);
      }
    }
  }

  // ---- Operating hours match ----
  const hoursStart = findLine(lines, /^###\s+Operating Hours/);
  const { rows: hourRows } = parseTableAt(lines, hoursStart + 1);
  const hours_match = hourRows
    .filter((r) => r.length >= 4)
    .map((r) => ({ day: r[0], gbp: r[1], website: r[2], match: /✅/.test(r[3]) }));

  // ---- Category pages ----
  const catStart = findLine(lines, /^###\s+Category Pages/);
  const { rows: catRows } = parseTableAt(lines, catStart + 1);
  const category_pages = catRows
    .filter((r) => r.length >= 3)
    .map((r) => ({
      category: r[0],
      matched_page: /✅/.test(r[1]) ? cellValue(r[2]) : null,
    }));

  // ---- Content depth ----
  let content_depth: ParsedWebsiteAudit["content_depth"] = {
    word_count: 0,
    band: "thin",
  };
  {
    const m = /\*\*Word Count:\s*([\d,]+)\s*words?\s*[–—-]\s*(Thin|Light|Good|Strong)\*\*/i.exec(md);
    if (m) {
      content_depth = {
        word_count: Number(m[1].replace(/,/g, "")),
        band: m[2].toLowerCase() as ContentDepthBand,
      };
    }
  }

  // ---- Spelling ----
  const spellStart = findLine(lines, /^###\s+Spelling/);
  const { rows: spellRows } = parseTableAt(lines, spellStart + 1);
  const spelling_issues = spellRows
    .filter((r) => r.length >= 3)
    .map((r) => ({ found: r[0], suggested: r[1], location: r[2] }));

  // ---- Header structure ----
  const { headings, skips } = parseHeadings(
    sectionLines(lines, /^###\s+Header Structure/, 3)
  );

  // ---- Click-to-call ----
  let click_to_call: ParsedWebsiteAudit["click_to_call"] = "missing";
  {
    const ctcLines = sectionLines(lines, /^###\s+Mobile Click-to-Call/, 3);
    const text = ctcLines.join(" ");
    if (/not applicable/i.test(text)) click_to_call = "not_applicable";
    else if (/✅/.test(text)) click_to_call = "ok";
  }

  return {
    nap,
    title: { value: titleValue, checks: titleChecks },
    meta: { value: metaValue, checks: metaChecks, suggestions },
    local_keywords,
    hours_match,
    category_pages,
    content_depth,
    spelling_issues,
    headings,
    heading_skips: skips,
    click_to_call,
  };
}
