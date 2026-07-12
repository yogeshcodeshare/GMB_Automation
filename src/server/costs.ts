/**
 * Cost model — single source for estimates + the ₹ display rate (§2.6,
 * docs/agents/API_CONTRACT.md "Cost model"). Every paid endpoint's preview
 * and SpendGuard estimate must come from here, never ad-hoc numbers.
 */

export const INR_PER_USD = 85;

/** Per-call vendor unit costs (§2.6, verified July 2026). */
export const COST_USD = {
  my_business_info: 0.002,
  reviews_task: 0.00075,
  my_business_updates: 0.002,
  serp_maps_standard: 0.0006,
  serp_maps_live: 0.002,
  local_finder: 0.002,
  keywords_data_per_kw: 0.00005,
  on_page_per_page: 0.000125,
} as const;

/** Operation-level estimates used in cost previews (matches the contract table). */
export const ESTIMATE_USD = {
  audit_base: 0.022, // profile + reviews + posts + top-3 competitors → "₹1.9"
  audit_top5_extra: 0.004,
  website_audit_extra: 0.003,
  grid_point_standard: COST_USD.serp_maps_standard,
  teleport: COST_USD.serp_maps_live,
  public_check: 0.002,
} as const;

export function toInr(usd: number): number {
  return Math.round(usd * INR_PER_USD * 10) / 10;
}

export function auditEstimateUsd(opts: {
  competitors: 3 | 5;
  website_audit: boolean;
}): number {
  return (
    ESTIMATE_USD.audit_base +
    (opts.competitors === 5 ? ESTIMATE_USD.audit_top5_extra : 0) +
    (opts.website_audit ? ESTIMATE_USD.website_audit_extra : 0)
  );
}

export function gridEstimateUsd(gridSize: 1 | 3 | 5 | 7): number {
  if (gridSize === 1) return ESTIMATE_USD.teleport;
  return gridSize * gridSize * ESTIMATE_USD.grid_point_standard;
}
