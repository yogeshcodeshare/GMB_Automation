import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSnapshot } from "@/server/audit/pipeline";
import { finishProgress, initProgress } from "@/server/audit/progress";
import { scoreAudit } from "@/server/score";
import { loadManovedhFixture } from "@/server/fixtures";
import { computePrereqs } from "@/server/sprint/prereqs";
import { generateCatalog, isAllowlistedEditorUrl } from "@/server/sprint/catalog";
import {
  assertStrictPatchShape,
  createSprint,
  customKeyFor,
  getActiveSprintDetail,
  getSprintDetail,
  patchSprint,
  rubricPointsFor,
  SprintGateError,
  SprintPatchError,
} from "@/server/sprint/engine";
import { buildSprintComparison, renderSprintReportHtml } from "@/server/sprint/report";
import {
  projectedScore,
  SPRINT_TASK_CATALOG,
  sprintGroupFor,
  type Business,
  type SprintGroup,
} from "@/types";
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
  "grid_points",
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

// ---------- prereq gate matrix (US-024, LOCKED PrereqCheck shape) ----------

describe("EP-021 prereq gate — five PrereqCheck{ok,reason} + eligible", () => {
  const CASES: Array<{
    name: string;
    check: keyof Pick<
      import("@/types").SprintPrereqs,
      | "is_client_with_plan"
      | "owner_contact_saved"
      | "connection_ready"
      | "fresh_audit"
      | "no_active_sprint"
    >;
    mutate: (tables: Record<string, Row[]>) => void;
    expectReason: RegExp;
  }> = [
    {
      name: "prospect (not a client)",
      check: "is_client_with_plan",
      mutate: (t) => Object.assign(t.businesses[0], { is_client: false }),
      expectReason: /prospect/,
    },
    {
      name: "client without a plan",
      check: "is_client_with_plan",
      mutate: (t) => Object.assign(t.businesses[0], { plan: null }),
      expectReason: /no plan/,
    },
    {
      name: "owner contact missing",
      check: "owner_contact_saved",
      mutate: (t) => Object.assign(t.businesses[0], { owner_whatsapp: null }),
      expectReason: /owner contact/,
    },
    {
      name: "no connection (none)",
      check: "connection_ready",
      mutate: (t) => Object.assign(t.businesses[0], { connection_status: "none" }),
      expectReason: /no profile access/,
    },
    {
      name: "stale audit (9 days)",
      check: "fresh_audit",
      mutate: (t) => {
        t.audits.length = 0;
        t.audit_scores.length = 0;
        seedAudit(t, 9, "a1111111-1111-4111-8111-11111111111b");
      },
      expectReason: /9 days old/,
    },
    {
      name: "no audit at all",
      check: "fresh_audit",
      mutate: (t) => {
        t.audits.length = 0;
        t.audit_scores.length = 0;
      },
      expectReason: /no finished audit/,
    },
    {
      name: "active sprint already running",
      check: "no_active_sprint",
      mutate: (t) => {
        t.optimization_sprints.push({
          id: "00000000-0000-4000-8000-00000000aaaa",
          business_id: BIZ_ID,
          status: "active",
          started_at: NOW.toISOString(),
          baseline_audit_id: "a1111111-1111-4111-8111-11111111111a",
        });
      },
      expectReason: /active sprint already exists/,
    },
  ];

  for (const c of CASES) {
    it(`${c.name} → ${c.check}.ok=false with the reason`, async () => {
      const { client, tables } = readyDb();
      c.mutate(tables);
      const before = tables.optimization_sprints.length;
      const gate = await computePrereqs(client, BIZ_ID, NOW);
      expect(gate.prereqs.eligible).toBe(false);
      expect(gate.prereqs[c.check].ok).toBe(false);
      expect(gate.prereqs[c.check].reason).toMatch(c.expectReason);
      await expect(
        createSprint({ db: client, ai: scriptedAi, now: () => NOW }, BIZ_ID)
      ).rejects.toBeInstanceOf(SprintGateError);
      expect(tables.optimization_sprints.length).toBe(before); // nothing created
    });
  }

  it("ready business: eligible, all five ok, ids populated", async () => {
    const { client } = readyDb();
    const gate = await computePrereqs(client, BIZ_ID, NOW);
    expect(gate.prereqs.eligible).toBe(true);
    for (const key of [
      "is_client_with_plan",
      "owner_contact_saved",
      "connection_ready",
      "fresh_audit",
      "no_active_sprint",
    ] as const) {
      expect(gate.prereqs[key]).toEqual({ ok: true, reason: "" });
    }
    expect(gate.prereqs.fresh_audit_age_days).toBe(2);
    expect(gate.prereqs.fresh_audit_id).toBe("a1111111-1111-4111-8111-11111111111a");
    expect(gate.prereqs.active_sprint_id).toBeNull();
  });

  it("active sprint failure carries active_sprint_id (UI resumes)", async () => {
    const { client, tables } = readyDb();
    tables.optimization_sprints.push({
      id: "00000000-0000-4000-8000-00000000aaaa",
      business_id: BIZ_ID,
      status: "active",
      started_at: NOW.toISOString(),
      baseline_audit_id: "a1111111-1111-4111-8111-11111111111a",
    });
    const gate = await computePrereqs(client, BIZ_ID, NOW);
    expect(gate.prereqs.active_sprint_id).toBe("00000000-0000-4000-8000-00000000aaaa");
  });
});

