import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditScores,
  Business,
  FixTask,
  OptimizationSprint,
  RubricKey,
  RubricRow,
  SprintDetail,
  SprintPatchRequest,
} from "@/types";
import type { AuditInput } from "@/server/audit/input";
import { generate, type AiServiceDeps } from "@/server/ai/service";
import { computePrereqs, latestScoredAudit } from "./prereqs";
import { generateCatalog, type CatalogTask } from "./catalog";

/**
 * EP-021 — the Optimization Sprint engine (M6, MANUAL MODE — zero GBP API
 * writes, zero DataForSEO calls; everything here is DB + optional AI drafts).
 * The baseline locks at creation (TB-017) and is IMMUTABLE thereafter — no
 * code path in this module ever updates baseline_audit_id / baseline_grid_id.
 */

export class SprintGateError extends Error {
  readonly code = "VALIDATION_ERROR" as const;
  constructor(readonly reasons: string[]) {
    super(`Sprint prerequisites not met: ${reasons.join(" · ")}`);
    this.name = "SprintGateError";
  }
}

export interface SprintDeps {
  db: SupabaseClient;
  /** ai.service seam — injectable completer for tests; undefined = real chain. */
  ai?: Pick<AiServiceDeps, "complete" | "fetchImpl">;
  now?: () => Date;
}

/** Additive response payload (HANDOFF-noted): per-task manual-mode data. */
export type ManualLinks = Record<
  string,
  { copy_value: string | null; google_editor_url: string }
>;

export type SprintDetailWithManual = SprintDetail & { manual_links: ManualLinks };

// ---------- reads ----------

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

// ---------- projected-score simulator ----------

/** task rubric_key → the §2.5 rubric row it improves (null = no direct row). */
const TASK_ROW: Record<string, RubricKey | null> = {
  primary_category: "category",
  phone: "completeness",
  hours: "completeness",
  services: "completeness",
  description: "completeness",
  photos: "photos",
  logo_cover: "photos",
  opening_date: "completeness",
  social_links: "completeness",
  utm_website: "website",
  reply_backlog: "reply_rate",
  review_machine: "reviews_count",
  review_velocity: "reviews_velocity",
  posts_cadence: "posts",
  website_title: "website",
  website_meta: "website",
  website_category_page: "website",
  website_headings: "website",
  website_spelling: "website",
  weak_zone: null,
  citation_justdial: "nap",
  citation_indiamart: "nap",
  citation_sulekha: "nap",
};

/** Deterministic simulator: each rubric row's LOST baseline points are split
 * evenly across the row's open tasks; done tasks contribute their share. */
export function projectedScore(
  baselineRubric: RubricRow[],
  baselineTotal: number,
  tasks: FixTask[]
): number {
  const lostByRow = new Map<RubricKey, number>();
  for (const row of baselineRubric) lostByRow.set(row.key, row.max - row.points);

  const tasksByRow = new Map<RubricKey, FixTask[]>();
  for (const task of tasks) {
    const row = TASK_ROW[task.rubric_key] ?? null;
    if (!row) continue;
    const list = tasksByRow.get(row) ?? [];
    list.push(task);
    tasksByRow.set(row, list);
  }

  let gain = 0;
  tasksByRow.forEach((rowTasks, rowKey) => {
    const lost = lostByRow.get(rowKey) ?? 0;
    if (lost <= 0) return;
    const share = lost / rowTasks.length;
    gain += rowTasks.filter((t) => t.status === "done").length * share;
  });

  return Math.min(100, Math.round(baselineTotal + gain));
}

// ---------- detail assembly ----------

