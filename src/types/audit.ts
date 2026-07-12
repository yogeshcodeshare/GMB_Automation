import type { Business } from "./business";
import type { PostAuditStats } from "./post";
import type { ReviewStats } from "./review";
import type { WebsiteAuditSummary } from "./website";

/** Rubric §2.5 — deterministic, no AI. */
export type RubricKey =
  | "claimed"
  | "category"
  | "completeness"
  | "photos"
  | "reviews_count"
  | "reviews_velocity"
  | "reply_rate"
  | "posts"
  | "website"
  | "nap";

export const RUBRIC_MAX: Record<RubricKey, number> = {
  claimed: 10,
  category: 15,
  completeness: 15,
  photos: 10,
  reviews_count: 10,
  reviews_velocity: 8,
  reply_rate: 7,
  posts: 10,
  website: 10,
  nap: 5,
};

export type ScoreBand = "red" | "amber" | "green";

/** Red <40 · Amber 40–70 · Green >70 (§2.5). */
export function bandFor(total: number): ScoreBand {
  if (total < 40) return "red";
  if (total <= 70) return "amber";
  return "green";
}

/** TB-002 audits row. */
export interface Audit {
  id: string;
  business_id: string;
  raw_snapshot: Record<string, unknown>;
  competitor_ids: string[];
  created_at: string;
}

/** TB-003 audit_scores row. */
export interface AuditScores {
  audit_id: string;
  total: number;
  claimed: number;
  category: number;
  completeness: number;
  photos: number;
  reviews_count: number;
  reviews_velocity: number;
  reply_rate: number;
  posts: number;
  website: number;
  nap: number;
}

export type RubricRowStatus = "pass" | "warn" | "fail";

/** One row of the P3 rubric checklist (status chip + reason + points). */
export interface RubricRow {
  key: RubricKey;
  label: string;
  status: RubricRowStatus;
  points: number;
  max: number;
  reason: string; // one-line, e.g. `"Hospital" is generic — competitors use "Mental health clinic"`
}

/** MS1-T10 sanity checks surfaced on the audit page. */
export interface SanityFlag {
  key:
    | "phone_missing"
    | "services_empty"
    | "hours_anomaly"
    | "generic_category"
    | "rented_subdomain"
    | "nap_mismatch";
  severity: "warn" | "fail";
  message: string;
}

/** MS1-T09 link-generator pack (~25 templated links, zero API cost). */
export interface LinkPackItem {
  label: string;
  url: string;
}
export interface LinkPackGroup {
  group: "google" | "maps" | "marketing" | "website";
  links: LinkPackItem[];
}

export interface TopFixes {
  lang: "mr" | "en";
  items: string[]; // top 5, AI-drafted, founder-editable
}

export interface HoursDay {
  day: string;
  text: string;
  anomaly: boolean;
}

/** EP-002 response — everything P3 Audit Report renders. */
export interface AuditReport {
  business: Business;
  audit: Audit;
  scores: AuditScores;
  band: ScoreBand;
  rubric: RubricRow[];
  sanity_flags: SanityFlag[];
  hours: HoursDay[];
  categories: { primary: string | null; secondary: string[]; primary_flagged: boolean };
  attributes: Record<string, string[]>;
  links_pack: LinkPackGroup[];
  top_fixes: TopFixes[];
  review_stats: ReviewStats | null;
  post_stats: PostAuditStats | null;
  website: WebsiteAuditSummary | null;
  competitors: CompetitorCompareRow[];
}

/** P4 Competitor Compare — one column per competitor. */
export interface CompetitorCompareRow {
  business_id: string | null; // null until persisted
  name: string;
  distance_km: number | null;
  primary_category: string | null;
  rating: number | null;
  reviews_total: number | null;
  velocity_6m: number | null; // reviews/month
  reply_rate_pct: number | null;
  photos: number | null;
  services_count: number | null;
  is_target: boolean;
}

/** EP-001 request. */
export interface AuditRequest {
  preview?: boolean; // true → CostPreview, nothing runs
  business_id?: string; // re-audit an existing business
  name?: string; // or resolve by name+city
  city?: string;
  place_id?: string; // manual fallback
  cid?: string;
  options: {
    competitors: 3 | 5;
    website_audit: boolean;
    post_audit: boolean;
  };
}

/** Staged progress for P2 (profile→reviews→posts→competitors→website→scoring). */
export type AuditStage =
  | "profile"
  | "reviews"
  | "posts"
  | "competitors"
  | "website"
  | "scoring";
export interface AuditProgress {
  audit_id: string;
  stage: AuditStage;
  done_stages: AuditStage[];
  status: "running" | "done" | "failed" | "partial";
  detail?: string; // e.g. "my_business_updates — 7 posts found"
}
