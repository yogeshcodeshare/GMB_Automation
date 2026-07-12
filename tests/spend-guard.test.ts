import { describe, expect, it } from "vitest";
import {
  SpendCapError,
  SpendGuard,
  startOfTodayIst,
} from "../src/server/spend/guard";
import { InMemorySpendStore } from "../src/server/spend/store";

/** Fixed "now": 2026-07-12 15:30 IST = 10:00 UTC. */
const NOW = () => new Date("2026-07-12T10:00:00.000Z");

function makeGuard(opts?: {
  settingsCap?: number | null;
  envCap?: number | null;
  now?: () => Date;
}) {
  const store = new InMemorySpendStore(opts?.now ?? NOW);
  store.dailyCapUsd = opts?.settingsCap ?? null;
  const guard = new SpendGuard(store, {
    envCapUsd: opts?.envCap ?? null,
    now: opts?.now ?? NOW,
  });
  return { guard, store };
}

describe("startOfTodayIst — daily boundary is the founder's calendar day (Asia/Kolkata)", () => {
  it("maps mid-day IST to 18:30 UTC of the previous day", () => {
    // 12 Jul 15:30 IST → day started 12 Jul 00:00 IST = 11 Jul 18:30 UTC
    expect(startOfTodayIst(new Date("2026-07-12T10:00:00Z")).toISOString()).toBe(
      "2026-07-11T18:30:00.000Z"
    );
  });

  it("rolls to a new day at midnight IST, not midnight UTC", () => {
    // 12 Jul 19:00 UTC = 13 Jul 00:30 IST → day started 12 Jul 18:30 UTC
    expect(startOfTodayIst(new Date("2026-07-12T19:00:00Z")).toISOString()).toBe(
      "2026-07-12T18:30:00.000Z"
    );
  });
});

describe("SpendGuard — cap resolution (settings > env > default 1.00)", () => {
  it("uses the settings-table cap when present", async () => {
    const { guard } = makeGuard({ settingsCap: 2.5, envCap: 0.5 });
    expect((await guard.getStatus()).cap_usd).toBe(2.5);
  });

  it("falls back to env DAILY_SPEND_CAP_USD", async () => {
    const { guard } = makeGuard({ settingsCap: null, envCap: 0.75 });
    expect((await guard.getStatus()).cap_usd).toBe(0.75);
  });

  it("defaults to $1.00 when neither is set", async () => {
    const { guard } = makeGuard();
    expect((await guard.getStatus()).cap_usd).toBe(1.0);
  });
});

describe("SpendGuard — ledger recording (TB-010)", () => {
  it("records every guarded call with endpoint, cost and task id", async () => {
    const { guard, store } = makeGuard({ settingsCap: 1.0 });
    const result = await guard.guarded(
      "business_data/google/my_business_info",
      0.002,
      async () => ({ result: "ok", actualCostUsd: 0.002, taskId: "task-123" })
    );
    expect(result).toBe("ok");
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]).toMatchObject({
      endpoint: "business_data/google/my_business_info",
      cost_usd: 0.002,
      task_id: "task-123",
    });
  });

  it("rejects negative costs", async () => {
    const { guard } = makeGuard();
    await expect(
      guard.record({ endpoint: "x", cost_usd: -1 })
    ).rejects.toThrow(RangeError);
  });
});

