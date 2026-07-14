import { describe, expect, it } from "vitest";
import type { Audit, AuditScores, Business } from "@/types";
import {
  demoCandidatesFor,
  demoInputFor,
  startDemoAudit,
  verticalFor,
} from "@/server/audit/demo";
import { buildAuditReport } from "@/server/audit/report";
import { getProgress } from "@/server/audit/progress";
import { scoreAudit } from "@/server/score";
import { AUDIT_TABLES, miniDb } from "./helpers/mini-db";

const NOW = new Date("2026-07-18T10:00:00Z");

describe("UAT-2 — deterministic synthetic generator", () => {
  it("same name+city → byte-identical input; different city → different", () => {
    const a = demoInputFor("Shree Dental Care", "Karad", { reference: NOW });
    const b = demoInputFor("Shree Dental Care", "Karad", { reference: NOW });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = demoInputFor("Shree Dental Care", "Satara", { reference: NOW });
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it("values are plausible and fixture-shaped", () => {
    for (const [name, city] of [
      ["Shree Dental Care", "Karad"],
      ["Hotel Sahyadri", "Karad"],
      ["Glamour Beauty Salon", "Satara"],
      ["Patil Coaching Classes", "Karad"],
      ["Random Traders", "Karad"],
    ] as const) {
      const input = demoInputFor(name, city, { reference: NOW });
      expect(input.profile.rating).toBeGreaterThanOrEqual(3.6);
      expect(input.profile.rating).toBeLessThanOrEqual(4.9);
      expect(input.profile.reviews_total).toBeGreaterThanOrEqual(8);
      expect(input.profile.place_id).toMatch(/^demo-/);
      expect(input.profile.hours).toHaveLength(7);
      expect(input.reviews?.items.length).toBeGreaterThan(0);
      expect(input.competitors).toHaveLength(3);
      // and it SCORES like a real audit
      const { scores, band } = scoreAudit(input);
      expect(scores.total).toBeGreaterThanOrEqual(0);
      expect(scores.total).toBeLessThanOrEqual(100);
      expect(["red", "amber", "green"]).toContain(band);
    }
  });

  it("vertical inference picks category families from the name", () => {
    expect(verticalFor("Shree Dental Care").key).toBe("dental");
    expect(verticalFor("हॉटेल सह्याद्री").key).toBe("food");
    expect(verticalFor("Glamour Beauty Salon").key).toBe("salon");
    expect(verticalFor("Excel Coaching Classes").key).toBe("coaching");
    expect(verticalFor("मनोवेध हिप्नोक्लिनिक").key).toBe("clinic");
    expect(verticalFor("Random Traders").key).toBe("local");
  });

  it("quality knob drives deficits (backfill uses this)", () => {
    const weak = demoInputFor("X Shop", "Karad", { quality: 0.15, reference: NOW });
    const strong = demoInputFor("X Shop", "Karad", { quality: 0.9, reference: NOW });
    expect(scoreAudit(weak).scores.total).toBeLessThan(
      scoreAudit(strong).scores.total
    );
    expect(strong.profile.services.length).toBeGreaterThan(0);
    expect(weak.profile.categories.primary).toBe(verticalFor("X Shop").genericPrimary);
  });

  it("candidates are labeled demo + deterministic", () => {
    const a = demoCandidatesFor("Karad Auto Garage", "Karad");
    const b = demoCandidatesFor("Karad Auto Garage", "Karad");
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    for (const c of a) {
      expect(c.place_id).toMatch(/^demo-/);
      expect(c.address).toContain("demo data");
    }
  });
});

describe("UAT-2 — startDemoAudit end-to-end (poisoned fetch, ₹0)", () => {
  it("full staged pipeline persists everything with zero network", async () => {
    const realFetch = globalThis.fetch;
    let networkCalls = 0;
    globalThis.fetch = (async () => {
      networkCalls++;
      throw new Error("network poisoned — demo mode must not fetch");
    }) as typeof fetch;
    try {
      const { client, tables } = miniDb(AUDIT_TABLES);
      const started = await startDemoAudit(
        { db: client, now: () => NOW },
        { name: "Shree Dental Care", city: "Karad" }
      );
      const progress = await started.done;
      expect(progress.status).toBe("done");
      expect(progress.detail).toContain("demo data");
      expect(getProgress(started.audit_id)?.done_stages).toContain("website");

      // business persisted with is_demo=true and a demo place_id
      const business = tables.businesses[0];
      expect(business.is_demo).toBe(true);
      expect(business.place_id).toMatch(/^demo-/);

      // snapshot source=demo + scores + caches
      const audit = tables.audits[0];
      const snap = audit.raw_snapshot as Record<string, unknown>;
      expect(snap.source).toBe("demo");
      expect(snap.input).toBeTruthy();
      expect(tables.audit_scores).toHaveLength(1);
      expect(tables.reviews_cache.length).toBeGreaterThan(0);
      expect(tables.posts_cache.length).toBeGreaterThan(0);

      expect(networkCalls).toBe(0);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("EP-002 report assembles from a demo audit: rating/reviews/psi populated (UAT-4)", async () => {
    const { client, tables } = miniDb(AUDIT_TABLES);
    const started = await startDemoAudit(
      { db: client, now: () => NOW },
      { name: "Hotel Sahyadri Veg", city: "Karad" }
    );
    await started.done;
    const business = tables.businesses[0] as unknown as Business;
    const audit = tables.audits[0] as unknown as Audit;
    const scores = tables.audit_scores[0] as unknown as AuditScores;
    const report = buildAuditReport(business, audit, scores);

    // UAT-4: the report-header chips have real values
    expect(report.review_stats?.avg_rating).toBeGreaterThanOrEqual(3.6);
    expect(report.review_stats?.total).toBeGreaterThanOrEqual(8);
    if (report.website) {
      expect(report.website.psi_score).toBeGreaterThanOrEqual(30);
    }
    expect(report.rubric).toHaveLength(10);
    expect(report.top_fixes.length).toBeGreaterThan(0);
    // demo label surfaces: snapshot source + business flag
    expect((audit.raw_snapshot as { source?: string }).source).toBe("demo");
    expect((business as unknown as { is_demo?: boolean }).is_demo).toBe(true);
  });

  it("re-running the same demo target reuses the business row (place_id upsert)", async () => {
    const { client, tables } = miniDb(AUDIT_TABLES);
    await (
      await startDemoAudit({ db: client, now: () => NOW }, { name: "A Shop", city: "Karad" })
    ).done;
    await (
      await startDemoAudit({ db: client, now: () => NOW }, { name: "A Shop", city: "Karad" })
    ).done;
    expect(tables.businesses).toHaveLength(1); // deterministic place_id upserted
    expect(tables.audits).toHaveLength(2); // history accumulates
  });

  it("demo modules never import the vendor or the spend guard", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const src = fs.readFileSync(
      path.join(process.cwd(), "src", "server", "audit", "demo.ts"),
      "utf-8"
    );
    expect(src).not.toMatch(/from\s+["']@\/server\/dataforseo/);
    expect(src).not.toMatch(/from\s+["']@\/server\/spend/);
    expect(src).not.toMatch(/from\s+["']@\/server\/settings\/live-flag/);
  });
});
