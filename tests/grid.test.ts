import { describe, expect, it } from "vitest";
import { DataForSeoClient } from "@/server/dataforseo";
import { InMemorySpendStore, SpendGuard } from "@/server/spend";
import { gridPoints } from "@/server/grid/generator";
import {
  avgRank,
  buildOwnership,
  directionOf,
  extractRank,
  inTop3Pct,
  weakDirection,
} from "@/server/grid/metrics";
import { compareScans, getGridResult, startGridScan } from "@/server/grid/engine";
import { gridEstimateUsd } from "@/server/costs";
import { GRID_TABLES, miniDb } from "./helpers/mini-db";

const CENTER = { lat: 17.293499, lng: 74.17943009999999 };

describe("grid generator (MS2-T01)", () => {
  it("5×5 @ 1500 m reproduces the seed lattice", () => {
    const pts = gridPoints(CENTER, 5, 1500);
    expect(pts).toHaveLength(25);
    // NW corner first (north = +lat, west = −lng)
    expect(pts[0].lat).toBeGreaterThan(CENTER.lat);
    expect(pts[0].lng).toBeLessThan(CENTER.lng);
    // centre pin is the business
    expect(pts[12].lat).toBeCloseTo(CENTER.lat, 9);
    expect(pts[12].lng).toBeCloseTo(CENTER.lng, 9);
    // seed steps: 750 m ≈ 0.006738° lat · 0.007059° lng at 17.29°N
    expect(pts[0].lat - pts[5].lat).toBeCloseTo(0.006738, 4);
    expect(pts[1].lng - pts[0].lng).toBeCloseTo(0.0070559, 4);
  });

  it("sizes: 1 → the centre; 3 and 7 → n² points, outer ring at radius", () => {
    expect(gridPoints(CENTER, 1, 1000)).toEqual([CENTER]);
    expect(gridPoints(CENTER, 3, 1000)).toHaveLength(9);
    const seven = gridPoints(CENTER, 7, 3000);
    expect(seven).toHaveLength(49);
    expect(seven[0].lat - CENTER.lat).toBeCloseTo((3000 / 111_320) * 1, 5);
  });
});

describe("rank extraction + metrics (MS2-T03/T07)", () => {
  const target = { cid: "t-cid", place_id: "t-pid", name: "मनोवेध हिप्नोक्लिनिक" };

  it("matches by cid, place_id, then normalized name; >20 → null", () => {
    expect(extractRank([{ title: "X", cid: "t-cid", rank_group: 4 }], target)).toBe(4);
    expect(extractRank([{ title: "X", place_id: "t-pid", rank_group: 9 }], target)).toBe(9);
    expect(
      extractRank([{ title: "मनोवेध  हिप्नोक्लिनिक", rank_group: 2 }], target)
    ).toBe(2);
    expect(extractRank([{ title: "X", cid: "t-cid", rank_group: 21 }], target)).toBeNull();
    expect(extractRank([{ title: "Other", cid: "z" }], target)).toBeNull();
  });

  it("avgRank ignores nulls; inTop3Pct counts all pins", () => {
    expect(avgRank([1, 3, null, 8])).toBe(4);
    expect(avgRank([null, null])).toBeNull();
    expect(inTop3Pct([1, 2, 4, null])).toBe(50);
  });

  it("directionOf uses compass bearings", () => {
    expect(directionOf(CENTER, { lat: CENTER.lat + 0.01, lng: CENTER.lng })).toBe("north");
    expect(directionOf(CENTER, { lat: CENTER.lat - 0.01, lng: CENTER.lng + 0.01 })).toBe("south-east");
    expect(directionOf(CENTER, { lat: CENTER.lat, lng: CENTER.lng - 0.01 })).toBe("west");
  });

  it("weakDirection flags a clearly-worse sector, else null", () => {
    const good = [
      { lat: CENTER.lat + 0.01, lng: CENTER.lng, rank: 2 },
      { lat: CENTER.lat, lng: CENTER.lng + 0.01, rank: 2 },
      { lat: CENTER.lat, lng: CENTER.lng - 0.01, rank: 3 },
      { lat: CENTER.lat - 0.01, lng: CENTER.lng + 0.01, rank: null }, // SE, 20
    ];
    expect(weakDirection(CENTER, good)).toBe("south-east");
    const flat = good.map((p) => ({ ...p, rank: 3 }));
    expect(weakDirection(CENTER, flat)).toBeNull();
  });

  it("ownership derives from RankEntry packs and always includes the target", () => {
    const pack = (rank: number) => [
      { position: 1, name: "Dominator", rating: 4.8, reviews: 90, cid: "d", is_target: false },
      { position: rank, name: "मनोवेध हिप्नोक्लिनिक", rating: 4.9, reviews: 30, cid: "t-cid", is_target: true },
    ];
    const rows = buildOwnership(
      [pack(11), pack(13)],
      1 // force the cut so the target is re-appended
    );
    const dominator = rows.find((r) => r.name === "Dominator");
    expect(dominator).toMatchObject({
      avg_rank: 1,
      best_rank: 1,
      top3_count: 2,
      distance_km: null, // packs carry no coordinates (flagged in HANDOFF)
    });
    const self = rows.find((r) => r.is_target);
    expect(self).toMatchObject({
      avg_rank: 12,
      best_rank: 11,
      worst_rank: 13,
      distance_km: 0,
    });
  });
});

