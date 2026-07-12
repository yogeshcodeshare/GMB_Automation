/** TB-013 website_audits + P3b Website Audit detail shapes. */

export interface WebsiteAudit {
  id: number;
  business_id: string;
  psi_score: number | null;
  title_ok: boolean | null;
  meta_ok: boolean | null;
  h1_ok: boolean | null;
  schema_ok: boolean | null;
  nap_match: boolean | null;
  city_kw: boolean | null;
  checked_at: string;
}

/** Compact summary folded into the audit report (US-015). */
export interface WebsiteAuditSummary extends WebsiteAudit {
  url: string;
  rented_subdomain: boolean; // grexa/wixsite/blogspot detector (MS1-T10)
  provider: string | null;
}

export type NapField = "name" | "address" | "phone";
export interface NapMatchRow {
  field: NapField;
  gbp_value: string | null;
  website_value: string | null;
  match: boolean;
}

export type ContentDepthBand = "thin" | "light" | "good" | "strong";

export interface HeadingNode {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  skip_flag: boolean; // e.g. H5 directly under H2
  children: HeadingNode[];
}

/** EP-014 response — everything P3b renders. */
export interface WebsiteAuditDetail {
  summary: WebsiteAuditSummary;
  nap: NapMatchRow[];
  title: { value: string | null; has_category: boolean; has_city: boolean };
  meta: {
    value: string | null;
    has_category: boolean;
    has_locality: boolean;
    ai_suggestions: string[]; // 2 replacements
  };
  local_keywords: Array<{ keyword: string; found: boolean; snippets: string[] }>;
  hours_match: Array<{ day: string; gbp: string; website: string; match: boolean }>;
  category_pages: Array<{ category: string; matched_page: string | null }>;
  content_depth: { word_count: number; band: ContentDepthBand };
  spelling_issues: Array<{ found: string; suggested: string; location: string }>;
  headings: HeadingNode[];
  heading_skips: string[]; // e.g. ["H2→H5", "H3→H6"]
  click_to_call: "ok" | "missing" | "not_applicable";
}
