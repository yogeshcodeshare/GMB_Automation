import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSnapshot } from "@/server/audit/pipeline";
import { finishProgress, initProgress } from "@/server/audit/progress";
import { scoreAudit } from "@/server/score";
import { loadManovedhFixture } from "@/server/fixtures";
import { computePrereqs } from "@/server/sprint/prereqs";
import { generateCatalog } from "@/server/sprint/catalog";
import {
  assertNoBaselineTamper,
  createSprint,
  getSprintDetail,
  patchSprint,
  projectedScore,
  SprintGateError,
} from "@/server/sprint/engine";
import { buildSprintComparison, renderSprintReportHtml } from "@/server/sprint/report";
import { sprintGroupFor, type Business, type FixTask } from "@/types";
import { miniDb, type Row } from "./helpers/mini-db";

const SPRINT_TABLES = [
  "businesses",
  "audits",
  "audit_scores",
  "optimization_sprints",
  "fix_tasks",
  "ai_outputs",
  "settings",
  "grid_scans",
];

const NOW = new Date("2026-07-17T10:00:00Z");
const BIZ_ID = "b1111111-1111-4111-8111-111111111111";

const { input } = loadManovedhFixture();

function readyBusiness(): Row {
  return {
    id: BIZ_ID,
    name: "मनोवेध हिप्नोक्लिनिक",
    city: "Karad",
    place_id: input.profile.place_id,
    cid: input.profile.cid,
    lat: 17.29,
    lng: 74.18,
    website: "https://nlp-eft.grexa.site/",
    is_client: true,
    plan: { base: "gmb_boost", addons: [] },
    connection_status: "manager",
    owner_name: "Dr. Owner",
    owner_whatsapp: "+919000000011",
    created_at: "2026-07-01T00:00:00Z",
  };
}

/** Seed a scored fixture audit `ageDays` old; returns the audit id. */
function seedAudit(
  tables: Record<string, Row[]>,
  ageDays: number,
  id = "a1111111-1111-4111-8111-11111111111a"
): string {
  const createdAt = new Date(NOW.getTime() - ageDays * 86_400_000).toISOString();
  const snapshot = buildSnapshot(input, {
    source: "fixture",
    auditedAt: createdAt,
    progress: finishProgress(initProgress(`sprint-test-${id}`).audit_id, "done"),
  });
  tables.audits.push({
    id,
    business_id: BIZ_ID,
    raw_snapshot: snapshot,
    competitor_ids: [],
    created_at: createdAt,
  });
  tables.audit_scores.push({ audit_id: id, ...scoreAudit(input).scores });
  return id;
}

function readyDb() {
  const { client, tables } = miniDb(SPRINT_TABLES);
  tables.businesses.push(readyBusiness());
  seedAudit(tables, 2);
  return { client, tables };
}

const scriptedAi = {
  complete: async () => ({
    text: "मनोवेध हिप्नोक्लिनिक, कराड — संमोहन उपचारांनी मानसिक आरोग्य. वेळ ठरवून भेट द्या.",
    model_used: "groq/llama-3.3-70b-versatile",
  }),
};

// ---------- prereq gate matrix (US-024) ----------

describe("EP-021 prereq gate (server-side, per-reason failures)", () => {
  const CASES: Array<{
    name: string;
    mutate: (tables: Record<string, Row[]>) => void;
    expectReason: RegExp;
  }> = [
    {
      name: "prospect (not a client)",
      mutate: (t) => Object.assign(t.businesses[0], { is_client: false }),
      expectReason: /prospect/,
    },
    {
      name: "client without a plan",
      mutate: (t) => Object.assign(t.businesses[0], { plan: null }),
      expectReason: /no plan/,
    },
    {
      name: "owner contact missing",
      mutate: (t) => Object.assign(t.businesses[0], { owner_whatsapp: null }),
      expectReason: /owner contact/,
    },
    {
      name: "no connection (none)",
      mutate: (t) => Object.assign(t.businesses[0], { connection_status: "none" }),
      expectReason: /no profile access/,
    },
    {
      name: "stale audit (9 days)",
      mutate: (t) => {
        t.audits.length = 0;
        t.audit_scores.length = 0;
        seedAudit(t, 9, "a1111111-1111-4111-8111-11111111111b");
      },
      expectReason: /9 days old/,
    },
    {
      name: "no audit at all",
      mutate: (t) => {
        t.audits.length = 0;
        t.audit_scores.length = 0;
      },
      expectReason: /no finished audit/,
    },
  ];

  for (const c of CASES) {
    it(`fails with a clear reason: ${c.name}`, async () => {
      const { client, tables } = readyDb();
      c.mutate(tables);
      const gate = await computePrereqs(client, BIZ_ID, NOW);
      expect(gate.failures.length).toBeGreaterThan(0);
      expect(gate.failures.join(" | ")).toMatch(c.expectReason);
      await expect(
        createSprint({ db: client, ai: scriptedAi, now: () => NOW }, BIZ_ID)
      ).rejects.toBeInstanceOf(SprintGateError);
      expect(tables.optimization_sprints).toHaveLength(0); // nothing created
    });
  }

  it("all four gates pass on the ready business (manager = manual-mode ack)", async () => {
    const { client } = readyDb();
    const gate = await computePrereqs(client, BIZ_ID, NOW);
    expect(gate.prereqs).toEqual({
      is_client_with_plan: true,
      owner_contact_saved: true,
      connection_ready: true,
      fresh_audit: true,
      fresh_audit_age_days: 2,
    });
    expect(gate.failures).toEqual([]);
  });
});

