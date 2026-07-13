import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditScores,
  Business,
  FixTask,
  OptimizationSprint,
  RubricRow,
} from "@/types";
import { esc, gaugeSvg } from "@/server/pdf/template";
import { bandFor } from "@/types";
import { latestScoredAudit } from "./prereqs";

/**
 * EP-022 — the Before/After Improvement Report (US-021 proof vehicle).
 * "Before" = the LOCKED baseline; "after" = the newest scored audit at/after
 * sprint start (mid-sprint reports fall back to the baseline with a note).
 * Zero vendor calls — everything reads TB-002/003/017/018.
 */

export interface SprintComparison {
  business: Business;
  sprint: OptimizationSprint;
  before: { audit_id: string; total: number; rubric: RubricRow[] };
  after: { audit_id: string; total: number; rubric: RubricRow[] } | null;
  score_delta: number | null;
  rubric_deltas: Array<{
    key: string;
    label: string;
    before: number;
    after: number | null;
    max: number;
    delta: number | null;
  }>;
  field_changes: Array<{ title: string; before: string | null; after: string | null }>;
  work_log: Array<{ title: string; status: string; done_at: string | null }>;
  note: string | null;
}

async function auditWithRubric(
  db: SupabaseClient,
  auditId: string
): Promise<{ total: number; rubric: RubricRow[] } | null> {
  const [{ data: scores }, { data: audit }] = await Promise.all([
    db.from("audit_scores").select().eq("audit_id", auditId).maybeSingle(),
    db.from("audits").select("raw_snapshot").eq("id", auditId).maybeSingle(),
  ]);
  if (!scores) return null;
  const rubric =
    ((audit?.raw_snapshot as { rubric?: RubricRow[] } | null)?.rubric ?? []) as RubricRow[];
  return { total: (scores as AuditScores).total, rubric };
}

export async function buildSprintComparison(
  db: SupabaseClient,
  sprintId: string
): Promise<SprintComparison | null> {
  const { data: sprintRow, error } = await db
    .from("optimization_sprints")
    .select()
    .eq("id", sprintId)
    .maybeSingle();
  if (error) throw new Error(`sprint read failed: ${error.message}`);
  if (!sprintRow) return null;
  const sprint = sprintRow as OptimizationSprint;
  if (!sprint.baseline_audit_id) return null;

  const { data: businessRow } = await db
    .from("businesses")
    .select()
    .eq("id", sprint.business_id)
    .maybeSingle();
  if (!businessRow) return null;

  const before = await auditWithRubric(db, sprint.baseline_audit_id);
  if (!before) return null;

  // After-audit: the locked one (complete) or the newest scored since start.
  let afterId = sprint.after_audit_id;
  if (!afterId) {
    const found = await latestScoredAudit(db, sprint.business_id, {
      sinceIso: sprint.started_at,
      excludeId: sprint.baseline_audit_id,
    });
    afterId = found ? found.id : null;
  }
  const after = afterId ? await auditWithRubric(db, afterId) : null;

  const { data: taskRows } = await db
    .from("fix_tasks")
    .select()
    .eq("sprint_id", sprintId)
    .order("created_at", { ascending: true });
  const tasks = (taskRows ?? []) as FixTask[];

  const afterByKey = new Map((after?.rubric ?? []).map((r) => [r.key, r]));
  const rubric_deltas = before.rubric.map((r) => {
    const a = afterByKey.get(r.key);
    return {
      key: r.key,
      label: r.label,
      before: r.points,
      after: a ? a.points : null,
      max: r.max,
      delta: a ? a.points - r.points : null,
    };
  });

  return {
    business: businessRow as Business,
    sprint,
    before: { audit_id: sprint.baseline_audit_id, total: before.total, rubric: before.rubric },
    after: after && afterId ? { audit_id: afterId, ...after } : null,
    score_delta: after ? after.total - before.total : null,
    rubric_deltas,
    field_changes: tasks
      .filter((t) => t.status === "done" && (t.change_before || t.change_after))
      .map((t) => ({ title: t.title, before: t.change_before, after: t.change_after })),
    work_log: tasks.map((t) => ({ title: t.title, status: t.status, done_at: t.done_at })),
    note: after
      ? null
      : "No re-audit since sprint start — showing baseline only. Re-audit to unlock the delta.",
  };
}

