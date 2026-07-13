import { describe, expect, it } from "vitest";
import {
  DataForSeoClient,
  DfsConfigError,
  DfsTimeoutError,
  DfsUpstreamError,
  reviewsEstimateUsd,
} from "@/server/dataforseo";
import {
  hoursFromTimetable,
  normalizeBusinessInfo,
  normalizeReviewItem,
  normalizeUpdateItem,
  competitorsFromSerp,
} from "@/server/dataforseo/normalize";
import { COST_USD } from "@/server/costs";
import { InMemorySpendStore, SpendCapError, SpendGuard } from "@/server/spend";

const CREDS = { login: "test-login", password: "test-password" };

interface FakeCall {
  url: string;
  init: RequestInit;
}

/** Queue-driven fetch double. Each entry is a JSON body or an HTTP status. */
function fakeFetch(queue: Array<{ status?: number; json?: unknown }>) {
  const calls: FakeCall[] = [];
  const impl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = queue.shift();
    if (!next) throw new Error("fakeFetch queue empty");
    const status = next.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => next.json ?? {},
    } as Response;
  }) as typeof fetch;
  return { impl, calls };
}

function makeGuard(capUsd = 1.0) {
  const store = new InMemorySpendStore();
  store.dailyCapUsd = capUsd;
  return { store, guard: new SpendGuard(store) };
}

function makeClient(
  queue: Array<{ status?: number; json?: unknown }>,
  guard: SpendGuard,
  overrides: Partial<ConstructorParameters<typeof DataForSeoClient>[0]> = {}
) {
  const { impl, calls } = fakeFetch(queue);
  const client = new DataForSeoClient({
    guard,
    credentials: CREDS,
    liveGate: async () => {}, // gate OPEN — overridable via overrides
    fetchImpl: impl,
    pollIntervalMs: 1,
    maxPollMs: 50,
    sleep: async () => {},
    ...overrides,
  });
  return { client, calls };
}

const LIVE_INFO_OK = {
  status_code: 20000,
  status_message: "Ok.",
  cost: 0.002,
  tasks: [
    {
      id: "task-1",
      status_code: 20000,
      status_message: "Ok.",
      cost: 0.002,
      result: [
        {
          items: [
            {
              title: "मनोवेध हिप्नोक्लिनिक",
              category: "Hospital",
              is_claimed: true,
              rating: { value: 4.9, votes_count: 30 },
              cid: "12609982763107324473",
              place_id: "ChIJI1BROTaCwTsROZLPMoOo_64",
            },
          ],
        },
      ],
    },
  ],
};