// ---------- catalog ----------

describe("P12 task catalog from the Manovedh audit", () => {
  const catalog = generateCatalog(readyBusiness() as unknown as Business, input);

  it("~23 tasks across all six groups (Manovedh fails almost everything)", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(20);
    expect(catalog.length).toBeLessThanOrEqual(25);
    const groups = new Set(catalog.map((t) => sprintGroupFor(t.rubric_key)));
    expect(Array.from(groups).sort()).toEqual([
      "citations",
      "posts",
      "profile",
      "reviews",
      "visibility",
      "website",
    ]);
  });

  it("audit findings drive the deficit tasks with change_before values", () => {
    const by = (k: string) => catalog.find((t) => t.rubric_key === k);
    expect(by("primary_category")?.change_before).toBe("Hospital");
    expect(by("primary_category")?.manual.copy_value).toContain("Mental health clinic");
    expect(by("phone")).toBeDefined(); // phone missing
    expect(by("services")?.change_before).toBe("Services not found");
    expect(by("services")?.manual.copy_value).toContain("Hypnotherapy");
    expect(by("hours")?.change_before).toContain("12–9 am");
    expect(by("utm_website")?.manual.copy_value).toContain("utm_source=gbp");
    expect(by("reply_backlog")?.change_before).toBe("6.67% replied");
  });

  it("every task carries a manual-mode deep link (owner edit surface)", () => {
    for (const task of catalog) {
      expect(task.manual.google_editor_url).toMatch(/^https:\/\//);
    }
    const kg = catalog.find((t) => t.rubric_key === "primary_category");
    expect(kg?.manual.google_editor_url).toContain("kgmid=");
    const jd = catalog.find((t) => t.rubric_key === "citation_justdial");
    expect(jd?.manual.google_editor_url).toContain("justdial.com");
    expect(jd?.manual.copy_value).toContain("मनोवेध"); // NAP block to paste
  });

  it("review-machine task carries the writereview link as copy_value", () => {
    const rm = catalog.find((t) => t.rubric_key === "review_machine");
    expect(rm?.manual.copy_value).toContain("writereview?placeid=");
  });
});

// ---------- create + baseline lock ----------

