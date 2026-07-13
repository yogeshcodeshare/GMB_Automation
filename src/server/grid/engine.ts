import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Business,
  GridCompare,
  GridPoint,
  GridPointDetail,
  GridScan,
  GridScanRequest,
  GridScanResult,
  RankEntry,
  TeleportResult,
} from "@/types";
import { ESTIMATE_USD, gridEstimateUsd } from "@/server/costs";
import type { DataForSeoClient } from "@/server/dataforseo/client";
import type { RawMapsItem } from "@/server/dataforseo/types";
import { haversineKm, roundKm } from "@/server/audit/geo";
import { gridPoints, type LatLng } from "./generator";
import {
  avgRank,
  buildOwnership,
  directionOf,
  extractRank,
  inTop3Pct,
  toRankEntries,
  weakDirection,
  type TargetRef,
} from "./metrics";

/** EP-003/004 — grid scan / Teleport engine (MS2-T01..T07). */

export interface GridDeps {
  dfs: DataForSeoClient;
  db: SupabaseClient;
}

/** Per-pin detail (popovers) + ownership snapshot. Persisted into
 * grid_scans.results (jsonb, proposed migration) so EP-004 answers after a
 * restart; kept in this registry as the fallback until the column lands. */
interface ScanResults {
  points_detail: Array<{
    lat: number;
    lng: number;
    rank: number | null;
    distance_km: number;
    direction: string;
    top5: RankEntry[];
  }>;
  ownership: ReturnType<typeof buildOwnership>;
  weak_direction: string | null;
  in_top3_pct: number;
  teleport_top10: RankEntry[] | null;
}
const resultsRegistry = new Map<string, ScanResults>();

const POINT_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    }
  );
  await Promise.all(workers);
  return out;
}

export interface StartedGridScan {
  scan_id: string;
  done: Promise<void>;
}

export async function startGridScan(
  deps: GridDeps,
  req: GridScanRequest
): Promise<StartedGridScan> {
  const { db } = deps;

  const { data: businessRow, error: bizErr } = await db
    .from("businesses")
    .select()
    .eq("id", req.business_id)
    .maybeSingle();
  if (bizErr) throw new Error(`business read failed: ${bizErr.message}`);
  if (!businessRow) throw new Error("NOT_FOUND");
  const business = businessRow as Business;

  const isTeleport = req.grid_size === 1;
  const center: LatLng | null = isTeleport
    ? req.lat !== undefined && req.lng !== undefined
      ? { lat: req.lat, lng: req.lng }
      : null
    : business.lat !== null && business.lng !== null
      ? { lat: business.lat, lng: business.lng }
      : null;
  if (!center) {
    throw new Error(
      isTeleport
        ? "VALIDATION:teleport needs lat + lng (the pin to stand on)"
        : "VALIDATION:business has no coordinates — run an audit first"
    );
  }

  const { data: scanRow, error: scanErr } = await db
    .from("grid_scans")
    .insert({
      business_id: business.id,
      keyword: req.keyword,
      grid_size: req.grid_size,
      radius_m: req.radius_m,
      status: "queued",
    })
    .select()
    .single();
  if (scanErr) throw new Error(`grid scan insert failed: ${scanErr.message}`);
  const scanId = (scanRow as GridScan).id;

  const done = runScan(deps, scanId, business, req, center).catch(async (e) => {
    await db
      .from("grid_scans")
      .update({ status: "failed" })
      .eq("id", scanId);
    throw e;
  });
  // Callers may fire-and-forget; the row carries the failure state.
  done.catch(() => undefined);

  return { scan_id: scanId, done };
}