// ---------- catalog (LOCKED 23-key vocabulary) ----------

describe("P12 catalog — instantiates the LOCKED SPRINT_TASK_CATALOG", () => {
  const catalog = generateCatalog(readyBusiness() as unknown as Business, input);

  it("all 23 pinned keys, in catalog order", () => {
    expect(catalog.map((c) => c.seed.rubric_key)).toEqual(
      SPRINT_TASK_CATALOG.map((s) => s.rubric_key)
    );
  });

  it("audit findings drive current/suggested values", () => {
    const by = (k: string) => catalog.find((c) => c.seed.rubric_key === k)!;
    expect(by("category_primary_fix").current_value).toBe("Hospital");
    expect(by("category_primary_fix").suggested_value).toContain("Mental health clinic");
    expect(by("primary_phone").current_value).toBeNull(); // phone missing
    expect(by("primary_phone").suggested_value).toBe("+919000000011");
    expect(by("services").current_value).toBe("Services not found");
    expect(by("services").copy_text).toContain("Hypnotherapy");
    expect(by("hours_fix").current_value).toContain("12–9 am");
    expect(by("utm_link").suggested_value).toContain("utm_source=gbp");
    expect(by("reply_backlog").current_value).toBe("6.67% replied");
    expect(by("review_machine").copy_text).toContain("writereview?placeid=");
    expect(by("website_vendor").copy_text).toContain("Website brief");
    expect(by("citation_nap").copy_text).toContain("मनोवेध");
  });

  it("editor_url is allowlisted-Google-only; vendor/directory tasks are null", () => {
    for (const c of catalog) {
      if (c.editor_url !== null) {
        expect(isAllowlistedEditorUrl(c.editor_url)).toBe(true);
      }
    }
    const by = (k: string) => catalog.find((c) => c.seed.rubric_key === k)!;
    expect(by("category_primary_fix").editor_url).toContain("kgmid=");
    expect(by("reply_backlog").editor_url).toContain("search.google.com/local/reviews");
    expect(by("website_vendor").editor_url).toBeNull();
    expect(by("citation_directories").editor_url).toBeNull();
    // directory links still reach the founder via copy_text
    expect(by("citation_directories").copy_text).toContain("justdial.com");
  });
});

// ---------- create + enriched SprintDetail ----------