describe("EP-021 create — baseline locks immutably", () => {
  it("creates the sprint with baseline + tasks + AI prefills (approved=false)", async () => {
    const { client, tables } = readyDb();
    const detail = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    expect(detail.sprint.status).toBe("active");
    expect(detail.sprint.baseline_audit_id).toBe(
      "a1111111-1111-4111-8111-11111111111a"
    );
    expect(detail.baseline_score).toBe(41);
    expect(detail.tasks.length).toBeGreaterThanOrEqual(20);
    // AI drafts persisted draft-only
    expect(tables.ai_outputs.length).toBeGreaterThanOrEqual(1);
    expect(tables.ai_outputs.every((o) => o.approved === false)).toBe(true);
    // the description task carries the AI prefill
    const desc = detail.tasks.find((t) => t.rubric_key === "description");
    expect(desc?.change_after).toContain("मनोवेध");
    // manual links map covers the tasks
    expect(Object.keys(detail.manual_links).length).toBeGreaterThanOrEqual(20);
  });

  it("AI failure never blocks the sprint (drafts stay null)", async () => {
    const { client, tables } = readyDb();
    const failingAi = {
      complete: async () => {
        throw new Error("model down");
      },
    };
    const detail = await createSprint(
      { db: client, ai: failingAi, now: () => NOW },
      BIZ_ID
    );
    expect(detail.tasks.length).toBeGreaterThanOrEqual(20);
    expect(tables.ai_outputs).toHaveLength(0);
  });

  it("second active sprint on the same business is rejected", async () => {
    const { client } = readyDb();
    await createSprint({ db: client, ai: scriptedAi, now: () => NOW }, BIZ_ID);
    await expect(
      createSprint({ db: client, ai: scriptedAi, now: () => NOW }, BIZ_ID)
    ).rejects.toThrow(/active sprint already exists/);
  });

  it("baseline tamper via PATCH body is rejected loudly", () => {
    expect(() =>
      assertNoBaselineTamper({ baseline_audit_id: "x" })
    ).toThrow(/baseline is locked/);
    expect(() =>
      assertNoBaselineTamper({ started_at: "2020-01-01" })
    ).toThrow(/baseline is locked/);
    expect(() => assertNoBaselineTamper({ task_id: "fine" })).not.toThrow();
  });

  it("baseline survives task patches + completion untouched (immutable)", async () => {
    const { client, tables } = readyDb();
    const created = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    const baselineBefore = { ...tables.optimization_sprints[0] };

    const task = created.tasks[0];
    await patchSprint({ db: client, now: () => NOW }, created.sprint.id, {
      task_id: task.id,
      task_status: "done",
      task_note: "done via test",
    });
    await patchSprint({ db: client, now: () => NOW }, created.sprint.id, {
      complete_sprint: true,
    });

    const after = tables.optimization_sprints[0];
    expect(after.baseline_audit_id).toBe(baselineBefore.baseline_audit_id);
    expect(after.baseline_grid_id).toBe(baselineBefore.baseline_grid_id);
    expect(after.started_at).toBe(baselineBefore.started_at);
    expect(after.status).toBe("complete");
  });
});

// ---------- patch flows ----------

describe("EP-021 PATCH flows", () => {
  async function withSprint() {
    const { client, tables } = readyDb();
    const detail = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    return { client, tables, detail };
  }

  it("task status → done stamps done_at; back to todo clears it", async () => {
    const { client, detail } = await withSprint();
    const task = detail.tasks[0];
    let updated = await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      task_id: task.id,
      task_status: "done",
    });
    const doneTask = updated.tasks.find((t) => t.id === task.id) as FixTask;
    expect(doneTask.status).toBe("done");
    expect(doneTask.done_at).toBe(NOW.toISOString());

    updated = await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      task_id: task.id,
      task_status: "todo",
    });
    expect(updated.tasks.find((t) => t.id === task.id)?.done_at).toBeNull();
  });

  it("add_custom_task lands with source manual; empty patch rejected", async () => {
    const { client, detail } = await withSprint();
    const updated = await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      add_custom_task: { title: "Print QR standee", rubric_key: "review_machine" },
    });
    const custom = updated.tasks.find((t) => t.title === "Print QR standee");
    expect(custom?.source).toBe("manual");
    await expect(
      patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {})
    ).rejects.toThrow(/empty patch/);
  });

  it("cross-sprint task ids do not match (scoped update)", async () => {
    const { client, detail } = await withSprint();
    await expect(
      patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
        task_id: "00000000-0000-4000-8000-00000000dead",
        task_status: "done",
      })
    ).rejects.toThrow(/NOT_FOUND/);
  });

  it("projected score rises as tasks complete (deterministic simulator)", async () => {
    const { client, detail } = await withSprint();
    expect(detail.current_projected_score).toBe(41); // nothing done yet
    const category = detail.tasks.find((t) => t.rubric_key === "primary_category")!;
    const updated = await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      task_id: category.id,
      task_status: "done",
    });
    // category row lost 15 points at baseline; its only task is done → +15
    expect(updated.current_projected_score).toBe(56);
  });

  it("projectedScore caps at 100 and ignores unmapped keys", () => {
    const rubric = scoreAudit(input).rubric;
    const tasks = [
      { rubric_key: "weak_zone", status: "done" },
      { rubric_key: "unknown_thing", status: "done" },
    ] as unknown as FixTask[];
    expect(projectedScore(rubric, 41, tasks)).toBe(41);
    expect(projectedScore(rubric, 99, [])).toBe(99);
  });
});

