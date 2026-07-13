import type {
  AreaOwnershipRow,
  GridCompare,
  GridPoint,
  GridPointDetail,
  GridScanResult,
  GridSize,
  RankEntry,
  TeleportResult,
} from "@/types";
import { businessesMock } from "./businesses";

/**
 * Typed mocks of EP-003/004 — the Manovedh "hypno clinic" scans (11 Jul run,
 * 02 May baseline) verbatim from the design prototype. Swapped for the real
 * routes on Day 5 (M2).
 */

const manovedh = businessesMock[0];
const CENTER = { lat: manovedh.lat ?? 17.2891, lng: manovedh.lng ?? 74.1844 };

/** ₹ preview per grid size (§2.6: point ≈ $0.0006 · teleport ≈ ₹0.2). */
export const gridCostInr: Record<GridSize, string> = {
  1: "0.2",
  3: "0.5",
  5: "1.4",
  7: "2.7",
};

/** Rank matrices — [row][col], row 0 = north. Center point = the business. */
export const gridJulMatrix = [
  [2, 1, 3, 3, 7],
  [1, 1, 2, 4, 9],
  [1, 1, 1, 5, 11],
  [2, 2, 3, 8, 14],
  [3, 4, 6, 9, 13],
];
export const gridMayMatrix = [
  [4, 3, 5, 7, 11],
  [3, 3, 4, 8, 13],
  [2, 2, 3, 9, 15],
  [4, 5, 7, 12, 18],
  [6, 8, 10, 14, 21],
];

const KM_PER_DEG_LAT = 110.574;
const kmPerDegLng = KM_PER_DEG_LAT * Math.cos((CENTER.lat * Math.PI) / 180);

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function compass(rowOff: number, colOff: number): string {
  if (rowOff === 0 && colOff === 0) return "center";
  // row 0 = north, so +rowOff = south; +colOff = east.
  const angle = (Math.atan2(colOff, -rowOff) * 180) / Math.PI; // 0 = N, 90 = E
  return COMPASS[(Math.round(((angle + 360) % 360) / 45) % 8)];
}

/** Matrix → GridPointDetail[] positioned around the business (radius spread).
 * top5 is [] in mocks (the real popover pack comes from grid_points.top_ranks). */
export function matrixToPoints(
  matrix: number[][],
  scanId: string,
  radiusKm: number,
): GridPointDetail[] {
  const n = matrix.length;
  const half = (n - 1) / 2;
  return matrix.flatMap((row, ri) =>
    row.map((rank, ci) => {
      const rowOff = ri - half;
      const colOff = ci - half;
      return {
        id: ri * n + ci + 1,
        scan_id: scanId,
        lat: CENTER.lat - (rowOff / half) * (radiusKm / KM_PER_DEG_LAT),
        lng: CENTER.lng + (colOff / half) * (radiusKm / kmPerDegLng),
        rank: rank >= 20 ? null : rank,
        distance_km: Math.round(Math.hypot(rowOff, colOff) * (radiusKm / half) * 10) / 10,
        direction: compass(rowOff, colOff),
        top5: [] as RankEntry[],
      };
    }),
  );
}

/** Grid step in km between adjacent points (prototype uses 0.75 km). */
export const GRID_STEP_KM = 0.75;

export function pointDistanceKm(ri: number, ci: number): number {
  return Math.hypot(ci - 2, ri - 2) * GRID_STEP_KM;
}

export function pointDirection(ri: number, ci: number): string {
  if (ri === 2 && ci === 2) return "center";
  const ns = ri < 2 ? "N" : ri > 2 ? "S" : "";
  const ew = ci > 2 ? "E" : ci < 2 ? "W" : "";
  return ns + ew;
}

/** Businesses seen across the grid (popover top-5 derivation, prototype). */
export const gridOthersMock = [
  "Avani Hypnotism & Wellness",
  "Hypnotherapy Siddhivinayak",
  "Hypno Healling Clinic",
  "Dr. Rajkumar Shikhare's",
  "Better Hypnotherapy Services",
];

