import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditScores,
  Business,
  FixTask,
  OptimizationSprint,
  RubricKey,
  RubricRow,
  SprintBaseline,
  SprintDetail,
  SprintGroup,
  SprintPatchRequest,
  SprintTask,
  SprintTaskGroup,
} from "@/types";
import {
  bandFor,
  projectedScore,
  SPRINT_GROUP_LABELS,
  SPRINT_GROUPS,
  SPRINT_TASK_CATALOG,
  sprintGroupFor,
} from "@/types";
import type { AuditInput } from "@/server/audit/input";
import { generate, type AiServiceDeps } from "@/server/ai/service";
import { computePrereqs } from "./prereqs";
import { generateCatalog, isAllowlistedEditorUrl, type CatalogTask } from "./catalog";

/**
 * EP-021 — the Optimization Sprint engine (M6, MANUAL MODE). LOCKED-contract
 * guarantees enforced here (types: src/types/sprint.ts; DB: migration
 * 20260717000001 trigger + one-active index):
 *  #1 zero GBP API writes — "apply" = copy → founder pastes in the editor
 *  #3 baseline immutable after create (no code path writes baseline_*)
 *  #4 approve-before-publish — source='audit' done needs approved=true +
 *     non-empty change_after
 *  #7 zero paid calls — POST/PATCH/report only read existing rows
 */

export class SprintGateError extends Error {
  readonly code = "FORBIDDEN" as const;
  constructor(readonly reasons: string[]) {
    super(`Sprint prerequisites not met: ${reasons.join(" · ")}`);
    this.name = "SprintGateError";
  }
}

export class SprintPatchError extends Error {
  readonly code = "VALIDATION_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "SprintPatchError";
  }
}

export interface SprintDeps {
  db: SupabaseClient;
  /** ai.service seam — injectable completer for tests; undefined = real chain. */
  ai?: Pick<AiServiceDeps, "complete" | "fetchImpl">;
  now?: () => Date;
}

// ---------- low-level reads ----------

async function loadSprint(
  db: SupabaseClient,
  sprintId: string
): Promise<OptimizationSprint | null> {
  const { data, error } = await db
    .from("optimization_sprints")
    .select()
    .eq("id", sprintId)
    .maybeSingle();
  if (error) throw new Error(`sprint read failed: ${error.message}`);
  return (data as OptimizationSprint) ?? null;
}

async function loadTasks(db: SupabaseClient, sprintId: string): Promise<FixTask[]> {
  const { data, error } = await db
    .from("fix_tasks")
    .select()
    .eq("sprint_id", sprintId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`fix_tasks read failed: ${error.message}`);
  return (data ?? []) as FixTask[];
}

async function loadScores(
  db: SupabaseClient,
  auditId: string | null
): Promise<AuditScores | null> {
  if (!auditId) return null;
  const { data, error } = await db
    .from("audit_scores")
    .select()
    .eq("audit_id", auditId)
    .maybeSingle();
  if (error) throw new Error(`audit_scores read failed: ${error.message}`);
  return (data as AuditScores) ?? null;
}

async function loadSnapshot(
  db: SupabaseClient,
  auditId: string
): Promise<{ input?: AuditInput; rubric?: RubricRow[] } | null> {
  const { data, error } = await db
    .from("audits")
    .select("raw_snapshot")
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`audit read failed: ${error.message}`);
  return (data?.raw_snapshot as { input?: AuditInput; rubric?: RubricRow[] }) ?? null;
}

// ---------- enrichment (all fields COMPUTED, none persisted) ----------

const SEED_BY_KEY = new Map(SPRINT_TASK_CATALOG.map((s) => [s.rubric_key, s]));

/** Integer rubric_points per task: each rubric row's baseline gap split across
 * the sprint's tasks on that row (floor + remainder to the earliest tasks);
 * per-row sum === gap ≤ RUBRIC_MAX − baseline (contract invariant). */
export function rubricPointsFor(
  tasks: FixTask[],
  baselineRubric: RubricRow[]
): Map<string, number> {
  const gapByRow = new Map<RubricKey, number>(
    baselineRubric.map((r) => [r.key, Math.max(0, r.max - r.points)])
  );
  const rowTasks = new Map<RubricKey, FixTask[]>();
  for (const task of tasks) {
    const rubric = SEED_BY_KEY.get(task.rubric_key)?.rubric ?? null;
    if (!rubric) continue;
    const list = rowTasks.get(rubric) ?? [];
    list.push(task);
    rowTasks.set(rubric, list);
  }
  const points = new Map<string, number>();
  rowTasks.forEach((list, rubric) => {
    const gap = gapByRow.get(rubric) ?? 0;
    const base = Math.floor(gap / list.length);
    let remainder = gap - base * list.length;
    for (const task of list) {
      points.set(task.id, base + (remainder > 0 ? 1 : 0));
      if (remainder > 0) remainder--;
    }
  });
  return points;
}