// ---------- engine end-to-end (mocked vendor, ₹0) ----------

interface MockedVendorOpts {
  /** target rank per point index; null = absent from that pin's SERP */
  ranks: Array<number | null>;
  failPoints?: number[]; // point indexes whose task_post 500s
  live?: boolean;
}

function mockedVendor(opts: MockedVendorOpts) {
  const store = new InMemorySpendStore();
  store.dailyCapUsd = 1.0;
  const taskItems = new Map<string, unknown[]>();
  let postSeq = 0;
  const fetchCalls: string[] = [];

  const itemsFor = (rank: number | null) => {
    const items: unknown[] = [
      { title: "Dominator", cid: "d", rank_group: 1, latitude: 17.3, longitude: 74.18 },
      { title: "Runner Up", cid: "r", rank_group: 2 },
    ];
    if (rank !== null) {
      items.push({ title: "Target Biz", cid: "t-cid", rank_group: rank });
    }
    return items;
  };

  const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    fetchCalls.push(u);
    const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

    if (u.includes("/live/advanced")) {
      const idx = postSeq++;
      return json({
        status_code: 20000, status_message: "Ok.", cost: 0.002,
        tasks: [{ id: `live-${idx}`, status_code: 20000, status_message: "Ok.", cost: 0.002,
          result: [{ items: itemsFor(opts.ranks[idx] ?? null) }] }],
      }) as unknown as Response;
    }
    if (u.endsWith("/task_post")) {
      const idx = postSeq++;
      if (opts.failPoints?.includes(idx)) {
        return { ok: false, status: 500, json: async () => ({}) } as Response;
      }
      const id = `task-${idx}`;
      taskItems.set(id, itemsFor(opts.ranks[idx] ?? null));
      return json({
        status_code: 20000, status_message: "Ok.", cost: 0.0006,
        tasks: [{ id, status_code: 20100, status_message: "Task Created.", cost: 0.0006, result: null }],
      }) as unknown as Response;
    }
    const taskId = u.split("/").pop() as string;
    return json({
      status_code: 20000, status_message: "Ok.", cost: 0,
      tasks: [{ id: taskId, status_code: 20000, status_message: "Ok.", cost: 0,
        result: [{ items: taskItems.get(taskId) ?? [] }] }],
    }) as unknown as Response;
  }) as typeof fetch;

  const dfs = new DataForSeoClient({
    guard: new SpendGuard(store),
    credentials: { login: "l", password: "p" },
    liveGate: async () => {}, // gate OPEN — these tests exercise the guarded flow
    fetchImpl,
    pollIntervalMs: 1,
    maxPollMs: 100,
    sleep: async () => {},
  });
  return { dfs, store, fetchCalls };
}

function seedBusiness(tables: Record<string, Array<Record<string, unknown>>>) {
  const business = {
    id: "b1111111-1111-4111-8111-111111111111",
    name: "Target Biz",
    city: "Karad",
    cid: "t-cid",
    place_id: "t-pid",
    lat: CENTER.lat,
    lng: CENTER.lng,
    website: null,
  };
  tables.businesses.push(business);
  return business;
}