describe("EP-021 create — locked baseline + enriched SprintTask[]", () => {
  it("creates with baseline{locked}, groups, prereqs echo, AI prefills", async () => {
    const { client, tables } = readyDb();
    const detail = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    expect(detail.sprint.status).toBe("active");
    expect(detail.baseline).toMatchObject({
      audit_id: "a1111111-1111-4111-8111-11111111111a",
      score: 41,
      band: "amber",
      locked: true,
      captured_at: NOW.toISOString(),
    });
    expect(detail.baseline_score).toBe(41);
    expect(detail.tasks).toHaveLength(23);

    // enriched fields
    const desc = detail.tasks.find((t) => t.rubric_key === "description")!;
    expect(desc.group).toBe("profile");
    expect(desc.rubric).toBe("completeness");
    expect(desc.approved).toBe(false); // approve-before-publish
    expect(desc.suggested_value).toContain("मनोवेध"); // AI draft
    expect(desc.ai_output_id).toBeTruthy();
    expect(desc.estimate_minutes).toBe(10);

    // groups: all six, catalog-ordered, with remaining_minutes
    expect(detail.groups.map((g) => g.group)).toEqual([
      "profile",
      "reviews",
      "posts",
      "website",
      "visibility",
      "citations",
    ]);
    const profile = detail.groups[0];
    expect(profile.total_count).toBe(14);
    expect(profile.done_count).toBe(0);
    expect(profile.remaining_minutes).toBeGreaterThan(0);

    // prereqs echoed: active sprint now exists → no_active_sprint=false
    expect(detail.prereqs.no_active_sprint.ok).toBe(false);
    expect(detail.prereqs.active_sprint_id).toBe(detail.sprint.id);

    // AI drafts persisted draft-only in ai_outputs
    expect(tables.ai_outputs.length).toBeGreaterThanOrEqual(1);
    expect(tables.ai_outputs.every((o) => o.approved === false)).toBe(true);
  });

  it("rubric_points: per-row sums equal the baseline gap (never exceed)", async () => {
    const { client } = readyDb();
    const detail = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    const baselineRubric = scoreAudit(input).rubric;
    const byRubric = new Map<string, number>();
    for (const task of detail.tasks) {
      if (!task.rubric) continue;
      byRubric.set(task.rubric, (byRubric.get(task.rubric) ?? 0) + task.rubric_points);
    }
    for (const row of baselineRubric) {
      const sum = byRubric.get(row.key);
      if (sum !== undefined) {
        expect(sum).toBe(row.max - row.points); // exact split, ≤ gap
      }
    }
    // category gap 15 split over 2 category tasks → 8 + 7 (order-stable)
    const catTasks = detail.tasks.filter((t) => t.rubric === "category");
    expect(catTasks.map((t) => t.rubric_points).sort((a, b) => b - a)).toEqual([8, 7]);
    // visibility task moves the grid, not the rubric
    expect(detail.tasks.find((t) => t.rubric_key === "weak_zone")!.rubric_points).toBe(0);
  });

  it("AI failure never blocks the sprint (suggestions stay deterministic)", async () => {
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
    expect(detail.tasks).toHaveLength(23);
    expect(tables.ai_outputs).toHaveLength(0);
    const desc = detail.tasks.find((t) => t.rubric_key === "description")!;
    expect(desc.ai_output_id).toBeNull();
  });

  it("baseline survives task patches + completion untouched (immutable)", async () => {
    const { client, tables } = readyDb();
    const created = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    const before = { ...tables.optimization_sprints[0] };
    const task = created.tasks.find((t) => t.rubric_key === "hours_fix")!;
    await patchSprint({ db: client, now: () => NOW }, created.sprint.id, {
      task_id: task.id,
      task_approved: true,
      change_after: "Mon–Sat 10:00–20:00",
      task_status: "done",
    });
    await patchSprint({ db: client, now: () => NOW }, created.sprint.id, {
      complete_sprint: true,
    });
    const after = tables.optimization_sprints[0];
    expect(after.baseline_audit_id).toBe(before.baseline_audit_id);
    expect(after.baseline_grid_id).toBe(before.baseline_grid_id);
    expect(after.started_at).toBe(before.started_at);
    expect(after.status).toBe("complete");
  });
});

// ---------- strict PATCH shape + approve gate ----------

