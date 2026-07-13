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

/**
 * EP-003/004 — grid scan / Teleport engine (MS2-T01..T07).
 * Persistence per the locked Day-3 contract: pins live in TB-005 with the
 * per-point RankEntry pack in `grid_points.top_ranks` (jsonb, migration
 * 20260713000001); ownership / weak-direction / pin popovers are DERIVED ON
 * READ — no scan-level blob.
 */

export interface GridDeps {
  dfs: DataForSeoClient;
  db: SupabaseClient;
}

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
  const pin: LatLng | null = isTeleport
    ? req.lat !== undefined && req.lng !== undefined
      ? { lat: req.lat, lng: req.lng }
      : null
    : business.lat !== null && business.lng !== null
      ? { lat: business.lat, lng: business.lng }
      : null;
  if (!pin) {
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

  const done = runScan(deps, scanId, business, req, pin).catch(async (e) => {
    await db.from("grid_scans").update({ status: "failed" }).eq("id", scanId);
    throw e;
  });
  done.catch(() => undefined); // routes fire-and-forget; the row carries state

  return { scan_id: scanId, done };
}

async function runScan(
  deps: GridDeps,
  scanId: string,
  business: Business,
  req: GridScanRequest,
  pin: LatLng
): Promise<void> {
  const { db, dfs } = deps;
  const isTeleport = req.grid_size === 1;
  const points = isTeleport
    ? [pin]
    : gridPoints(pin, req.grid_size, req.radius_m);

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

  // Persist pins (TB-005) + the per-point pack (top_ranks, contract lock).
  const pinRows = perPoint.map((r, i) => ({
    scan_id: scanId,
    lat: r.point.lat,
    lng: r.point.lng,
    rank: ranks[i],
    top_ranks: r.failed ? null : toRankEntries(r.items, target, 20),
  }));
  const del = await db.from("grid_points").delete().eq("scan_id", scanId);
  if (del.error) throw new Error(`grid points reset failed: ${del.error.message}`);
  const ins = await db.from("grid_points").insert(pinRows);
  if (ins.error) {
    // Migration 20260713000001 not applied yet — persist without the packs
    // (pin popovers then show rank + distance only, per the contract note).
    const bare = pinRows.map(({ top_ranks: _drop, ...row }) => row);
    const retry = await db.from("grid_points").insert(bare);
    if (retry.error) {
      throw new Error(`grid points insert failed: ${retry.error.message}`);
    }
  }

  const unitCost = isTeleport
    ? ESTIMATE_USD.teleport
    : ESTIMATE_USD.grid_point_standard;
  const patch = {
    status: allFailed ? "failed" : perPoint.some((r) => r.failed) ? "partial" : "done",
    avg_rank: avgRank(ranks),
    // Estimate-based; the ledger (TB-010) holds the settled vendor actuals.
    cost_usd: Math.round(points.length * unitCost * 10_000) / 10_000,
  };
  const upd = await db.from("grid_scans").update(patch).eq("id", scanId);
  if (upd.error) throw new Error(`grid scan update failed: ${upd.error.message}`);
}

// ---------- EP-004 reads (everything derived from TB-004/005 + business) ----------

type StoredPoint = GridPoint & { top_ranks?: RankEntry[] | null };

async function loadScan(db: SupabaseClient, scanId: string) {
  const { data, error } = await db
    .from("grid_scans")
    .select()
    .eq("id", scanId)
    .maybeSingle();
  if (error) throw new Error(`grid scan read failed: ${error.message}`);
  if (!data) return null;
  const scan = data as GridScan;
  const [{ data: pointRows, error: pErr }, { data: businessRow, error: bErr }] =
    await Promise.all([
      db.from("grid_points").select().eq("scan_id", scanId),
      db.from("businesses").select().eq("id", scan.business_id).maybeSingle(),
    ]);
  if (pErr) throw new Error(`grid points read failed: ${pErr.message}`);
  if (bErr) throw new Error(`business read failed: ${bErr.message}`);
  return {
    scan,
    points: (pointRows ?? []) as StoredPoint[],
    business: (businessRow as Business) ?? null,
  };
}

function centerOf(business: Business | null): { lat: number; lng: number } {
  return {
    lat: business?.lat ?? 0,
    lng: business?.lng ?? 0,
  };
}

function toDetail(
  p: StoredPoint,
  center: { lat: number; lng: number }
): GridPointDetail {
  const { top_ranks, ...point } = p;
  return {
    ...point,
    distance_km: roundKm(haversineKm(center.lat, center.lng, p.lat, p.lng)),
    direction: directionOf(center, p),
    top5: (top_ranks ?? []).slice(0, 5),
  };
}

export async function getGridResult(
  db: SupabaseClient,
  scanId: string
): Promise<GridScanResult | TeleportResult | null> {
  const loaded = await loadScan(db, scanId);
  if (!loaded) return null;
  const { scan, points, business } = loaded;
  const center = centerOf(business);

  if (scan.grid_size === 1) {
    const p = points[0];
    const teleport: TeleportResult = {
      scan,
      center,
      point: p
        ? { id: p.id, scan_id: p.scan_id, lat: p.lat, lng: p.lng, rank: p.rank }
        : ({ id: 0, scan_id: scan.id, lat: 0, lng: 0, rank: null } as GridPoint),
      distance_km: p ? roundKm(haversineKm(center.lat, center.lng, p.lat, p.lng)) : 0,
      top10: (p?.top_ranks ?? []).slice(0, 10),
    };
    return teleport;
  }

  const ranks = points.map((p) => p.rank);
  return {
    scan,
    center,
    points: points.map((p) => toDetail(p, center)),
    in_top3_pct: inTop3Pct(ranks),
    weak_direction: weakDirection(center, points),
    ownership: buildOwnership(points.map((p) => p.top_ranks ?? [])),
    // Volumes need a guarded keywords_data call with its own ₹ preview —
    // wired after the live smoke calibrates §2.6 (HANDOFF 15:45). Null is
    // contract-legal; P5 hides the card.
    demand_hint: null,
  } satisfies GridScanResult;
}

/** GET /api/grid?businessId= — P5 history card (₹0 DB read). */
export async function listGridScans(
  db: SupabaseClient,
  businessId: string
): Promise<GridScan[]> {
  const { data, error } = await db
    .from("grid_scans")
    .select()
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`grid scans list failed: ${error.message}`);
  return (data ?? []) as GridScan[];
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
