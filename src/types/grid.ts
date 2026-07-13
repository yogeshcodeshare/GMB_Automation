/** TB-004/005 + P5 Grid Scan / Teleport shapes. */

export type GridSize = 1 | 3 | 5 | 7; // 1 = Teleport (single point)
export type GridScanStatus = "queued" | "running" | "done" | "failed" | "partial";

export interface GridScan {
  id: string;
  business_id: string;
  keyword: string;
  grid_size: GridSize;
  radius_m: number;
  status: GridScanStatus;
  avg_rank: number | null;
  cost_usd: number | null;
  created_at: string;
}

export interface GridPoint {
  id: number;
  scan_id: string;
  lat: number;
  lng: number;
  rank: number | null; // null = not in top 20 (band.none pin)
}

export interface RankEntry {
  position: number;
  name: string;
  rating: number | null;
  reviews: number | null;
  cid: string | null;
  is_target: boolean;
  area?: string; // optional locality under the name in the teleport top-10 (P5 display)
}

/** Pin-click popover (P5): rank + top-5 at that point + distance.
 *  `top5` may be [] for scans run before per-point top-N persistence
 *  (grid_points.top_ranks) or when the pack was unavailable. */
export interface GridPointDetail extends GridPoint {
  distance_km: number; // business ↔ pin
  direction: string; // e.g. "SE"
  top5: RankEntry[];
}

/** Powers the P5 "rank ≠ demand" card (scanned niche term vs a broader term).
 *  Backend fills volumes via keywords_data when available; any field may be null. */
export interface DemandHint {
  scanned_keyword: string;
  scanned_volume: number | null; // e.g. "hypno clinic" ≈ 20/mo
  broader_keyword: string | null; // e.g. "mental health clinic karad"
  broader_volume: number | null; // ≈ 320/mo
}

/** "Who owns this area" table (P5). */
export interface AreaOwnershipRow {
  name: string;
  avg_rank: number;
  best_rank: number;
  worst_rank: number;
  top3_count: number;
  distance_km: number | null;
  is_target: boolean;
}

export interface GridScanResult {
  scan: GridScan;
  center: { lat: number; lng: number }; // target/business pin — map draws rings + TARGET here
  points: GridPointDetail[]; // extends GridPoint; carries per-pin top5 + distance + direction
  in_top3_pct: number;
  weak_direction: string | null; // e.g. "south-east (Malkapur side)"
  ownership: AreaOwnershipRow[];
  demand_hint: DemandHint | null; // rank ≠ demand card (null if no volume data)
}

/** Teleport (grid_size 1): pin + distance + full top-10. */
export interface TeleportResult {
  scan: GridScan;
  center: { lat: number; lng: number }; // business pin (for the "distance from pin" line)
  point: GridPoint;
  distance_km: number;
  top10: RankEntry[];
}

/** Before/after compare incl. per-business movement (MS2-T07). */
export interface GridCompare {
  before: GridScanResult;
  after: GridScanResult;
  avg_rank_delta: number; // negative = improved
  movement: Array<{ name: string; before_avg: number; after_avg: number; delta: number }>;
}

/** EP-003 request. */
export interface GridScanRequest {
  preview?: boolean;
  business_id: string;
  keyword: string;
  grid_size: GridSize;
  radius_m: number;
  /** Teleport target point (required when grid_size = 1). */
  lat?: number;
  lng?: number;
}
