/** Shared API envelope — every EP-xxx endpoint returns exactly this shape. */

export type ErrorCode =
  | "SPEND_CAP_REACHED" // EP-012 guard blocked a paid call
  | "RATE_LIMITED" // public checker limits (3/IP/day, 50/day global)
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN" // e.g. sprint on a non-client (plan gate)
  | "FEATURE_DISABLED" // wa.service / GBP publish behind flags
  | "LIVE_DATA_DISABLED" // CR-1: settings.dataforseo_live_enabled is off (503)
  | "UPSTREAM_ERROR" // DataForSEO / PSI / Groq failure
  | "UPSTREAM_TIMEOUT"
  | "INTERNAL";

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * Cost preview (hard product rule: every paid action shows ₹ before running).
 * Paid POST endpoints accept `{ preview: true }` and return this instead of running.
 */
export interface CostPreview {
  estimated_cost_usd: number;
  estimated_cost_inr: number;
  breakdown?: Array<{ item: string; cost_usd: number }>;
}

export type Language = "mr" | "en" | "hinglish";