async function runScan(
  deps: GridDeps,
  scanId: string,
  business: Business,
  req: GridScanRequest,
  center: LatLng
): Promise<void> {
  const { db, dfs } = deps;
  const isTeleport = req.grid_size === 1;
  const points = isTeleport
    ? [center]
    : gridPoints(
        { lat: business.lat as number, lng: business.lng as number },
        req.grid_size,
        req.radius_m
      );

  await db.from("grid_scans").update({ status: "running" }).eq("id", scanId);

  const target: TargetRef = {
    cid: business.cid,
    place_id: business.place_id,
    name: business.name,
  };

  const perPoint = await mapWithConcurrency(points, POINT_CONCURRENCY, async (p) => {
    try {
      const serp = await dfs.serpMaps(
        {
          keyword: req.keyword,
          location_coordinate: `${p.lat},${p.lng},14z`,
          depth: 20,
        },
        isTeleport ? "live" : "standard"
      );
      return { point: p, items: serp?.items ?? [], failed: false };
    } catch {
      return { point: p, items: [] as RawMapsItem[], failed: true };
    }
  });

  const allFailed = perPoint.every((r) => r.failed);
  const ranks = perPoint.map((r) =>
    r.failed ? null : extractRank(r.items, target)
  );

  // Persist pins (TB-005).
  const pinRows = perPoint.map((r, i) => ({
    scan_id: scanId,
    lat: r.point.lat,
    lng: r.point.lng,
    rank: ranks[i],
  }));
  const del = await db.from("grid_points").delete().eq("scan_id", scanId);
  if (del.error) throw new Error(`grid points reset failed: ${del.error.message}`);
  const ins = await db.from("grid_points").insert(pinRows);
  if (ins.error) throw new Error(`grid points insert failed: ${ins.error.message}`);

  const results: ScanResults = {
    points_detail: perPoint.map((r, i) => ({
      lat: r.point.lat,
      lng: r.point.lng,
      rank: ranks[i],
      distance_km:
        business.lat !== null && business.lng !== null
          ? roundKm(haversineKm(business.lat, business.lng, r.point.lat, r.point.lng))
          : 0,
      direction:
        business.lat !== null && business.lng !== null
          ? directionOf({ lat: business.lat, lng: business.lng }, r.point)
          : "center",
      top5: toRankEntries(r.items, target, 5),
    })),
    ownership: buildOwnership(perPoint, {
      ...target,
      lat: business.lat,
      lng: business.lng,
    }),
    weak_direction: weakDirection(center, pinRows),
    in_top3_pct: inTop3Pct(ranks),
    teleport_top10: isTeleport ? toRankEntries(perPoint[0].items, target, 10) : null,
  };
  resultsRegistry.set(scanId, results);

  const unitCost = isTeleport
    ? ESTIMATE_USD.teleport
    : ESTIMATE_USD.grid_point_standard;
  const scanPatch = {
    status: allFailed ? "failed" : perPoint.some((r) => r.failed) ? "partial" : "done",
    avg_rank: avgRank(ranks),
    // Estimate-based; the ledger (TB-010) holds the settled vendor costs.
    cost_usd: Math.round(points.length * unitCost * 10_000) / 10_000,
  };

  // Try with the proposed jsonb column; fall back gracefully until the
  // migration lands (results then live in the in-process registry only).
  const withResults = await db
    .from("grid_scans")
    .update({ ...scanPatch, results })
    .eq("id", scanId);
  if (withResults.error) {
    const base = await db.from("grid_scans").update(scanPatch).eq("id", scanId);
    if (base.error) throw new Error(`grid scan update failed: ${base.error.message}`);
  }
}

// ---------- EP-004 reads ----------

async function loadScan(
  db: SupabaseClient,
  scanId: string
): Promise<{ scan: GridScan; points: GridPoint[]; results: ScanResults | null } | null> {
  const { data, error } = await db
    .from("grid_scans")
    .select()
    .eq("id", scanId)
    .maybeSingle();
  if (error) throw new Error(`grid scan read failed: ${error.message}`);
  if (!data) return null;
  const { results: storedResults, ...scan } = data as GridScan & {
    results?: ScanResults | null;
  };
  const { data: pointRows, error: pErr } = await db
    .from("grid_points")
    .select()
    .eq("scan_id", scanId);
  if (pErr) throw new Error(`grid points read failed: ${pErr.message}`);
  return {
    scan: scan as GridScan,
    points: (pointRows ?? []) as GridPoint[],
    results: storedResults ?? resultsRegistry.get(scanId) ?? null,
  };
}