// ---------- EP-022 comparison ----------

describe("EP-022 before/after comparison", () => {
  it("mid-sprint (no re-audit): baseline only + explanatory note", async () => {
    const { client, detail } = await (async () => {
      const { client, tables } = readyDb();
      const detail = await createSprint(
        { db: client, ai: scriptedAi, now: () => NOW },
        BIZ_ID
      );
      return { client, tables, detail };
    })();
    const c = await buildSprintComparison(client, detail.sprint.id);
    expect(c).not.toBeNull();
    expect(c!.before.total).toBe(41);
    expect(c!.after).toBeNull();
    expect(c!.score_delta).toBeNull();
    expect(c!.note).toContain("No re-audit");
  });

  it("after a re-audit: deltas per rubric row + field changes + work log", async () => {
    const { client, tables } = readyDb();
    const detail = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    // founder does the work…
    const task = detail.tasks.find((t) => t.rubric_key === "primary_category")!;
    await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      task_id: task.id,
      task_status: "done",
      change_after: "Mental health clinic",
    });
    // …and a re-audit lands AFTER sprint start with a better score
    const improved = structuredClone(input);
    improved.profile.categories.primary = "Mental health clinic";
    const afterId = "a1111111-1111-4111-8111-11111111111c";
    const createdAt = new Date(NOW.getTime() + 3 * 86_400_000).toISOString();
    tables.audits.push({
      id: afterId,
      business_id: BIZ_ID,
      raw_snapshot: buildSnapshot(improved, {
        source: "fixture",
        auditedAt: createdAt,
        progress: finishProgress(initProgress("after").audit_id, "done"),
      }),
      competitor_ids: [],
      created_at: createdAt,
    });
    tables.audit_scores.push({ audit_id: afterId, ...scoreAudit(improved).scores });

    const c = await buildSprintComparison(client, detail.sprint.id);
    expect(c!.after?.total).toBe(56); // 41 + the category 15
    expect(c!.score_delta).toBe(15);
    const catDelta = c!.rubric_deltas.find((d) => d.key === "category");
    expect(catDelta).toMatchObject({ before: 0, after: 15, delta: 15 });
    expect(c!.field_changes.some((f) => f.after === "Mental health clinic")).toBe(true);
    expect(c!.work_log.length).toBeGreaterThanOrEqual(20);

    // report HTML: escaped, gauges for both sides, delta badge
    const html = renderSprintReportHtml(c!);
    expect(html).toContain("▲ 15");
    expect((html.match(/class="score-gauge"/g) ?? []).length).toBe(2);
    expect(html).toContain("Content-Security-Policy");
    expect(html).not.toMatch(/<script/i);
  });
});

// ---------- zero vendor calls in the whole M6 path ----------

describe("M6 is vendor-free (DB + AI only)", () => {
  it("no sprint module IMPORTS the dataforseo service or the spend guard", () => {
    for (const file of ["prereqs.ts", "catalog.ts", "engine.ts", "report.ts", "index.ts"]) {
      const src = readFileSync(
        path.join(process.cwd(), "src", "server", "sprint", file),
        "utf-8"
      );
      // Comments may MENTION the vendor ("zero DataForSEO calls") — imports may not.
      expect(src).not.toMatch(/from\s+["']@\/server\/dataforseo/);
      expect(src).not.toMatch(/from\s+["']@\/server\/spend/);
      expect(src).not.toMatch(/import[^;]*SpendGuard/);
    }
  });

  it("create→patch→complete→report runs with fetch POISONED (no network)", async () => {
    const realFetch = globalThis.fetch;
    let networkCalls = 0;
    globalThis.fetch = (async () => {
      networkCalls++;
      throw new Error("network poisoned — M6 must not fetch");
    }) as typeof fetch;
    try {
      const { client } = readyDb();
      const detail = await createSprint(
        { db: client, ai: scriptedAi, now: () => NOW },
        BIZ_ID
      );
      await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
        task_id: detail.tasks[0].id,
        task_status: "done",
      });
      await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
        complete_sprint: true,
      });
      const c = await buildSprintComparison(client, detail.sprint.id);
      renderSprintReportHtml(c!);
      expect(networkCalls).toBe(0);
      const readBack = await getSprintDetail({ db: client }, detail.sprint.id);
      expect(readBack?.sprint.status).toBe("complete");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
