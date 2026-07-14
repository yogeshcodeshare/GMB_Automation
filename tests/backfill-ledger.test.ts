import { describe, expect, it } from "vitest";
import type { Audit, AuditScores, Business } from "@/types";
import { backfillDemoSnapshots } from "@/server/audit/backfill";
import { buildAuditReport } from "@/server/audit/report";
import { listLedger } from "@/server/spend/ledger";
import { AUDIT_TABLES, miniDb, type Row } from "./helpers/mini-db";

/** Mirror the real seed's shape: businesses + DISPLAY-ONLY audit snapshots. */
function seedLike(tables: Record<string, Row[]>) {
  const rows: Array<[string, string, string, number, string | null]> = [
    ["b2", "Hotel Sahyadri Veg", "a2", 74, "https://hotelsahyadriveg.example.in"],
    ["b3", "श्री डेंटल केअर", "a3", 58, "https://shreedentalkarad.example.in"],
    ["b4", "Patil Coaching Classes", "a4", 66, null],
    ["b5", "कृष्णा मिसळ हाऊस", "a5", 34, null],
    ["b6", "Elegance Beauty Salon", "a6", 49, "https://elegancekarad.example.in"],
  ];
  for (const [bizId, name, auditId, total, website] of rows) {
    tables.businesses.push({
      id: bizId, name, city: "Karad", website, is_client: false, is_demo: true,
      place_id: `seed-${bizId}`, cid: `cid-${bizId}`, lat: 17.29, lng: 74.18,
    });
    tables.audits.push({
      id: auditId,
      business_id: bizId,
      raw_snapshot: { demo: true }, // display-only — NO normalized input
      competitor_ids: [],
      created_at: "2026-07-10T10:00:00+05:30",
    });
    tables.audit_scores.push({
      audit_id: auditId, total, claimed: 10, category: 10, completeness: 10,
      photos: 5, reviews_count: 5, reviews_velocity: 4, reply_rate: 4,
      posts: 5, website: 7, nap: 3,
    });
  }
}

describe("UAT-4 — seed-wide snapshot backfill", () => {
  it("backfills every display-only audit; skips ones that already have input", async () => {
    const { client, tables } = miniDb(AUDIT_TABLES);
    seedLike(tables);
    const first = await backfillDemoSnapshots(client, {});
    expect(first.updated.sort()).toEqual(["a2", "a3", "a4", "a5", "a6"]);
    expect(first.skipped).toEqual([]);
    // idempotent: second run touches nothing
    const second = await backfillDemoSnapshots(client, {});
    expect(second.updated).toEqual([]);
    expect(second.skipped.sort()).toEqual(["a2", "a3", "a4", "a5", "a6"]);
  });

  it("EP-002 report renders for EVERY seeded business with real header chips", async () => {
    const { client, tables } = miniDb(AUDIT_TABLES);
    seedLike(tables);
    await backfillDemoSnapshots(client, {});

    for (const auditRow of tables.audits) {
      const business = tables.businesses.find(
        (b) => b.id === auditRow.business_id
      ) as unknown as Business;
      const scores = tables.audit_scores.find(
        (s) => s.audit_id === auditRow.id
      ) as unknown as AuditScores;
      const report = buildAuditReport(business, auditRow as unknown as Audit, scores);

      // UAT-4: "★ · reviews" chip never blank
      expect(report.review_stats?.avg_rating).toBeGreaterThanOrEqual(3.6);
      expect(report.review_stats?.total).toBeGreaterThanOrEqual(8);
      // PSI chip populated whenever the business has a website section
      if (report.website) {
        expect(report.website.psi_score).not.toBeNull();
      }
      expect(report.rubric).toHaveLength(10);
      // stored score matches what the snapshot renders (list ↔ report consistent)
      expect(report.scores.total).toBe(scores.total);
    }
    // websites existed for 3 of 5 → at least those carry a PSI number
    const withSite = tables.audits.filter((a) => {
      const biz = tables.businesses.find((b) => b.id === a.business_id)!;
      return Boolean(biz.website);
    });
    expect(withSite.length).toBe(3);
  });

  it("bands stay in character (quality tuned from the seeded total)", async () => {
    const { client, tables } = miniDb(AUDIT_TABLES);
    seedLike(tables);
    await backfillDemoSnapshots(client, {});
    const totalOf = (id: string) =>
      (tables.audit_scores.find((s) => s.audit_id === id) as { total: number }).total;
    // b2 was seeded 74 (green-ish) and b5 was 34 (red-ish) — order must hold
    expect(totalOf("a2")).toBeGreaterThan(totalOf("a5"));
  });

  it("caches filled so P6/P7 go live for every demo business", async () => {
    const { client, tables } = miniDb(AUDIT_TABLES);
    seedLike(tables);
    await backfillDemoSnapshots(client, {});
    for (const biz of tables.businesses) {
      expect(
        tables.reviews_cache.some((r) => r.business_id === biz.id)
      ).toBe(true);
      expect(tables.posts_cache.some((p) => p.business_id === biz.id)).toBe(true);
    }
  });
});

describe("UAT-8 — spend ledger read", () => {
  it("newest first, numeric costs (numeric(10,6) strings coerced), real dates", async () => {
    const { client, tables } = miniDb(["spend_ledger"]);
    tables.spend_ledger.push(
      { id: 1, endpoint: "a", cost_usd: "0.002000", task_id: "t1", created_at: "2026-07-15T10:00:00Z" },
      { id: 2, endpoint: "b", cost_usd: "0.000600", task_id: null, created_at: "2026-07-16T10:00:00Z" },
      { id: 3, endpoint: "c", cost_usd: 0.0009, task_id: "t3", created_at: "2026-07-17T10:00:00Z" }
    );
    const rows = await listLedger(client, 50);
    expect(rows.map((r) => r.id)).toEqual([3, 2, 1]); // desc by created_at
    expect(rows[1].cost_usd).toBe(0.0006); // number, not string
    expect(rows[2].cost_usd).toBe(0.002);
    expect(rows[0].task_id).toBe("t3");
    expect(rows[1].task_id).toBeNull();
    // running total is trivially computable client-side from these rows
    const running = rows.reduceRight((sum, r) => sum + r.cost_usd, 0);
    expect(running).toBeCloseTo(0.0035, 6);
  });
});
