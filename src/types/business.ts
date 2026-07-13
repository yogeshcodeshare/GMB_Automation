/** TB-001 businesses — field names mirror the DB columns (snake_case). */

export type ConnectionStatus = "none" | "manager" | "oauth";

export type PlanAddon = "content" | "whatsapp" | "social" | "ads";

/** ADR-010 entitlements stored on businesses.plan (jsonb). */
export interface Plan {
  base: "gmb_boost";
  addons: PlanAddon[];
}

export interface Business {
  id: string;
  name: string;
  city: string | null;
  place_id: string | null;
  cid: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  is_client: boolean;
  gbp_location_id: string | null;
  plan: Plan | null;
  connection_status: ConnectionStatus;
  owner_name: string | null;
  owner_whatsapp: string | null;
  created_at: string;
}

/** P1 dashboard row = business + latest score + optional sprint delta. */
export interface BusinessListItem extends Business {
  latest_score: number | null;
  latest_audit_at: string | null;
  sprint_delta: number | null; // e.g. +37 → "78 ▲37" badge
}

/**
 * P2 candidate card (New Audit picker). One guarded serp/maps call resolves
 * name+city → the Google matches the founder chooses from before running the
 * paid audit. Not persisted — a lookup result. (Added Day 2, backend proposal.)
 */
export interface BusinessCandidate {
  name: string;
  address: string | null;
  place_id: string;
  cid: string | null;
  rating: number | null;
  reviews_total: number | null;
}