describe("DataForSeoClient — spend guard integration", () => {
  it("live call: settles the ledger with the vendor's actual cost + task id", async () => {
    const { store, guard } = makeGuard();
    const { client, calls } = makeClient([{ json: LIVE_INFO_OK }], guard);
    const info = await client.myBusinessInfo({ keyword: "मनोवेध हिप्नोक्लिनिक Karad" });
    expect(info?.title).toContain("मनोवेध");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/business_data/google/my_business_info/live");
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]).toMatchObject({
      endpoint: "business_data/google/my_business_info/live",
      cost_usd: 0.002,
      task_id: "task-1",
    });
  });

  it("sends Basic auth but never leaks credentials into errors", async () => {
    const { guard } = makeGuard();
    const { client, calls } = makeClient(
      [{ json: { status_code: 40200, status_message: "Payment Required" } }],
      guard
    );
    const err = await client
      .myBusinessInfo({ keyword: "x" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DfsUpstreamError);
    expect(String(err)).not.toContain(CREDS.password);
    expect(String(err)).not.toContain(CREDS.login);
    const auth = (calls[0].init.headers as Record<string, string>).Authorization;
    expect(auth.startsWith("Basic ")).toBe(true);
  });

  it("BLOCKS at the cap: SpendCapError and the network is never touched", async () => {
    const { store, guard } = makeGuard(1.0);
    await store.insert({ endpoint: "warmup", cost_usd: 1.0 });
    const { client, calls } = makeClient([{ json: LIVE_INFO_OK }], guard);
    await expect(client.myBusinessInfo({ keyword: "x" })).rejects.toBeInstanceOf(
      SpendCapError
    );
    expect(calls).toHaveLength(0);
  });

  it("preview: returns CostPreview with ₹ and touches neither network nor ledger", async () => {
    const { store, guard } = makeGuard();
    const { client, calls } = makeClient([], guard);
    const p = await client.myBusinessInfo({ keyword: "x" }, { preview: true });
    expect(p.estimated_cost_usd).toBe(COST_USD.my_business_info);
    expect(p.estimated_cost_inr).toBeCloseTo(0.2, 5);
    expect(calls).toHaveLength(0);
    expect(store.entries).toHaveLength(0);
  });

  it("missing credentials: DfsConfigError BEFORE any reservation", async () => {
    const { store, guard } = makeGuard();
    const { client, calls } = makeClient([{ json: LIVE_INFO_OK }], guard, {
      credentials: null,
    });
    await expect(client.myBusinessInfo({ keyword: "x" })).rejects.toBeInstanceOf(
      DfsConfigError
    );
    expect(calls).toHaveLength(0);
    expect(store.entries).toHaveLength(0);
  });

  it("retries ×2 on 5xx then succeeds (one ledger row)", async () => {
    const { store, guard } = makeGuard();
    const { client, calls } = makeClient(
      [{ status: 503 }, { status: 502 }, { json: LIVE_INFO_OK }],
      guard
    );
    const info = await client.myBusinessInfo({ keyword: "x" });
    expect(info?.category).toBe("Hospital");
    expect(calls).toHaveLength(3);
    expect(store.entries).toHaveLength(1);
  });

  it("retry exhausted: throws and keeps the conservative estimate on the books", async () => {
    const { store, guard } = makeGuard();
    const { client, calls } = makeClient(
      [{ status: 500 }, { status: 500 }, { status: 500 }],
      guard
    );
    await expect(client.myBusinessInfo({ keyword: "x" })).rejects.toBeInstanceOf(
      DfsUpstreamError
    );
    expect(calls).toHaveLength(3);
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].endpoint).toContain("(failed)");
    expect(store.entries[0].cost_usd).toBe(COST_USD.my_business_info);
  });
});

const TASK_POSTED = {
  status_code: 20000,
  status_message: "Ok.",
  cost: 0.00225,
  tasks: [
    {
      id: "rev-task-9",
      status_code: 20100,
      status_message: "Task Created.",
      cost: 0.00225,
      result: null,
    },
  ],
};

const TASK_PENDING = {
  status_code: 20000,
  status_message: "Ok.",
  cost: 0,
  tasks: [
    {
      id: "rev-task-9",
      status_code: 40602,
      status_message: "Task In Progress.",
      cost: 0,
      result: null,
    },
  ],
};

const REVIEWS_DONE = {
  status_code: 20000,
  status_message: "Ok.",
  cost: 0,
  tasks: [
    {
      id: "rev-task-9",
      status_code: 20000,
      status_message: "Ok.",
      cost: 0,
      result: [
        {
          reviews_count: 30,
          rating: { value: 4.9, votes_count: 30 },
          items: [
            {
              review_id: "r1",
              rating: { value: 5 },
              time_ago: "a week ago",
              review_text: "Khup chan anubhav",
              profile_name: "Sandip Jadhav",
              reviews_count: 1,
              photos_count: 0,
              local_guide: false,
              owner_answer: null,
            },
          ],
        },
      ],
    },
  ],
};

describe("DataForSeoClient — standard (task) mode", () => {
  it("task_post is guarded once; free polling continues to the result", async () => {
    const { store, guard } = makeGuard();
    const { client, calls } = makeClient(
      [{ json: TASK_POSTED }, { json: TASK_PENDING }, { json: REVIEWS_DONE }],
      guard
    );
    const result = await client.reviews({ cid: "123", depth: 30 });
    expect(result?.items).toHaveLength(1);
    expect(calls).toHaveLength(3);
    expect(calls[0].url).toContain("reviews/task_post");
    expect(calls[1].url).toContain("reviews/task_get/rev-task-9");
    // exactly ONE paid ledger row — polling is free
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]).toMatchObject({
      endpoint: "business_data/google/reviews/task_post",
      cost_usd: 0.00225,
      task_id: "rev-task-9",
    });
  });

  it("poll timeout → DfsTimeoutError; the task's charge stays on the ledger", async () => {
    const { store, guard } = makeGuard();
    const pendings = Array.from({ length: 3 }, () => ({ json: TASK_PENDING }));
    const { client } = makeClient([{ json: TASK_POSTED }, ...pendings], guard, {
      maxPollMs: 0, // deadline passes after the first pending poll
    });
    await expect(client.reviews({ cid: "123" })).rejects.toBeInstanceOf(
      DfsTimeoutError
    );
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].cost_usd).toBe(0.00225);
  });

  it("reviews estimate scales per 10 reviews", () => {
    expect(reviewsEstimateUsd(30)).toBeCloseTo(0.003, 6);
    expect(reviewsEstimateUsd(10)).toBeCloseTo(0.0015, 6);
  });

  it("keywordsData estimate scales with keyword count (preview)", async () => {
    const { guard } = makeGuard();
    const { client } = makeClient([], guard);
    const p = await client.keywordsData(["a", "b", "c"], { preview: true });
    expect(p.estimated_cost_usd).toBeCloseTo(3 * COST_USD.keywords_data_per_kw, 9);
  });
});

