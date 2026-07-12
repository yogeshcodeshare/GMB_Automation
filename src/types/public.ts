import type { ScoreBand } from "./audit";

/** TB-008 + P10 Public Score Checker (EP-008/009, US-009). */

export interface LeadPublic {
  id: string;
  phone: string;
  business_name: string;
  consent_ts: string;
  score_shown: number | null;
  report_sent: boolean;
  created_at: string;
}

export interface PublicCheckRequest {
  business_name: string;
  city: string;
  turnstile_token: string;
}

/** Partial result: gauge + 2 visible problems + blurred teaser count. */
export interface PublicCheckResult {
  check_id: string;
  business_name: string;
  score: number;
  band: ScoreBand;
  visible_problems: string[]; // exactly 2, Marathi-first
  locked_problem_count: number; // "आणखी N समस्या सापडल्या"
}

export interface PublicLeadRequest {
  check_id: string;
  phone: string; // +91 …
  consent: true; // checkbox text stored with timestamp (TB-008, DPDP-lite)
}