const REQ = {
  business_id: "b1111111-1111-4111-8111-111111111111",
  keyword: "hypno clinic",
  grid_size: 3 as const,
  radius_m: 1500,
};

describe("EP-003/004 engine (mocked vendor)", () => {
  it("3×3 scan: 9 guarded tasks, pins persisted, metrics + ownership", async () => {
    const { client, tables } = miniDb(GRID_TABLES);
    seedBusiness(tables);
    // SE corner (index 8) not in top-20 → weak direction south-east
    const ranks = [2, 2, 2, 2, 1, 3, 2, 3, null];
    const { dfs, store } = mockedVendor({ ranks });

    const started = await startGridScan({ dfs, db: client }, REQ);
    await started.done;

    expect(tables.grid_points).toHaveLength(9);
    const scan = tables.grid_scans[0];
    expect(scan.status).toBe("done");
    expect(scan.avg_rank).toBe(2.1); // mean of the 8 found ranks
    expect(scan.cost_usd).toBeCloseTo(9 * 0.0006, 6);
    // 9 paid task_posts on the ledger, all settled
    expect(store.entries).toHaveLength(9);
    expect(store.entries.every((e) => e.endpoint === "serp/google/maps/task_post")).toBe(true);

    const result = await getGridResult(client, String(scan.id));
    if (!result || !("points" in result)) throw new Error("expected grid result");
    expect(result.in_top3_pct).toBe(89); // 8 of 9 pins ≤ 3
    expect(result.weak_direction).toBe("south-east");
    // locked contract: center + GridPointDetail pins with per-pin top5
    expect(result.center).toEqual({ lat: CENTER.lat, lng: CENTER.lng });
    const centrePin = result.points.find((p) => p.distance_km === 0);
    expect(centrePin?.top5.map((t) => t.name)).toEqual([
      "Dominator",
      "Runner Up",
      "Target Biz",
    ]);
    expect(centrePin?.direction).toBe("center");
    expect(result.points.every((p) => Array.isArray(p.top5))).toBe(true);
    expect(result.demand_hint).toBeNull(); // volumes wiring flagged for later
    const target = result.ownership.find((r) => r.is_target);
    expect(target?.name).toBe("Target Biz");
    expect(result.ownership[0].name).toBe("Dominator");
  });

  it("top_ranks column missing → pins persist bare, popovers degrade to []", async () => {
    const { client, tables } = miniDb(GRID_TABLES);
    seedBusiness(tables);
    const { dfs } = mockedVendor({ ranks: [2, 2, 2, 2, 1, 3, 2, 3, 4] });

    // Simulate the un-applied migration: first insert (with top_ranks) errors.
    const realFrom = client.from.bind(client);
    let failedOnce = false;
    (client as unknown as { from: (t: string) => unknown }).from = (t: string) => {
      const q = realFrom(t) as unknown as Record<string, unknown>;
      if (t === "grid_points" && !failedOnce) {
        const realInsert = (q.insert as (rows: unknown) => unknown).bind(q);
        q.insert = (rows: Array<Record<string, unknown>>) => {
          if (rows.some((r) => "top_ranks" in r)) {
            failedOnce = true;
            return Promise.resolve({
              data: null,
              error: { message: "column grid_points.top_ranks does not exist" },
            });
          }
          return realInsert(rows);
        };
      }
      return q;
    };

    const started = await startGridScan({ dfs, db: client }, REQ);
    await started.done;
    expect(failedOnce).toBe(true);
    expect(tables.grid_points).toHaveLength(9);
    expect(tables.grid_points.every((p) => !("top_ranks" in p))).toBe(true);

    const result = await getGridResult(client, String(tables.grid_scans[0].id));
    if (!result || !("points" in result)) throw new Error("expected grid result");
    expect(result.points.every((p) => p.top5.length === 0)).toBe(true);
    expect(result.ownership).toEqual([]); // nothing to derive from — degraded, not broken
  });

  it("task_post 5xx is NOT retried (idempotency) → partial scan", async () => {
    const { client, tables } = miniDb(GRID_TABLES);
    seedBusiness(tables);
    const ranks = [2, 2, 2, 2, 1, 3, 2, 3, 4];
    const { dfs, store, fetchCalls } = mockedVendor({ ranks, failPoints: [4] });

    const started = await startGridScan({ dfs, db: client }, REQ);
    await started.done;

    const postCalls = fetchCalls.filter((u) => u.endsWith("/task_post"));
    expect(postCalls).toHaveLength(9); // exactly one POST per point — no retry
    expect(tables.grid_scans[0].status).toBe("partial");
    // failed point keeps its conservative estimate on the books
    const failed = store.entries.filter((e) => e.endpoint.includes("(failed)"));
    expect(failed).toHaveLength(1);
    expect(failed[0].cost_usd).toBe(0.0006);
    // its pin persists with rank null
    expect(tables.grid_points.filter((p) => p.rank === null)).toHaveLength(1);
  });

  it("Teleport (grid_size 1): one LIVE call, top10 + distance", async () => {
    const { client, tables } = miniDb(GRID_TABLES);
    seedBusiness(tables);
    const { dfs, store } = mockedVendor({ ranks: [5], live: true });

    const started = await startGridScan(
      { dfs, db: client },
      {
        ...REQ,
        grid_size: 1,
        lat: CENTER.lat + 0.01,
        lng: CENTER.lng + 0.01,
      }
    );
    await started.done;

    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].endpoint).toBe("serp/google/maps/live/advanced");
    const result = await getGridResult(client, String(tables.grid_scans[0].id));
    if (!result || "points" in result) throw new Error("expected teleport result");
    expect(result.center).toEqual({ lat: CENTER.lat, lng: CENTER.lng });
    expect(result.top10.map((r) => r.name)).toContain("Target Biz");
    expect(result.top10.find((r) => r.is_target)?.position).toBe(5);
    expect(result.point.rank).toBe(5);
    expect(result.distance_km).toBeGreaterThan(0);
  });

  it("history list: GET /api/grid?businessId= source, newest first", async () => {
    const { client, tables } = miniDb(GRID_TABLES);
    seedBusiness(tables);
    const a = mockedVendor({ ranks: [1, 1, 1, 1, 1, 1, 1, 1, 1] });
    await (await startGridScan({ dfs: a.dfs, db: client }, REQ)).done;
    const b = mockedVendor({ ranks: [2, 2, 2, 2, 2, 2, 2, 2, 2] });
    await (await startGridScan({ dfs: b.dfs, db: client }, REQ)).done;
    const { listGridScans } = await import("@/server/grid/engine");
    const scans = await listGridScans(client, REQ.business_id);
    expect(scans).toHaveLength(2);
  });

  it("compare: avg-rank delta + per-business movement", async () => {
    const { client, tables } = miniDb(GRID_TABLES);
    seedBusiness(tables);

    const before = mockedVendor({ ranks: [8, 8, 8, 8, 7, 9, 8, 7, 9] });
    const first = await startGridScan({ dfs: before.dfs, db: client }, REQ);
    await first.done;

    const after = mockedVendor({ ranks: [4, 4, 5, 4, 3, 5, 5, 4, 6] });
    const second = await startGridScan({ dfs: after.dfs, db: client }, REQ);
    await second.done;

    const compare = await compareScans(
      client,
      String(first.scan_id),
      String(second.scan_id)
    );
    expect(compare).not.toBeNull();
    expect(compare!.avg_rank_delta).toBeCloseTo(4.4 - 8, 1);
    const targetMove = compare!.movement.find((m) => m.name === "Target Biz");
    expect(targetMove!.delta).toBeLessThan(0); // improved
  });

  it("cost previews match §2.6 (5×5 ≈ $0.015 ≈ ₹1.3)", () => {
    expect(gridEstimateUsd(5)).toBeCloseTo(0.015, 6);
    expect(gridEstimateUsd(3)).toBeCloseTo(0.0054, 6);
    expect(gridEstimateUsd(7)).toBeCloseTo(0.0294, 6);
    expect(gridEstimateUsd(1)).toBeCloseTo(0.002, 6);
  });
});