describe("normalizers (raw → AuditInput shapes)", () => {
  it("timetable → readable hours with anomaly detection", () => {
    const hours = hoursFromTimetable({
      monday: [
        { open: { hour: 0, minute: 0 }, close: { hour: 9, minute: 0 } },
        { open: { hour: 10, minute: 30 }, close: { hour: 0, minute: 0 } },
      ],
      tuesday: [{ open: { hour: 10, minute: 0 }, close: { hour: 20, minute: 0 } }],
      wednesday: null,
    });
    expect(hours).toEqual([
      { day: "Monday", text: "12 am–9 am; 10:30 am–12 am", anomaly: true },
      { day: "Tuesday", text: "10 am–8 pm", anomaly: false },
      { day: "Wednesday", text: "Closed", anomaly: false },
    ]);
  });

  it("business info → NormalizedProfile (defensive on gaps)", () => {
    const p = normalizeBusinessInfo(
      {
        title: "Test",
        category: "Hospital",
        additional_categories: ["Clinic"],
        is_claimed: true,
        rating: { value: 4.9, votes_count: 30 },
        total_photos: 5,
        attributes: { available_attributes: { payments: ["Cash only"], empty: [] } },
      },
      { city: "Karad" }
    );
    expect(p.categories).toEqual({ primary: "Hospital", secondary: ["Clinic"] });
    expect(p.photos_total).toBe(5);
    expect(p.phone).toBeNull();
    expect(p.services).toEqual([]);
    expect(p.attributes).toEqual({ payments: ["Cash only"] });
    expect(p.city).toBe("Karad");
  });

  it("review item → NormalizedReview (relative-date fallback, owner reply)", () => {
    const r = normalizeReviewItem(
      {
        rating: { value: 5 },
        time_ago: "2 years ago",
        review_text: "chan",
        profile_name: "A",
        local_guide: true,
        owner_answer: "Thank you",
      },
      0,
      new Date("2026-07-11T00:00:00Z")
    );
    expect(r.review_ts).toBe("2024-07-11");
    expect(r.approximated).toBe(true);
    expect(r.replied).toBe(true);
    expect(r.is_local_guide).toBe(true);
  });

  it("update item → NormalizedPost (media + link counting)", () => {
    const p = normalizeUpdateItem({
      timestamp: "2025-08-30 04:30:00 +00:00",
      snippet: "भेट द्या: https://nlp-eft.grexa.site/",
      images_url: "https://img",
    });
    expect(p.has_media).toBe(true);
    expect(p.media_type).toBe("image");
    expect(p.links).toBe(1);
    expect(p.post_ts).toContain("2025-08-30");
  });

  it("competitors: excludes the target, ranks capped, distance computed", () => {
    const comps = competitorsFromSerp(
      [
        { title: "Target", cid: "self", latitude: 17.29, longitude: 74.18 },
        { title: "A", cid: "a", category: "Mental health clinic", latitude: 17.3, longitude: 74.18, rating: { value: 4.5, votes_count: 12 } },
        { title: "B", cid: "b", latitude: 17.31, longitude: 74.19 },
        { title: "C", cid: "c" },
        { title: "D", cid: "d" },
      ],
      { cid: "self", place_id: null, lat: 17.29, lng: 74.18 },
      3
    );
    expect(comps.map((c) => c.name)).toEqual(["A", "B", "C"]);
    expect(comps[0].distance_km).toBeCloseTo(1.1, 1);
    expect(comps[2].distance_km).toBeNull();
  });
});