describe("EP-021 PATCH — strict shape + approve-before-done invariant", () => {
  async function withSprint() {
    const { client, tables } = readyDb();
    const detail = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    return { client, tables, detail };
  }

  it("strict shape: locked keys AND unknown keys rejected", () => {
    expect(() => assertStrictPatchShape({ baseline_audit_id: "x" })).toThrow(
      /baseline is locked/
    );
    expect(() => assertStrictPatchShape({ after_audit_id: "x" })).toThrow(
      /baseline is locked/
    );
    expect(() => assertStrictPatchShape({ totally_new_key: 1 })).toThrow(
      /unknown key/
    );
    expect(() =>
      assertStrictPatchShape({ task_id: "x", task_status: "done" })
    ).not.toThrow();
  });

  it("audit task: done WITHOUT approve → rejected; approve alone isn't enough", async () => {
    const { client, detail } = await withSprint();
    const task = detail.tasks.find((t) => t.rubric_key === "primary_phone")!;
    await expect(
      patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
        task_id: task.id,
        task_status: "done",
        change_after: "+919000000011",
      })
    ).rejects.toThrow(/approve the suggestion first/);
    await expect(
      patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
        task_id: task.id,
        task_status: "done",
        task_approved: true, // approved but no change_after recorded
      })
    ).rejects.toThrow(/record change_after/);
  });

  it("approve + change_after (same patch or prior) unlocks done", async () => {
    const { client, detail } = await withSprint();
    const task = detail.tasks.find((t) => t.rubric_key === "primary_phone")!;
    const updated = await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      task_id: task.id,
      task_approved: true,
      change_after: "+919000000011",
      task_status: "done",
    });
    const done = updated.tasks.find((t) => t.id === task.id)!;
    expect(done.status).toBe("done");
    expect(done.approved).toBe(true);
    expect(done.done_at).toBe(NOW.toISOString());
  });

  it("custom task: {title, group} → synthesized key maps back to the group; no approval needed", async () => {
    const { client, detail } = await withSprint();
    const updated = await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      add_custom_task: { title: "Print QR standee", group: "reviews" },
    });
    const custom = updated.tasks.find((t) => t.title === "Print QR standee")!;
    expect(custom.source).toBe("manual");
    expect(custom.group).toBe("reviews");
    expect(custom.approved).toBe(true); // founder authored it
    expect(custom.rubric_points).toBe(0);
    expect(custom.estimate_minutes).toBeNull();
    // done without the approve dance (manual tasks skip #4)
    const after = await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      task_id: custom.id,
      task_status: "done",
    });
    expect(after.tasks.find((t) => t.id === custom.id)!.status).toBe("done");
  });

  it("customKeyFor maps every group back through sprintGroupFor", () => {
    const groups: SprintGroup[] = [
      "profile",
      "reviews",
      "posts",
      "website",
      "visibility",
      "citations",
    ];
    for (const g of groups) {
      expect(sprintGroupFor(customKeyFor(g, "abc"))).toBe(g);
    }
  });

  it("invalid group + oversized title rejected; empty patch rejected", async () => {
    const { client, detail } = await withSprint();
    await expect(
      patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
        add_custom_task: { title: "x", group: "nonsense" as SprintGroup },
      })
    ).rejects.toBeInstanceOf(SprintPatchError);
    await expect(
      patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {})
    ).rejects.toThrow(/empty patch/);
  });

  it("projected score uses rubric_points (category fix done → 41 + 8)", async () => {
    const { client, detail } = await withSprint();
    expect(detail.current_projected_score).toBe(41);
    const cat = detail.tasks.find((t) => t.rubric_key === "category_primary_fix")!;
    expect(cat.rubric_points).toBe(8); // first of two category tasks (gap 15 → 8+7)
    const updated = await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      task_id: cat.id,
      task_approved: true,
      change_after: "Mental health clinic",
      task_status: "done",
    });
    expect(updated.current_projected_score).toBe(49);
    // the @/types helper agrees
    expect(projectedScore(41, updated.tasks)).toBe(49);
  });

  it("GET ?businessId= returns the active sprint, null when none", async () => {
    const { client, detail } = await withSprint();
    const active = await getActiveSprintDetail({ db: client }, BIZ_ID);
    expect(active?.sprint.id).toBe(detail.sprint.id);
    await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      complete_sprint: true,
    });
    expect(await getActiveSprintDetail({ db: client }, BIZ_ID)).toBeNull();
    // completed sprint still readable by id
    const byId = await getSprintDetail({ db: client }, detail.sprint.id);
    expect(byId?.sprint.status).toBe("complete");
  });
});

