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
}

/** Pin-click popover (P5): rank + top-5 at that point + distance. */
export interface GridPointDetail extends GridPoint {
  distance_km: number; // business ↔ pin
  direction: string; // e.g. "SE"
  top5: RankEntry[];
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
  points: GridPoint[];
  in_top3_pct: number;
  weak_direction: string | null; // e.g. "south-east (Malkapur side)"
  ownership: AreaOwnershipRow[];
}

/** Teleport (grid_size 1): pin + distance + full top-10. */
export interface TeleportResult {
  scan: GridScan;
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
