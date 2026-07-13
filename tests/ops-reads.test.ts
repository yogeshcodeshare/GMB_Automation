import { describe, expect, it } from "vitest";
import { listCycles, todaysWork } from "@/server/ops/reads";
import { miniDb, type Row } from "./helpers/mini-db";

const OPS_TABLES = [
  "businesses",
  "service_cycles",
  "reviews_cache",
  "posts_cache",
  "review_requests",
  "media_inbox",
  "optimization_sprints",
  "fix_tasks",
];

const NOW = new Date("2026-07-28T10:00:00Z"); // near month end (report_due window)

function seed(tables: Record<string, Row[]>) {
  tables.businesses.push(
    {
      id: "c1", name: "Hotel Sahyadri Veg", city: "Karad", is_client: true,
      plan: { base: "gmb_boost", addons: ["content"] }, connection_status: "oauth",
      owner_whatsapp: "+919000000022",
    },
    {
      id: "c2", name: "श्री डेंटल केअर", city: "Karad", is_client: true,
      plan: { base: "gmb_boost", addons: [] }, connection_status: "manager",
      owner_whatsapp: "+919000000033",
    },
    { id: "p1", name: "Prospect Cafe", city: "Karad", is_client: false }
  );
  tables.service_cycles.push(
    {
      id: "cy1", business_id: "c1", month: "2026-07-01", posts_done: 6,
      posts_target: 8, photos_done: 7, photos_target: 10, replies_pct: 100,
      report_sent: false, checklist: { note: "on track" },
    },
    {
      id: "cy2", business_id: "c2", month: "2026-07-01", posts_done: 8,
      posts_target: 8, photos_done: 10, photos_target: 10, replies_pct: 100,
      report_sent: true, checklist: {},
    }
  );
  tables.reviews_cache.push(
    { business_id: "c1", review_id: "r1", rating: 5, review_ts: "2026-07-10", replied: false },
    { business_id: "c1", review_id: "r2", rating: 4, review_ts: "2026-06-10", replied: true },
    { business_id: "c2", review_id: "r3", rating: 5, review_ts: "2026-07-20", replied: true }
  );
  tables.posts_cache.push(
    { business_id: "c1", post_ts: "2026-07-05T10:00:00Z" },
    { business_id: "c1", post_ts: "2026-05-05T10:00:00Z" }
  );
  tables.review_requests.push(
    // sent 6 days before NOW, never reminded, no review → reminder due
    { business_id: "c1", customer_phone: "+91", sent_ts: "2026-07-22T10:00:00Z", reminded_ts: null, review_detected: false },
    { business_id: "c2", customer_phone: "+91", sent_ts: "2026-07-27T10:00:00Z", reminded_ts: null, review_detected: false }
  );
  tables.media_inbox.push(
    { business_id: "c1", storage_path: "x.jpg", published: false },
    { business_id: "c1", storage_path: "y.jpg", published: true }
  );
  tables.optimization_sprints.push({ id: "s1", business_id: "c2", status: "complete" });
  tables.fix_tasks.push(
    { sprint_id: "s1", rubric_key: "phone", title: "Add phone", status: "done", done_at: "2026-07-15T10:00:00Z" },
    { sprint_id: "s1", rubric_key: "hours", title: "Fix hours", status: "todo", done_at: null }
  );
}

describe("P9 reads — GET /api/ops/cycles source", () => {
  it("clients only, cycle matched by month, JS month-window counts", async () => {
    const { client, tables } = miniDb(OPS_TABLES);
    seed(tables);
    const views = await listCycles(client, "2026-07");
    expect(views.map((v) => v.business.id).sort()).toEqual(["c1", "c2"]); // no prospect
    const c1 = views.find((v) => v.business.id === "c1")!;
    expect(c1.cycle?.posts_done).toBe(6);
    expect(c1.counts).toEqual({
      reviews_month: 1, // July review only
      posts_month: 1, // July post only
      review_requests_month: 1,
      media_pending: 1,
      pending_replies: 1,
    });
    const c2 = views.find((v) => v.business.id === "c2")!;
    expect(c2.work_log).toEqual([
      { title: "Add phone", done_at: "2026-07-15T10:00:00Z", rubric_key: "phone" },
    ]);
  });

  it("month without a cycle row → cycle null, counts still real", async () => {
    const { client, tables } = miniDb(OPS_TABLES);
    seed(tables);
    const views = await listCycles(client, "2026-06");
    const c1 = views.find((v) => v.business.id === "c1")!;
    expect(c1.cycle).toBeNull();
    expect(c1.counts.reviews_month).toBe(1); // the June review
  });
});

describe("P9 reads — GET /api/ops/today source", () => {
  it("emits the five kinds with per-client labels and counts", async () => {
    const { client, tables } = miniDb(OPS_TABLES);
    seed(tables);
    const items = await todaysWork(client, NOW);
    const kinds = items.map((i) => `${i.business_id}:${i.kind}`).sort();
    expect(kinds).toEqual([
      "c1:pending_reply",
      "c1:post_due",
      "c1:publish_photo",
      "c1:report_due", // 28 Jul = last-5-days window, report_sent=false
      "c1:review_request_reminder", // sent 6 days ago, no reminder
    ]);
    const postDue = items.find((i) => i.kind === "post_due")!;
    expect(postDue.count).toBe(2); // 8 target − 6 done
    // c2: everything done/sent/recent → contributes nothing
    expect(items.some((i) => i.business_id === "c2")).toBe(false);
  });
});