// ---------- EP-022 comparison (LOCKED SprintBeforeAfter) ----------

describe("EP-022 before/after — SprintBeforeAfter shape", () => {
  it("mid-sprint (no re-audit): PARTIAL semantics — nulls + [] + change logs", async () => {
    const { client, detail } = await (async () => {
      const { client } = readyDb();
      const detail = await createSprint(
        { db: client, ai: scriptedAi, now: () => NOW },
        BIZ_ID
      );
      return { client, detail };
    })();
    const data = await buildSprintComparison(client, detail.sprint.id);
    expect(data).not.toBeNull();
    const r = data!.report;
    expect(r.baseline_score).toBe(41);
    expect(r.band_before).toBe("amber");
    expect(r.final_score).toBeNull();
    expect(r.score_delta).toBeNull();
    expect(r.band_after).toBeNull();
    expect(r.rubric_deltas).toEqual([]);
    expect(r.grid).toBeNull();
    expect(r.tasks_total).toBe(23);
    expect(r.work_log).toHaveLength(23);
  });

  it("after a re-audit: deltas + field changes + counts; HTML renders both gauges", async () => {
    const { client, tables } = readyDb();
    const detail = await createSprint(
      { db: client, ai: scriptedAi, now: () => NOW },
      BIZ_ID
    );
    const task = detail.tasks.find((t) => t.rubric_key === "category_primary_fix")!;
    await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
      task_id: task.id,
      task_approved: true,
      change_after: "Mental health clinic",
      task_status: "done",
    });
    // a re-audit lands AFTER sprint start with the category fixed
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

    const data = await buildSprintComparison(client, detail.sprint.id);
    const r = data!.report;
    expect(r.final_score).toBe(56); // 41 + category 15
    expect(r.score_delta).toBe(15);
    expect(r.band_after).toBe("amber");
    const catDelta = r.rubric_deltas.find((d) => d.key === "category");
    expect(catDelta).toMatchObject({ before: 0, after: 15, delta: 15, max: 15 });
    expect(r.field_changes).toEqual([
      {
        rubric_key: "category_primary_fix",
        title: "Replace generic primary category",
        group: "profile",
        rubric: "category",
        before: "Hospital",
        after: "Mental health clinic",
      },
    ]);
    expect(r.tasks_done).toBe(1);

    const html = renderSprintReportHtml(data!, "mr");
    expect(html).toContain("▲ 15");
    expect((html.match(/class="score-gauge"/g) ?? []).length).toBe(2);
    expect(html).toContain("सुधारणा अहवाल"); // Marathi default copy
    expect(html).toContain("Content-Security-Policy");
    expect(html).not.toMatch(/<script/i);
    const en = renderSprintReportHtml(data!, "en");
    expect(en).toContain("Improvement Report");
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
      expect(src).not.toMatch(/from\s+["']@\/server\/dataforseo/);
      expect(src).not.toMatch(/from\s+["']@\/server\/spend/);
      expect(src).not.toMatch(/import[^;]*SpendGuard/);
    }
  });

  it("create→approve→done→complete→report runs with fetch POISONED (no network)", async () => {
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
      const task = detail.tasks.find((t) => t.rubric_key === "services")!;
      await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
        task_id: task.id,
        task_approved: true,
        change_after: "Hypnotherapy, NLP therapy",
        task_status: "done",
      });
      await patchSprint({ db: client, now: () => NOW }, detail.sprint.id, {
        complete_sprint: true,
      });
      const data = await buildSprintComparison(client, detail.sprint.id);
      renderSprintReportHtml(data!, "mr");
      expect(networkCalls).toBe(0);
      const readBack = await getSprintDetail({ db: client }, detail.sprint.id);
      expect(readBack?.sprint.status).toBe("complete");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
