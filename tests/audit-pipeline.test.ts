import { describe, expect, it } from "vitest";
import { DataForSeoClient } from "@/server/dataforseo";
import { InMemorySpendStore, SpendGuard } from "@/server/spend";
import { startAudit } from "@/server/audit/pipeline";
import { getProgress } from "@/server/audit/progress";
import { AUDIT_TABLES, miniDb, type Row } from "./helpers/mini-db";

/**
 * Wiring test: the full EP-001 pipeline against a mocked vendor and an
 * in-memory PostgREST stub — profile → reviews → posts → competitors →
 * scoring → persistence, ₹0 spent.
 */

// ---------- mocked vendor ----------

function envelope(taskOverrides: Row): Row {
  return {
    status_code: 20000,
    status_message: "Ok.",
    cost: 0,
    tasks: [
      {
        id: "t-1",
        status_code: 20000,
        status_message: "Ok.",
        cost: 0.002,
        result: null,
        ...taskOverrides,
      },
    ],
  };
}

const INFO = envelope({
  result: [
    {
      items: [
        {
          title: "मनोवेध हिप्नोक्लिनिक",
          category: "Hospital",
          is_claimed: true,
          phone: undefined,
          url: "https://nlp-eft.grexa.site/",
          address: "Somwar Peth, Karad, Maharashtra 415110",
          place_id: "ChIJI1BROTaCwTsROZLPMoOo_64",
          cid: "12609982763107324473",
          latitude: 17.293499,
          longitude: 74.179430,
          total_photos: 5,
          rating: { value: 4.9, votes_count: 30 },
          work_time: {
            work_hours: {
              timetable: {
                monday: [
                  { open: { hour: 0, minute: 0 }, close: { hour: 9, minute: 0 } },
                  { open: { hour: 10, minute: 0 }, close: { hour: 0, minute: 0 } },
                ],
              },
            },
          },
        },
      ],
    },
  ],
});

const TASK_CREATED = envelope({ id: "task-q", status_code: 20100, cost: 0.002 });

const REVIEWS = envelope({
  id: "task-q",
  result: [
    {
      reviews_count: 30,
      rating: { value: 4.9, votes_count: 30 },
      items: [
        {
          review_id: "r1",
          rating: { value: 5 },
          timestamp: "2026-07-04 10:00:00 +00:00",
          review_text: "Khup chan anubhav",
          profile_name: "Sandip Jadhav",
          reviews_count: 1,
          photos_count: 0,
          local_guide: false,
        },
        {
          review_id: "r2",
          rating: { value: 5 },
          timestamp: "2025-12-05 10:00:00 +00:00",
          review_text: "khupach chan fayada zala",
          profile_name: "Varsha Patil",
          owner_answer: "Thank you...",
        },
      ],
    },
  ],
});

const UPDATES = envelope({
  id: "task-q",
  result: [
    {
      items: [
        {
          timestamp: "2025-08-30 04:30:00 +00:00",
          snippet: "मानसिक आरोग्य हीच खरी संपत्ती",
          images_url: "https://img.example/1.jpg",
        },
      ],
    },
  ],
});

const LOCAL_FINDER = envelope({
  id: "task-q",
  result: [
    {
      items: [
        { title: "मनोवेध हिप्नोक्लिनिक", cid: "12609982763107324473" },
        {
          title: "Mind Care Clinic",
          cid: "111",
          category: "Mental health clinic",
          latitude: 17.30,
          longitude: 74.18,
          rating: { value: 4.5, votes_count: 41 },
        },
        {
          title: "Karad Wellness Center",
          cid: "222",
          category: "Mental health clinic",
          rating: { value: 4.2, votes_count: 15 },
        },
      ],
    },
  ],
});