export async function getSprintDetail(
  deps: SprintDeps,
  sprintId: string
): Promise<SprintDetailWithManual | null> {
  const { db } = deps;
  const sprint = await loadSprint(db, sprintId);
  if (!sprint) return null;
  const tasks = await loadTasks(db, sprintId);
  const baselineScores = await loadScores(db, sprint.baseline_audit_id);
  const snapshot = sprint.baseline_audit_id
    ? await loadSnapshot(db, sprint.baseline_audit_id)
    : null;

  const projected =
    baselineScores && snapshot?.rubric
      ? projectedScore(snapshot.rubric, baselineScores.total, tasks)
      : null;

  // Manual-mode payloads derive deterministically from the LOCKED baseline —
  // stable across reads, no extra storage (additive field, HANDOFF-noted).
  let manual_links: ManualLinks = {};
  if (snapshot?.input) {
    const { data: businessRow } = await db
      .from("businesses")
      .select()
      .eq("id", sprint.business_id)
      .maybeSingle();
    if (businessRow) {
      const catalog = generateCatalog(businessRow as Business, snapshot.input);
      const byKey = new Map(catalog.map((c) => [c.rubric_key, c.manual]));
      manual_links = Object.fromEntries(
        tasks
          .map((t) => [t.id, byKey.get(t.rubric_key)] as const)
          .filter((pair): pair is [string, CatalogTask["manual"]] => Boolean(pair[1]))
          .map(([id, manual]) => [id, manual])
      );
    }
  }

  return {
    sprint,
    tasks,
    baseline_score: baselineScores?.total ?? null,
    current_projected_score: projected,
    manual_links,
  };
}

// ---------- create (EP-021 POST) ----------

export async function createSprint(
  deps: SprintDeps,
  businessId: string
): Promise<SprintDetailWithManual> {
  const { db } = deps;
  const now = deps.now ? deps.now() : new Date();

  const gate = await computePrereqs(db, businessId, now);
  if (gate.failures.length > 0) throw new SprintGateError(gate.failures);

  // One ACTIVE sprint per business.
  const { data: activeRows, error: activeErr } = await db
    .from("optimization_sprints")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "active");
  if (activeErr) throw new Error(`sprint lookup failed: ${activeErr.message}`);
  if ((activeRows ?? []).length > 0) {
    throw new SprintGateError([
      "an active sprint already exists for this business — complete it first",
    ]);
  }

  // Baseline grid: newest finished scan, if any (optional).
  const { data: gridRows } = await db
    .from("grid_scans")
    .select("id, status, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(5);
  const baselineGrid = (gridRows ?? []).find((g) => g.status === "done");

  // ---- LOCK the baseline (immutable from here on) ----
  const { data: sprintRow, error: insErr } = await db
    .from("optimization_sprints")
    .insert({
      business_id: businessId,
      started_at: now.toISOString(),
      baseline_audit_id: gate.latest_audit_id,
      baseline_grid_id: baselineGrid ? baselineGrid.id : null,
      status: "active",
    })
    .select()
    .single();
  if (insErr) throw new Error(`sprint insert failed: ${insErr.message}`);
  const sprint = sprintRow as OptimizationSprint;

  // ---- generate + persist the task catalog ----
  const snapshot = await loadSnapshot(db, gate.latest_audit_id as string);
  if (!snapshot?.input) {
    throw new Error("baseline audit has no normalized snapshot — re-run the audit");
  }
  const catalog = generateCatalog(gate.business as Business, snapshot.input);

  // AI prefills (draft-only, approved=false in ai_outputs) — best-effort:
  // the sprint NEVER fails because a free model was unavailable.
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
      task.change_after = draft.output;
    } catch {
      // leave the deterministic prefill (or null) — founder writes their own
    }
  }

  const rows = catalog.map((t) => ({
    sprint_id: sprint.id,
    rubric_key: t.rubric_key,
    title: t.title,
    status: "todo",
    source: "audit",
    note: t.note,
    change_before: t.change_before,
    change_after: t.change_after,
  }));
  const { error: tasksErr } = await db.from("fix_tasks").insert(rows);
  if (tasksErr) throw new Error(`fix_tasks insert failed: ${tasksErr.message}`);

  const detail = await getSprintDetail(deps, sprint.id);
  if (!detail) throw new Error("sprint vanished after create");
  return detail;
}

// ---------- patch (EP-021 PATCH) ----------