describe("SpendGuard — cap enforcement (EP-012)", () => {
  it("allows paid calls under the cap", async () => {
    const { guard } = makeGuard({ settingsCap: 1.0 });
    await expect(guard.assertCanSpend(0.02)).resolves.toBeUndefined();
  });

  it("blocks every paid call once spend reaches the cap", async () => {
    const { guard } = makeGuard({ settingsCap: 1.0 });
    await guard.record({ endpoint: "serp/google/maps", cost_usd: 1.0 });
    await expect(guard.assertCanSpend(0.0006)).rejects.toThrow(SpendCapError);
  });

  it("blocks a call whose estimate would overshoot the cap", async () => {
    const { guard } = makeGuard({ settingsCap: 1.0 });
    await guard.record({ endpoint: "serp/google/maps", cost_usd: 0.9 });
    await expect(guard.assertCanSpend(0.2)).rejects.toThrow(SpendCapError);
  });

  it("still allows FREE calls (estimate 0, e.g. balance ping) at the cap", async () => {
    const { guard } = makeGuard({ settingsCap: 1.0 });
    await guard.record({ endpoint: "serp/google/maps", cost_usd: 1.0 });
    await expect(guard.assertCanSpend(0)).resolves.toBeUndefined();
  });

  it("carries a machine-readable code for the API envelope", async () => {
    const { guard } = makeGuard({ settingsCap: 0.5 });
    await guard.record({ endpoint: "serp/google/maps", cost_usd: 0.5 });
    try {
      await guard.assertCanSpend(0.01);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SpendCapError);
      expect((err as SpendCapError).code).toBe("SPEND_CAP_REACHED");
    }
  });

  it("does not run (or bill) the wrapped call when blocked", async () => {
    const { guard, store } = makeGuard({ settingsCap: 0.1 });
    await guard.record({ endpoint: "serp/google/maps", cost_usd: 0.1 });
    let ran = false;
    await expect(
      guard.guarded("serp/google/maps", 0.05, async () => {
        ran = true;
        return { result: null, actualCostUsd: 0.05 };
      })
    ).rejects.toThrow(SpendCapError);
    expect(ran).toBe(false);
    expect(store.entries).toHaveLength(1); // only the pre-existing row
  });
});

describe("SpendGuard — atomic reservation semantics (M0 review hardening)", () => {
  it("getStatus reports blocked=true and remaining 0 at/over the cap", async () => {
    const { guard } = makeGuard({ settingsCap: 1.0 });
    await guard.record({ endpoint: "serp/google/maps", cost_usd: 1.0 });
    const status = await guard.getStatus();
    expect(status.blocked).toBe(true);
    expect(status.remaining_usd).toBe(0);
  });

  it("getStatus reports remaining = cap - spent under the cap", async () => {
    const { guard } = makeGuard({ settingsCap: 1.0 });
    await guard.record({ endpoint: "serp/google/maps", cost_usd: 0.25 });
    const status = await guard.getStatus();
    expect(status.blocked).toBe(false);
    expect(status.remaining_usd).toBeCloseTo(0.75, 9);
  });

  it("settles the ledger with the ACTUAL cost, not the estimate", async () => {
    const { guard, store } = makeGuard({ settingsCap: 1.0 });
    await guard.guarded("business_data/google/reviews", 0.01, async () => ({
      result: "ok",
      actualCostUsd: 0.002,
      taskId: "task-9",
    }));
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].cost_usd).toBe(0.002);
    expect(store.entries[0].endpoint).toBe("business_data/google/reviews");
    expect(store.entries[0].task_id).toBe("task-9");
  });

  it("concurrent guarded calls cannot overshoot the cap (TOCTOU fix)", async () => {
    const { guard, store } = makeGuard({ settingsCap: 1.0 });
    await guard.record({ endpoint: "seed", cost_usd: 0.9 });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        guard.guarded("serp/google/maps", 0.09, async () => ({
          result: 1,
          actualCostUsd: 0.09,
        }))
      )
    );
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    expect(fulfilled).toBe(1); // only one reservation fits under the cap
    const total = store.entries.reduce((s, e) => s + e.cost_usd, 0);
    expect(total).toBeLessThanOrEqual(1.0 + 1e-9);
  });

  it("a failed run keeps the conservative estimate on the ledger", async () => {
    const { guard, store } = makeGuard({ settingsCap: 1.0 });
    await expect(
      guard.guarded("serp/google/maps", 0.015, async () => {
        throw new Error("upstream timeout after POST");
      })
    ).rejects.toThrow("upstream timeout");
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].cost_usd).toBe(0.015); // vendor may have billed
    expect(store.entries[0].endpoint).toBe("serp/google/maps (failed)");
  });
});

describe("SpendGuard — day rollover", () => {
  it("yesterday's spend does not count toward today's cap", async () => {
    const store = new InMemorySpendStore(
      () => new Date("2026-07-11T10:00:00Z") // rows written "yesterday"
    );
    store.dailyCapUsd = 1.0;
    const yesterdayGuard = new SpendGuard(store, {
      now: () => new Date("2026-07-11T10:00:00Z"),
    });
    await yesterdayGuard.record({ endpoint: "serp/google/maps", cost_usd: 1.0 });

    const todayGuard = new SpendGuard(store, { now: NOW });
    const status = await todayGuard.getStatus();
    expect(status.spent_usd).toBe(0);
    expect(status.blocked).toBe(false);
  });
});