/** Top-5 names at a point given the target's rank there (prototype logic). */
export function top5AtPoint(rank: number): string[] {
  if (rank <= 5) {
    return [
      ...gridOthersMock.slice(0, rank - 1),
      "मनोवेध हिप्नोक्लिनिक",
      ...gridOthersMock.slice(rank - 1),
    ].slice(0, 5);
  }
  return gridOthersMock.slice(0, 5);
}

const ownershipMock: AreaOwnershipRow[] = [
  { name: "मनोवेध हिप्नोक्लिनिक", avg_rank: 4.6, best_rank: 1, worst_rank: 21, top3_count: 14, distance_km: null, is_target: true },
  { name: "Avani Hypnotism & Wellness", avg_rank: 2.9, best_rank: 1, worst_rank: 8, top3_count: 19, distance_km: 0.4, is_target: false },
  { name: "Hypnotherapy Siddhivinayak", avg_rank: 3.4, best_rank: 1, worst_rank: 9, top3_count: 16, distance_km: 1.1, is_target: false },
  { name: "Hypno Healling Clinic", avg_rank: 5.8, best_rank: 2, worst_rank: 14, top3_count: 9, distance_km: 2.3, is_target: false },
  { name: "Dr. Rajkumar Shikhare's", avg_rank: 7.2, best_rank: 3, worst_rank: 17, top3_count: 5, distance_km: 1.8, is_target: false },
  { name: "Better Hypnotherapy Services", avg_rank: 9.4, best_rank: 5, worst_rank: 21, top3_count: 2, distance_km: 2.9, is_target: false },
  { name: "Sukhmani Counselling Centre", avg_rank: 11.1, best_rank: 6, worst_rank: 21, top3_count: 0, distance_km: 0.9, is_target: false },
  { name: "Mindwell Hypnosis", avg_rank: 13.8, best_rank: 8, worst_rank: 21, top3_count: 0, distance_km: 3.4, is_target: false },
];

export const gridJulResultMock: GridScanResult = {
  scan: {
    id: "scan-jul",
    business_id: manovedh.id,
    keyword: "hypno clinic",
    grid_size: 5,
    radius_m: 1500,
    status: "done",
    avg_rank: 4.6,
    cost_usd: 0.0165,
    created_at: "2026-07-11T09:30:00+05:30",
  },
  center: CENTER,
  points: matrixToPoints(gridJulMatrix, "scan-jul", 1.5),
  in_top3_pct: 56,
  weak_direction: "south-east (Malkapur side)",
  ownership: ownershipMock,
  demand_hint: {
    scanned_keyword: "hypno clinic",
    scanned_volume: 20,
    broader_keyword: "mental health clinic karad",
    broader_volume: 320,
  },
};

export const gridMayResultMock: GridScanResult = {
  scan: {
    id: "scan-may",
    business_id: manovedh.id,
    keyword: "hypno clinic",
    grid_size: 5,
    radius_m: 1500,
    status: "done",
    avg_rank: 7.8,
    cost_usd: 0.0165,
    created_at: "2026-05-02T10:05:00+05:30",
  },
  center: CENTER,
  points: matrixToPoints(gridMayMatrix, "scan-may", 1.5),
  in_top3_pct: 24,
  weak_direction: "south-east (Malkapur side)",
  ownership: [],
  demand_hint: null,
};

/** Scan-history rows (top-3 % comes with each GridScanResult). */
export const gridHistoryMock = [
  { date: "11 Jul 2026", avg: 4.6, top3_pct: 56, this_run: true },
  { date: "04 Jun 2026", avg: 6.1, top3_pct: 36, this_run: false },
  { date: "02 May 2026", avg: 7.8, top3_pct: 24, this_run: false },
];