const PATCHABLE_TASK_STATUS = new Set(["todo", "doing", "done", "blocked"]);
/** Baseline fields are IMMUTABLE — any attempt is rejected loudly. */
const FORBIDDEN_PATCH_KEYS = [
  "baseline_audit_id",
  "baseline_grid_id",
  "started_at",
  "business_id",
];

export function assertNoBaselineTamper(rawBody: Record<string, unknown>): void {
  const hit = FORBIDDEN_PATCH_KEYS.filter((k) => k in rawBody);
  if (hit.length > 0) {
    throw new SprintGateError([
      `baseline is locked — ${hit.join(", ")} cannot be changed after sprint start`,
    ]);
  }
}

export async function patchSprint(
  deps: SprintDeps,
  sprintId: string,
  req: SprintPatchRequest
): Promise<SprintDetailWithManual> {
  const { db } = deps;
  const now = deps.now ? deps.now() : new Date();

  const sprint = await loadSprint(db, sprintId);
  if (!sprint) throw new Error("NOT_FOUND");
  if (sprint.status === "complete" && !req.task_id && !req.add_custom_task) {
    throw new SprintGateError(["sprint is complete — no further changes"]);
  }

  let acted = false;

  if (req.task_id) {
    const patch: Record<string, unknown> = {};
    if (req.task_status !== undefined) {
      if (!PATCHABLE_TASK_STATUS.has(req.task_status)) {
        throw new SprintGateError([`task_status must be todo|doing|done|blocked`]);
      }
      patch.status = req.task_status;
      patch.done_at = req.task_status === "done" ? now.toISOString() : null;
    }
    if (req.task_note !== undefined) patch.note = req.task_note;
    if (req.change_after !== undefined) patch.change_after = req.change_after;
    if (Object.keys(patch).length === 0) {
      throw new SprintGateError(["task_id given but nothing to change"]);
    }
    const { data: updated, error } = await db
      .from("fix_tasks")
      .update(patch)
      .eq("id", req.task_id)
      .eq("sprint_id", sprintId) // never cross-sprint
      .select()
      .maybeSingle();
    if (error) throw new Error(`task update failed: ${error.message}`);
    if (!updated) throw new Error("NOT_FOUND");
    acted = true;
  }

  if (req.add_custom_task) {
    const { title, rubric_key } = req.add_custom_task;
    if (!title?.trim() || title.length > 120 || !rubric_key?.trim() || rubric_key.length > 40) {
      throw new SprintGateError(["custom task needs a title (≤120) and rubric_key (≤40)"]);
    }
    const { error } = await db.from("fix_tasks").insert({
      sprint_id: sprintId,
      rubric_key: rubric_key.trim(),
      title: title.trim(),
      status: "todo",
      source: "manual",
    });
    if (error) throw new Error(`custom task insert failed: ${error.message}`);
    acted = true;
  }

  if (req.complete_sprint) {
    if (sprint.status === "complete") {
      throw new SprintGateError(["sprint is already complete"]);
    }
    // Lock the after-state: newest SCORED audit at/after sprint start.
    const after = await latestScoredAudit(db, sprint.business_id, {
      sinceIso: sprint.started_at,
    });
    const { data: gridRows } = await db
      .from("grid_scans")
      .select("id, status, created_at")
      .eq("business_id", sprint.business_id)
      .order("created_at", { ascending: false })
      .limit(5);
    const afterGrid = (gridRows ?? []).find(
      (g) =>
        g.status === "done" &&
        Date.parse(g.created_at as string) >= Date.parse(sprint.started_at)
    );
    const { error } = await db
      .from("optimization_sprints")
      .update({
        status: "complete",
        completed_at: now.toISOString(),
        after_audit_id: after ? after.id : null,
        after_grid_id: afterGrid ? afterGrid.id : null,
      })
      .eq("id", sprintId);
    if (error) throw new Error(`sprint complete failed: ${error.message}`);
    acted = true;
  }

  if (!acted) {
    throw new SprintGateError([
      "empty patch — provide task_id changes, add_custom_task, or complete_sprint",
    ]);
  }

  const detail = await getSprintDetail(deps, sprintId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}