function enrichTasks(
  tasks: FixTask[],
  baselineRubric: RubricRow[],
  catalog: CatalogTask[] | null
): SprintTask[] {
  const catalogByKey = new Map((catalog ?? []).map((c) => [c.seed.rubric_key, c]));
  const points = rubricPointsFor(tasks, baselineRubric);
  return tasks.map((task): SprintTask => {
    const seed = SEED_BY_KEY.get(task.rubric_key) ?? null;
    const cat = catalogByKey.get(task.rubric_key) ?? null;
    const editorUrl = cat?.editor_url ?? null;
    return {
      ...task,
      group: sprintGroupFor(task.rubric_key),
      rubric: seed?.rubric ?? null,
      current_value: cat?.current_value ?? null,
      editor_url: isAllowlistedEditorUrl(editorUrl) ? editorUrl : null,
      editor_hint: cat?.editor_hint ?? null,
      estimate_minutes: seed?.estimate_minutes ?? null,
      rubric_points: points.get(task.id) ?? 0,
    };
  });
}

function groupTasks(tasks: SprintTask[]): SprintTaskGroup[] {
  return SPRINT_GROUPS.map((group): SprintTaskGroup => {
    const groupTasks = tasks.filter((t) => t.group === group);
    return {
      group,
      label: SPRINT_GROUP_LABELS[group],
      tasks: groupTasks,
      done_count: groupTasks.filter((t) => t.status === "done").length,
      total_count: groupTasks.length,
      remaining_minutes: groupTasks
        .filter((t) => t.status !== "done")
        .reduce((sum, t) => sum + (t.estimate_minutes ?? 0), 0),
    };
  }).filter((g) => g.total_count > 0);
}

// ---------- detail assembly (EP-021 read) ----------

export async function getSprintDetail(
  deps: SprintDeps,
  sprintId: string
): Promise<SprintDetail | null> {
  const { db } = deps;
  const sprint = await loadSprint(db, sprintId);
  if (!sprint) return null;

  const [tasks, baselineScores, snapshot, gate] = await Promise.all([
    loadTasks(db, sprintId),
    loadScores(db, sprint.baseline_audit_id),
    loadSnapshot(db, sprint.baseline_audit_id),
    computePrereqs(db, sprint.business_id, deps.now ? deps.now() : new Date()),
  ]);

  let catalog: CatalogTask[] | null = null;
  if (snapshot?.input && gate.business) {
    catalog = generateCatalog(gate.business, snapshot.input);
  }
  const enriched = enrichTasks(tasks, snapshot?.rubric ?? [], catalog);

  const baseline: SprintBaseline = {
    audit_id: sprint.baseline_audit_id,
    grid_id: sprint.baseline_grid_id,
    score: baselineScores?.total ?? null,
    band: baselineScores ? bandFor(baselineScores.total) : null,
    captured_at: sprint.started_at,
    locked: Boolean(sprint.baseline_audit_id),
  };

  return {
    sprint,
    baseline,
    groups: groupTasks(enriched),
    tasks: enriched,
    baseline_score: baseline.score,
    current_projected_score: projectedScore(baseline.score, enriched),
    prereqs: gate.prereqs,
  };
}

/** GET /api/sprint?businessId= — the ACTIVE sprint or null (page-mount read). */
export async function getActiveSprintDetail(
  deps: SprintDeps,
  businessId: string
): Promise<SprintDetail | null> {
  const { data, error } = await deps.db
    .from("optimization_sprints")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "active");
  if (error) throw new Error(`sprint lookup failed: ${error.message}`);
  const id = (data ?? [])[0]?.id as string | undefined;
  return id ? getSprintDetail(deps, id) : null;
}

// ---------- create (EP-021 POST) ----------