function mockedDfs() {
  // Call order: info(live) · reviews(post,get) · updates(post,get) · finder(post,get)
  const queue = [INFO, TASK_CREATED, REVIEWS, TASK_CREATED, UPDATES, TASK_CREATED, LOCAL_FINDER];
  const store = new InMemorySpendStore();
  store.dailyCapUsd = 1.0;
  const dfs = new DataForSeoClient({
    guard: new SpendGuard(store),
    credentials: { login: "l", password: "p" },
    fetchImpl: (async () => {
      const next = queue.shift();
      if (!next) throw new Error("mock queue empty");
      return { ok: true, status: 200, json: async () => next } as Response;
    }) as typeof fetch,
    pollIntervalMs: 1,
    maxPollMs: 100,
    sleep: async () => {},
  });
  return { dfs, store };
}

describe("EP-001 pipeline (mocked vendor, in-memory db)", () => {
  it("runs all stages, persists scores/reviews/posts, ends done", async () => {
    const { client, tables } = miniDb(AUDIT_TABLES);
    const { dfs, store } = mockedDfs();

    const started = await startAudit(
      { dfs, db: client, now: () => new Date("2026-07-11T09:00:00Z") },
      {
        name: "मनोवेध हिप्नोक्लिनिक",
        city: "Karad",
        options: { competitors: 3, website_audit: false, post_audit: true },
      }
    );
    const progress = await started.done;

    expect(progress.status).toBe("done");
    expect(progress.done_stages).toContain("profile");
    expect(getProgress(started.audit_id)?.status).toBe("done");

    // business updated with resolved IDs
    const business = tables.businesses[0];
    expect(business.place_id).toBe("ChIJI1BROTaCwTsROZLPMoOo_64");
    expect(business.website).toBe("https://nlp-eft.grexa.site/");

    // scores persisted; category generic → 0, claimed → 10
    const scores = tables.audit_scores[0];
    expect(scores.audit_id).toBe(started.audit_id);
    expect(scores.claimed).toBe(10);
    expect(scores.category).toBe(0);

    // caches
    expect(tables.reviews_cache).toHaveLength(2);
    expect(tables.reviews_cache[1].replied).toBe(true);
    expect(tables.posts_cache).toHaveLength(1);

    // snapshot carries the P3 payload
    const snap = tables.audits[0].raw_snapshot as Record<string, unknown>;
    expect(snap.rubric).toBeDefined();
    expect((snap.sanity_flags as Array<{ key: string }>).map((f) => f.key)).toContain(
      "rented_subdomain"
    );
    expect((snap.competitors_compare as unknown[]).length).toBe(3); // target + 2

    // spend: 4 guarded calls, all settled
    expect(store.entries).toHaveLength(4);
    expect(store.entries.every((e) => !e.endpoint.includes("(reserved)"))).toBe(true);
  });

  it("reviews failure degrades to partial, scoring still lands", async () => {
    const { client, tables } = miniDb(AUDIT_TABLES);
    const store = new InMemorySpendStore();
    store.dailyCapUsd = 1.0;
    const queue = [
      INFO,
      { status_code: 40200, status_message: "Payment Required" }, // reviews task_post fails
      TASK_CREATED,
      UPDATES,
      TASK_CREATED,
      LOCAL_FINDER,
    ];
    const dfs = new DataForSeoClient({
      guard: new SpendGuard(store),
      credentials: { login: "l", password: "p" },
      fetchImpl: (async () => {
        const next = queue.shift();
        if (!next) throw new Error("mock queue empty");
        return { ok: true, status: 200, json: async () => next } as Response;
      }) as typeof fetch,
      pollIntervalMs: 1,
      maxPollMs: 100,
      sleep: async () => {},
    });

    const started = await startAudit(
      { dfs, db: client },
      {
        name: "मनोवेध हिप्नोक्लिनिक",
        city: "Karad",
        options: { competitors: 3, website_audit: false, post_audit: true },
      }
    );
    const progress = await started.done;
    expect(progress.status).toBe("partial");
    expect(progress.detail).toContain("reviews");
    expect(tables.audit_scores).toHaveLength(1);
    expect(tables.reviews_cache).toHaveLength(0);
  });
});