/** Compact before/after HTML (SEC-003 rules apply: esc everything dynamic;
 * same CSP + bundled-font posture as the audit template). */
export function renderSprintReportHtml(c: SprintComparison): string {
  const beforeBand = bandFor(c.before.total);
  const afterBand = c.after ? bandFor(c.after.total) : null;

  const deltaRows = c.rubric_deltas
    .map(
      (d) => `<tr>
        <td>${esc(d.label)}</td>
        <td class="num">${esc(d.before)}/${esc(d.max)}</td>
        <td class="num">${d.after === null ? "—" : `${esc(d.after)}/${esc(d.max)}`}</td>
        <td class="num ${d.delta !== null && d.delta > 0 ? "up" : ""}">${
          d.delta === null ? "—" : d.delta > 0 ? `+${esc(d.delta)}` : esc(d.delta)
        }</td>
      </tr>`
    )
    .join("");

  const changes = c.field_changes
    .map(
      (f) => `<tr><td>${esc(f.title)}</td><td>${esc(f.before ?? "—")}</td><td>${esc(
        f.after ?? "—"
      )}</td></tr>`
    )
    .join("");

  const log = c.work_log
    .map(
      (w) =>
        `<li class="${esc(w.status)}">${esc(w.title)} — ${esc(w.status)}${
          w.done_at ? ` (${esc(w.done_at.slice(0, 10))})` : ""
        }</li>`
    )
    .join("");

  return `<!doctype html>
<html lang="mr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:;">
<title>${esc(c.business.name)} — Before/After</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10px;
         color: #111827; padding: 16px 22px; }
  h1 { font-size: 16px; margin-bottom: 2px; }
  .meta { color: #6b7280; margin-bottom: 8px; }
  .gauges { display: flex; gap: 30px; justify-content: center; margin: 10px 0; }
  .gauges .col { text-align: center; }
  .delta { font-size: 22px; font-weight: 800; color: #16a34a; align-self: center; }
  h2 { font-size: 11px; margin: 10px 0 3px; border-bottom: 1px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 4px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .up { color: #16a34a; font-weight: 700; }
  ul { padding-left: 15px; }
  li.done { color: #16a34a; }
  li.blocked { color: #dc2626; }
  .note { background: #fef3c7; padding: 6px 8px; border-radius: 4px; margin: 6px 0; }
</style>
</head>
<body>
  <h1>${esc(c.business.name)}</h1>
  <div class="meta">Optimization Sprint · ${esc(c.sprint.started_at.slice(0, 10))}${
    c.sprint.completed_at ? ` → ${esc(c.sprint.completed_at.slice(0, 10))}` : " (active)"
  }</div>

  ${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}

  <div class="gauges">
    <div class="col">${gaugeSvg(c.before.total, beforeBand)}<div>Before</div></div>
    ${
      c.after
        ? `<div class="delta">${c.score_delta !== null && c.score_delta >= 0 ? "▲" : "▼"} ${esc(
            Math.abs(c.score_delta ?? 0)
          )}</div>
           <div class="col">${gaugeSvg(c.after.total, afterBand ?? "amber")}<div>After</div></div>`
        : ""
    }
  </div>

  <h2>Rubric deltas</h2>
  <table>${deltaRows}</table>

  ${changes ? `<h2>Field changes (done tasks)</h2><table>${changes}</table>` : ""}

  <h2>Work log</h2>
  <ul>${log}</ul>
</body>
</html>`;
}