export async function createSprint(
  deps: SprintDeps,
  businessId: string
): Promise<SprintDetail> {
  const { db } = deps;
  const now = deps.now ? deps.now() : new Date();

  // Server-side US-024 gate — includes the ⑤ no_active_sprint check.
  const gate = await computePrereqs(db, businessId, now);
  if (!gate.prereqs.eligible) throw new SprintGateError(gate.failures);

  // ---- LOCK the baseline (immutable from here on; DB trigger backs this) ----
  const { data: sprintRow, error: insErr } = await db
    .from("optimization_sprints")
    .insert({
      business_id: businessId,
      started_at: now.toISOString(),
      baseline_audit_id: gate.prereqs.fresh_audit_id,
      baseline_grid_id: gate.prereqs.latest_grid_id,
      status: "active",
    })
    .select()
    .single();
  if (insErr) throw new Error(`sprint insert failed: ${insErr.message}`);
  const sprint = sprintRow as OptimizationSprint;

  // ---- instantiate the locked 23-task catalog against the baseline ----
  const snapshot = await loadSnapshot(db, sprint.baseline_audit_id);
  if (!snapshot?.input) {
    throw new Error("baseline audit has no normalized snapshot — re-run the audit");
  }
  const catalog = generateCatalog(gate.business as Business, snapshot.input);

  // AI prefills → suggested_value + ai_output_id (draft-only, approved=false
  // in ai_outputs AND on the task). Best-effort: a dead free model never
  // blocks sprint creation.
  const aiDrafts = new Map<string, { text: string; output_id: string }>();
  for (const task of catalog) {
    if (!task.ai_prefill) continue;
    try {
      const req =
        task.ai_prefill === "description"
          ? ({
              tool: "description",
              business_id: businessId,
              lang: "mr",
              tone: "professional",
              current_description: snapshot.input.profile.description,
              include_keywords: [
                snapshot.input.profile.categories.primary ?? "",
                gate.business?.city ?? "",
              ].filter(Boolean),
            } as const)
          : ({
              tool: "post",
              business_id: businessId,
              lang: "mr",
              tone: "warm",
              topic: "monthly update — services and how to book",
              cta: "call_now",
            } as const);
      const draft = await generate(
        { db, complete: deps.ai?.complete, fetchImpl: deps.ai?.fetchImpl },
        req
      );
      aiDrafts.set(task.seed.rubric_key, {
        text: draft.output,
        output_id: draft.output_id,
      });
    } catch {
      // deterministic suggestion (or none) stands — founder writes their own
    }
  }

  const rows = catalog.map((t) => {
    const ai = aiDrafts.get(t.seed.rubric_key);
    return {
      sprint_id: sprint.id,
      rubric_key: t.seed.rubric_key,
      title: t.seed.title,
      status: "todo",
      source: "audit",
      approved: false, // approve-before-publish (#4)
      suggested_value: ai?.text ?? t.suggested_value,
      copy_text: t.copy_text,
      ai_output_id: ai?.output_id ?? null,
      note: t.note,
      change_before: t.current_value,
      change_after: null,
    };
  });
  const { error: tasksErr } = await db.from("fix_tasks").insert(rows);
  if (tasksErr) throw new Error(`fix_tasks insert failed: ${tasksErr.message}`);

  const detail = await getSprintDetail(deps, sprint.id);
  if (!detail) throw new Error("sprint vanished after create");
  return detail;
}

// ---------- patch (EP-021 PATCH) ----------

const PATCHABLE_TASK_STATUS = new Set(["todo", "doing", "done", "blocked"]);
/** Baseline/after fields are locked (#3/#7) — any attempt is rejected loudly. */
const FORBIDDEN_PATCH_KEYS = [
  "baseline_audit_id",
  "baseline_grid_id",
  "after_audit_id",
  "after_grid_id",
  "started_at",
  "business_id",
  "status",
  "completed_at",
];
/** The strict SprintPatchRequest shape — unknown keys → VALIDATION_ERROR. */
export const ALLOWED_PATCH_KEYS = [
  "task_id",
  "task_status",
  "task_approved",
  "task_note",
  "change_before",
  "change_after",
  "add_custom_task",
  "complete_sprint",
] as const;

export function assertStrictPatchShape(rawBody: Record<string, unknown>): void {
  const locked = FORBIDDEN_PATCH_KEYS.filter((k) => k in rawBody);
  if (locked.length > 0) {
    throw new SprintPatchError(
      `baseline is locked — ${locked.join(", ")} cannot be changed after sprint start`
    );
  }
  const unknown = Object.keys(rawBody).filter(
    (k) => !(ALLOWED_PATCH_KEYS as readonly string[]).includes(k)
  );
  if (unknown.length > 0) {
    throw new SprintPatchError(
      `unknown key${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")} — the PATCH shape is strict`
    );
  }
}

/** Synthesize a rubric_key whose sprintGroupFor() lands in the picked group. */
export function customKeyFor(group: SprintGroup, nonce: string): string {
  switch (group) {
    case "website":
      return `website_custom_${nonce}`;
    case "citations":
      return `citation_custom_${nonce}`;
    case "reviews":
      return `review_custom_${nonce}`;
    case "posts":
      return `posts_custom_${nonce}`;
    case "visibility":
      return `weak_zone_custom_${nonce}`;
    default:
      return `custom_${nonce}`;
  }
}