export const gridCompareMock: GridCompare = {
  before: gridMayResultMock,
  after: gridJulResultMock,
  avg_rank_delta: -3.2, // negative = improved
  movement: [
    { name: "मनोवेध हिप्नोक्लिनिक (target)", before_avg: 7.8, after_avg: 4.6, delta: -3.2 },
    { name: "Avani Hypnotism & Wellness", before_avg: 2.1, after_avg: 2.9, delta: 0.8 },
    { name: "Hypnotherapy Siddhivinayak", before_avg: 3.1, after_avg: 3.4, delta: 0.3 },
    { name: "Hypno Healling Clinic", before_avg: 5.2, after_avg: 5.8, delta: 0.6 },
  ],
};

const teleportTop10: RankEntry[] = [
  { position: 1, name: "मनोवेध हिप्नोक्लिनिक", rating: 4.9, reviews: 30, cid: manovedh.cid, is_target: true },
  { position: 2, name: "Avani Hypnotism & Wellness", rating: 4.7, reviews: 18, cid: null, is_target: false },
  { position: 3, name: "Hypnotherapy", rating: 4.8, reviews: 44, cid: null, is_target: false },
  { position: 4, name: "Hypno Healling Clinic", rating: 4.6, reviews: 27, cid: null, is_target: false },
  { position: 5, name: "Better Hypnotherapy Services", rating: 4.4, reviews: 9, cid: null, is_target: false },
  { position: 6, name: "Hypnotherapy Clinic & Clinical Psychology", rating: 4.6, reviews: 15, cid: null, is_target: false },
  { position: 7, name: "Dr. Rajkumar Shikhare's Hypnotherapy", rating: 4.5, reviews: 22, cid: null, is_target: false },
  { position: 8, name: "Dr. G R Karthik, Clinical Hypnotherapist", rating: 4.7, reviews: 11, cid: null, is_target: false },
  { position: 9, name: "Bharat Academy", rating: 4.3, reviews: 40, cid: null, is_target: false },
  { position: 10, name: "Mindwell Hypnosis", rating: 4.2, reviews: 7, cid: null, is_target: false },
];

/**
 * Display-only areas for the teleport top-10 (RankEntry has no `area` field —
 * minor contract suggestion raised in HANDOFF).
 */
export const teleportAreasMock: Record<string, string> = {
  "मनोवेध हिप्नोक्लिनिक": "Somwar Peth",
  "Avani Hypnotism & Wellness": "Janvhi Arcade",
  Hypnotherapy: "Siddhivinayak Nagar",
  "Hypno Healling Clinic": "Rajan Building",
  "Better Hypnotherapy Services": "Mangalwar Peth",
  "Hypnotherapy Clinic & Clinical Psychology": "Shaniwar Peth",
  "Dr. Rajkumar Shikhare's Hypnotherapy": "Station Rd",
  "Dr. G R Karthik, Clinical Hypnotherapist": "Vidyanagar",
  "Bharat Academy": "Guruwar Peth",
  "Mindwell Hypnosis": "Koyna Vasahat",
};

export const teleportResultMock: TeleportResult = {
  scan: {
    id: "scan-teleport",
    business_id: manovedh.id,
    keyword: "hypno clinic",
    grid_size: 1,
    radius_m: 0,
    status: "done",
    avg_rank: 1,
    cost_usd: 0.0024,
    created_at: "2026-07-13T11:00:00+05:30",
  },
  center: CENTER,
  point: {
    id: 1,
    scan_id: "scan-teleport",
    lat: 17.2915,
    lng: 74.1808,
    rank: 1,
  },
  distance_km: 0.2,
  top10: teleportTop10,
};

/** "Karad bus stand area" caption for the teleport point. */
export const teleportAreaNoteMock = "Karad bus stand area";

/** "Rank ≠ demand" card — keyword volume pairing (keywords_data on Day 5). */
export const keywordDemandMock = [
  { keyword: "hypno clinic", volume: 20 },
  { keyword: "mental health clinic karad", volume: 320 },
];
