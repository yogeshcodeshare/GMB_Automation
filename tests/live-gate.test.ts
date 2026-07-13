import { describe, expect, it } from "vitest";
import { DataForSeoClient } from "@/server/dataforseo";
import { InMemorySpendStore, SpendGuard } from "@/server/spend";
import { LiveDataDisabledError } from "@/server/errors";
import {
  makeLiveGate,
  readLiveDataFlag,
  setLiveDataFlag,
} from "@/server/settings/live-flag";
import { errFrom } from "@/server/http";
import { startGridScan } from "@/server/grid/engine";
import { GRID_TABLES, miniDb } from "./helpers/mini-db";

/** CR-1 merge-blocking tests: flag FALSE ⇒ LIVE_DATA_DISABLED, ZERO
 * transport calls, ZERO spend_ledger rows; flag TRUE ⇒ normal guarded flow. */

function gatedClient(enabled: boolean) {
  const store = new InMemorySpendStore();
  store.dailyCapUsd = 1.0;
  const fetchCalls: string[] = [];
  const dfs = new DataForSeoClient({
    guard: new SpendGuard(store),
    credentials: { login: "l", password: "p" },
    liveGate: async () => {
      if (!enabled) throw new LiveDataDisabledError();
    },
    fetchImpl: (async (url: RequestInfo | URL) => {
      fetchCalls.push(String(url));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          cost: 0.002,
          tasks: [
            { id: "t1", status_code: 20000, status_message: "Ok.", cost: 0.002, result: [{ items: [] }] },
          ],
        }),
      } as Response;
    }) as typeof fetch,
    pollIntervalMs: 1,
    maxPollMs: 50,
    sleep: async () => {},
  });
  return { dfs, store, fetchCalls };
}

describe("CR-1 — client-entry gate (flag OFF)", () => {
  it("every paid method throws LIVE_DATA_DISABLED with zero transport + zero ledger", async () => {
    const { dfs, store, fetchCalls } = gatedClient(false);
    const paidCalls: Array<() => Promise<unknown>> = [
      () => dfs.myBusinessInfo({ keyword: "x" }),
      () => dfs.reviews({ cid: "1" }),
      () => dfs.myBusinessUpdates({ cid: "1" }),
      () => dfs.serpMaps({ keyword: "x" }, "standard"),
      () => dfs.serpMaps({ keyword: "x" }, "live"),
      () => dfs.localFinder({ keyword: "x" }),
      () => dfs.keywordsData(["x"]),
    ];
    for (const call of paidCalls) {
      await expect(call()).rejects.toBeInstanceOf(LiveDataDisabledError);
    }
    expect(fetchCalls).toHaveLength(0); // no network, ever
    expect(store.entries).toHaveLength(0); // no reserve, no ledger rows
  });

  it("previews still work while the switch is off (₹ shown, nothing runs)", async () => {
    const { dfs, store, fetchCalls } = gatedClient(false);
    const p = await dfs.myBusinessInfo({ keyword: "x" }, { preview: true });
    expect(p.estimated_cost_usd).toBeGreaterThan(0);
    expect(fetchCalls).toHaveLength(0);
    expect(store.entries).toHaveLength(0);
  });

  it("flag TRUE ⇒ the normal guarded flow (network + settled ledger row)", async () => {
    const { dfs, store, fetchCalls } = gatedClient(true);
    await dfs.myBusinessInfo({ keyword: "x" });
    expect(fetchCalls).toHaveLength(1);
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].cost_usd).toBe(0.002);
  });

  it("defense in depth: a gated engine run fails scan with zero spend", async () => {
    const { client, tables } = miniDb(GRID_TABLES);
    tables.businesses.push({
      id: "b1111111-1111-4111-8111-111111111111",
      name: "T", city: "Karad", cid: "c", place_id: "p", lat: 17.29, lng: 74.18,
    });
    const { dfs, store, fetchCalls } = gatedClient(false);
    const started = await startGridScan(
      { dfs, db: client },
      { business_id: "b1111111-1111-4111-8111-111111111111", keyword: "k", grid_size: 3, radius_m: 1500 }
    );
    // Per-point failures degrade (never throw) — the scan lands "failed"
    // with ZERO network and ZERO ledger rows: the gate held inside the engine.
    await started.done;
    expect(tables.grid_scans[0].status).toBe("failed");
    expect(tables.grid_points.every((p) => p.rank === null)).toBe(true);
    expect(fetchCalls).toHaveLength(0);
    expect(store.entries).toHaveLength(0);
  });
});

describe("CR-1 — settings flag storage (default OFF)", () => {
  it("missing column / missing row / read error all read FALSE", async () => {
    const { client, tables } = miniDb(["settings"]);
    expect(await readLiveDataFlag(client)).toBe(false); // no row at all
    tables.settings.push({ id: 1, daily_spend_cap_usd: 1 }); // column absent
    expect(await readLiveDataFlag(client)).toBe(false);
    const { client: broken } = miniDb(["other"]); // table missing → throws inside
    expect(await readLiveDataFlag(broken)).toBe(false);
  });

  it("explicit true reads true; toggle round-trips", async () => {
    const { client, tables } = miniDb(["settings"]);
    tables.settings.push({ id: 1, dataforseo_live_enabled: true });
    expect(await readLiveDataFlag(client)).toBe(true);
    await setLiveDataFlag(client, false);
    expect(await readLiveDataFlag(client)).toBe(false);
    await setLiveDataFlag(client, true);
    expect(await readLiveDataFlag(client)).toBe(true);
  });
});

describe("CR-1 — envelope translation", () => {
  it("errFrom → 503 with the friendly LIVE_DATA_DISABLED envelope", async () => {
    const res = errFrom(new LiveDataDisabledError());
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      ok: boolean;
      error: { code: string; message: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("LIVE_DATA_DISABLED");
    expect(body.error.message).toBe(
      "Live data is off — enable in Settings → Data sources."
    );
  });
});