export async function patchSprint(
  deps: SprintDeps,
  sprintId: string,
  req: SprintPatchRequest
): Promise<SprintDetail> {
  const { db } = deps;
  const now = deps.now ? deps.now() : new Date();

  const sprint = await loadSprint(db, sprintId);
  if (!sprint) throw new Error("NOT_FOUND");
  if (sprint.status === "complete") {
    throw new SprintPatchError("sprint is complete — no further changes");
  }

  let acted = false;

  if (req.task_id) {
    const { data: taskRow, error: tErr } = await db
      .from("fix_tasks")
      .select()
      .eq("id", req.task_id)
      .eq("sprint_id", sprintId) // never cross-sprint
      .maybeSingle();
    if (tErr) throw new Error(`task read failed: ${tErr.message}`);
    if (!taskRow) throw new Error("NOT_FOUND");
    const task = taskRow as FixTask;

    const patch: Record<string, unknown> = {};
    if (req.task_approved !== undefined) patch.approved = req.task_approved;
    if (req.task_note !== undefined) patch.note = req.task_note;
    if (req.change_before !== undefined) patch.change_before = req.change_before;
    if (req.change_after !== undefined) patch.change_after = req.change_after;
    if (req.task_status !== undefined) {
      if (!PATCHABLE_TASK_STATUS.has(req.task_status)) {
        throw new SprintPatchError("task_status must be todo|doing|done|blocked");
      }
      if (req.task_status === "done" && task.source === "audit") {
        // #4: in manual mode, copy→paste IS the publish step.
        const approved = req.task_approved ?? task.approved;
        const changeAfter = req.change_after ?? task.change_after;
        if (!approved) {
          throw new SprintPatchError(
            "approve the suggestion first — audit tasks need approved=true before 'done'"
          );
        }
        if (!changeAfter || changeAfter.trim() === "") {
          throw new SprintPatchError(
            "record change_after (the value you actually applied) before marking done"
          );
        }
      }
      patch.status = req.task_status;
      patch.done_at = req.task_status === "done" ? now.toISOString() : null;
    }
    if (Object.keys(patch).length === 0) {
      throw new SprintPatchError("task_id given but nothing to change");
    }
    const { error } = await db
      .from("fix_tasks")
      .update(patch)
      .eq("id", req.task_id)
      .eq("sprint_id", sprintId);
    if (error) throw new Error(`task update failed: ${error.message}`);
    acted = true;
  }

  if (req.add_custom_task) {
    const { title, group } = req.add_custom_task;
    if (!title?.trim() || title.length > 120) {
      throw new SprintPatchError("custom task needs a title (≤120 chars)");
    }
    if (!SPRINT_GROUPS.includes(group)) {
      throw new SprintPatchError(
        `group must be one of: ${SPRINT_GROUPS.join(", ")}`
      );
    }
    const nonce = now.getTime().toString(36);
    const { error } = await db.from("fix_tasks").insert({
      sprint_id: sprintId,
      rubric_key: customKeyFor(group, nonce),
      title: title.trim(),
      status: "todo",
      source: "manual", // client can never mint source='audit'
      approved: true, // founder authored it — no approval step (#4)
      suggested_value: null,
      copy_text: null,
      ai_output_id: null,
    });
    if (error) throw new Error(`custom task insert failed: ${error.message}`);
    acted = true;
  }

  if (req.complete_sprint) {
    // Link after_* from ALREADY-EXISTING rows only (#7) — never EP-001/grid.
    const { latestScoredAudit, latestDoneGrid } = await import("./prereqs");
    const [after, afterGrid] = await Promise.all([
      latestScoredAudit(db, sprint.business_id, { sinceIso: sprint.started_at }),
      latestDoneGrid(db, sprint.business_id, { sinceIso: sprint.started_at }),
    ]);
    const { error } = await db
      .from("optimization_sprints")
      .update({
        status: "complete",
        completed_at: now.toISOString(),
        after_audit_id: after ? after.id : null,
        after_grid_id: afterGrid,
      })
      .eq("id", sprintId);
    if (error) throw new Error(`sprint complete failed: ${error.message}`);
    acted = true;
  }

  if (!acted) {
    throw new SprintPatchError(
      "empty patch — provide task_id changes, add_custom_task, or complete_sprint"
    );
  }

  const detail = await getSprintDetail(deps, sprintId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}