export async function getGridResult(
  db: SupabaseClient,
  scanId: string
): Promise<GridScanResult | TeleportResult | null> {
  const loaded = await loadScan(db, scanId);
  if (!loaded) return null;
  const { scan, points, results } = loaded;

  // center = the target business location (map rings + teleport distance line).
  const { data: biz } = await db
    .from("businesses")
    .select("lat, lng")
    .eq("id", scan.business_id)
    .maybeSingle();
  const center = {
    lat: (biz?.lat as number | null) ?? points[0]?.lat ?? 0,
    lng: (biz?.lng as number | null) ?? points[0]?.lng ?? 0,
  };

  if (scan.grid_size === 1) {
    const point = points[0] ?? null;
    const detail = results?.points_detail[0];
    const teleport: TeleportResult = {
      scan,
      center,
      point:
        point ??
        ({ id: 0, scan_id: scan.id, lat: 0, lng: 0, rank: null } as GridPoint),
      distance_km: detail?.distance_km ?? 0,
      top10: results?.teleport_top10 ?? [],
    };
    return teleport;
  }

  // Merge each persisted pin with its computed detail (distance/direction/top5).
  // top5 is [] when results were lost (registry-only, pre-migration).
  const toDetail = (p: GridPoint): GridPointDetail => {
    const d = results?.points_detail.find(
      (x) => Math.abs(x.lat - p.lat) < 1e-9 && Math.abs(x.lng - p.lng) < 1e-9
    );
    return {
      ...p,
      distance_km: d?.distance_km ?? 0,
      direction: d?.direction ?? "center",
      top5: d?.top5 ?? [],
    };
  };

  const ranks = points.map((p) => p.rank);
  return {
    scan,
    center,
    points: points.map(toDetail),
    in_top3_pct: results?.in_top3_pct ?? inTop3Pct(ranks),
    weak_direction:
      results?.weak_direction ??
      (points.length > 0 ? weakDirection(center, points) : null),
    ownership: results?.ownership ?? [],
    demand_hint: null, // keyword-volume lookup not wired yet (contract allows null)
  } satisfies GridScanResult;
}

/** Pin popover payload (P5) — from the stored per-point detail. */
export async function getPointDetail(
  db: SupabaseClient,
  scanId: string,
  pointId: number
): Promise<GridPointDetail | null> {
  const loaded = await loadScan(db, scanId);
  if (!loaded?.results) return null;
  const point = loaded.points.find((p) => p.id === pointId);
  if (!point) return null;
  const detail = loaded.results.points_detail.find(
    (d) => Math.abs(d.lat - point.lat) < 1e-9 && Math.abs(d.lng - point.lng) < 1e-9
  );
  if (!detail) return null;
  return { ...point, ...detail };
}

// ---------- compare (MS2-T06/T07) ----------

export async function compareScans(
  db: SupabaseClient,
  beforeId: string,
  afterId: string
): Promise<GridCompare | null> {
  const [before, after] = await Promise.all([
    getGridResult(db, beforeId),
    getGridResult(db, afterId),
  ]);
  if (!before || !after || !("points" in before) || !("points" in after)) {
    return null;
  }

  const movement: GridCompare["movement"] = [];
  const beforeOwn = new Map(before.ownership.map((r) => [r.name, r]));
  for (const a of after.ownership) {
    const b = beforeOwn.get(a.name);
    if (!b) continue;
    movement.push({
      name: a.name,
      before_avg: b.avg_rank,
      after_avg: a.avg_rank,
      delta: Math.round((a.avg_rank - b.avg_rank) * 10) / 10,
    });
  }
  movement.sort((x, y) => x.delta - y.delta); // biggest improvement first

  return {
    before,
    after,
    avg_rank_delta:
      before.scan.avg_rank !== null && after.scan.avg_rank !== null
        ? Math.round((after.scan.avg_rank - before.scan.avg_rank) * 10) / 10
        : 0,
    movement,
  };
}

export function gridPreviewUsd(size: GridScanRequest["grid_size"]): number {
  return gridEstimateUsd(size);
}
