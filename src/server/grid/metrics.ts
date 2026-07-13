import type { AreaOwnershipRow, RankEntry } from "@/types";
import type { RawMapsItem } from "@/server/dataforseo/types";
import { normalizeForMatch } from "@/server/website/html";

/** MS2-T03/T07 — rank extraction + scan metrics. */

export interface TargetRef {
  cid: string | null;
  place_id: string | null;
  name: string;
}

/** The target's rank at one pin: 1..20, null = not in top 20. */
export function extractRank(items: RawMapsItem[], target: TargetRef): number | null {
  const normName = normalizeForMatch(target.name);
  for (const item of items) {
    const matched =
      (target.cid && item.cid === target.cid) ||
      (target.place_id && item.place_id === target.place_id) ||
      (normName.length > 0 &&
        item.title !== undefined &&
        normalizeForMatch(item.title) === normName);
    if (matched) {
      const rank = item.rank_group ?? item.rank_absolute ?? null;
      return rank !== null && rank <= 20 ? rank : null;
    }
  }
  return null;
}

export function toRankEntries(
  items: RawMapsItem[],
  target: TargetRef,
  top: number
): RankEntry[] {
  return items
    .filter((i) => Boolean(i.title))
    .slice(0, top)
    .map((i, idx) => ({
      position: i.rank_group ?? idx + 1,
      name: i.title as string,
      rating: i.rating?.value ?? null,
      reviews: i.rating?.votes_count ?? null,
      cid: i.cid ?? null,
      is_target:
        (target.cid !== null && i.cid === target.cid) ||
        (target.place_id !== null && i.place_id === target.place_id),
    }));
}

export function avgRank(ranks: Array<number | null>): number | null {
  const found = ranks.filter((r): r is number => r !== null);
  if (found.length === 0) return null;
  return Math.round((found.reduce((a, b) => a + b, 0) / found.length) * 10) / 10;
}

export function inTop3Pct(ranks: Array<number | null>): number {
  if (ranks.length === 0) return 0;
  const top3 = ranks.filter((r) => r !== null && r <= 3).length;
  return Math.round((top3 / ranks.length) * 100);
}

const SECTORS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const;

export function directionOf(
  center: { lat: number; lng: number },
  point: { lat: number; lng: number }
): string {
  const dLat = point.lat - center.lat;
  const dLng = point.lng - center.lng;
  if (dLat === 0 && dLng === 0) return "center";
  // Compass bearing: 0° = north, clockwise.
  const deg = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  const bearing = (deg + 360) % 360;
  return SECTORS[Math.round(bearing / 45) % 8];
}

/** MS2 metric: the compass sector ranking clearly worse than the rest
 * (not-in-top-20 counts as rank 20). Null when no sector stands out. */
export function weakDirection(
  center: { lat: number; lng: number },
  points: Array<{ lat: number; lng: number; rank: number | null }>
): string | null {
  const bySector = new Map<string, number[]>();
  for (const p of points) {
    const dir = directionOf(center, p);
    if (dir === "center") continue;
    const list = bySector.get(dir) ?? [];
    list.push(p.rank ?? 20);
    bySector.set(dir, list);
  }
  const all = points.map((p) => p.rank ?? 20);
  const overall = all.reduce((a, b) => a + b, 0) / Math.max(1, all.length);
  let worst: { dir: string; avg: number } | null = null;
  bySector.forEach((ranks, dir) => {
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    if (!worst || avg > worst.avg) worst = { dir, avg };
  });
  const w = worst as { dir: string; avg: number } | null;
  if (!w) return null;
  return w.avg >= overall + 2 ? w.dir : null;
}

/**
 * "Who owns this area" (P5) — DERIVED ON READ from the per-pin RankEntry
 * packs persisted in grid_points.top_ranks (contract lock, 14 Jul).
 * distance_km is null for competitors (the packs carry no coordinates —
 * flagged in HANDOFF); the target's own distance is 0 by definition.
 */
export function buildOwnership(
  perPointPacks: RankEntry[][],
  limit = 10
): AreaOwnershipRow[] {
  interface Acc {
    name: string;
    ranks: number[];
    isTarget: boolean;
  }
  const acc = new Map<string, Acc>();
  for (const pack of perPointPacks) {
    for (const entry of pack) {
      if (!entry.name || entry.position > 20) continue;
      const key = entry.cid ?? normalizeForMatch(entry.name);
      const a = acc.get(key) ?? {
        name: entry.name,
        ranks: [],
        isTarget: entry.is_target,
      };
      a.ranks.push(entry.position);
      a.isTarget = a.isTarget || entry.is_target;
      acc.set(key, a);
    }
  }
  const rows: AreaOwnershipRow[] = [];
  acc.forEach((a) => {
    rows.push({
      name: a.name,
      avg_rank: Math.round((a.ranks.reduce((x, y) => x + y, 0) / a.ranks.length) * 10) / 10,
      best_rank: Math.min(...a.ranks),
      worst_rank: Math.max(...a.ranks),
      top3_count: a.ranks.filter((r) => r <= 3).length,
      distance_km: a.isTarget ? 0 : null,
      is_target: a.isTarget,
    });
  });
  rows.sort((a, b) => a.avg_rank - b.avg_rank || b.top3_count - a.top3_count);
  const trimmed = rows.slice(0, limit);
  // The target always appears, even when it ranks below the cut.
  if (!trimmed.some((r) => r.is_target)) {
    const t = rows.find((r) => r.is_target);
    if (t) trimmed.push(t);
  }
  return trimmed;
}
