import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditScores,
  Business,
  FieldChange,
  FixTask,
  OptimizationSprint,
  PdfLanguage,
  RubricDelta,
  RubricRow,
  SprintBeforeAfter,
} from "@/types";
import { bandFor, SPRINT_TASK_CATALOG, sprintGroupFor } from "@/types";
import { esc, gaugeSvg } from "@/server/pdf/template";
import { compareScans } from "@/server/grid/engine";
import { latestDoneGrid, latestScoredAudit } from "./prereqs";

/**
 * EP-022 — the Before/After Improvement Report (US-023, constraint #6).
 * "Before" = the LOCKED baseline; "after" = the newest scored audit at/after
 * sprint start. PARTIAL-REPORT semantics (locked contract): no after-audit →
 * final/deltas null/[], report degrades to field_changes + work_log (always
 * populated from the manual change logs — the core deliverable).
 * Zero vendor calls — TB-002/003/004/017/018 reads only.
 */

const SEED_BY_KEY = new Map(SPRINT_TASK_CATALOG.map((s) => [s.rubric_key, s]));

export interface SprintReportData {
  business: Business;
  sprint: OptimizationSprint;
  report: SprintBeforeAfter;
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
): Promise<SprintReportData | null> {
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

  // Grid compare: baseline grid vs after grid, when BOTH exist (DB-only read).
  let grid: SprintBeforeAfter["grid"] = null;
  const afterGridId =
    sprint.after_grid_id ??
    (await latestDoneGrid(db, sprint.business_id, { sinceIso: sprint.started_at }));
  if (sprint.baseline_grid_id && afterGridId && afterGridId !== sprint.baseline_grid_id) {
    try {
      grid = await compareScans(db, sprint.baseline_grid_id, afterGridId);
    } catch {
      grid = null; // grid compare is garnish — never fails the report
    }
  }

  const { data: taskRows } = await db
    .from("fix_tasks")
    .select()
    .eq("sprint_id", sprintId)
    .order("created_at", { ascending: true });
  const tasks = (taskRows ?? []) as FixTask[];

  const afterByKey = new Map((after?.rubric ?? []).map((r) => [r.key, r]));
  const rubric_deltas: RubricDelta[] = after
    ? before.rubric.map((r) => {
        const a = afterByKey.get(r.key);
        return {
          key: r.key,
          label: r.label,
          before: r.points,
          after: a?.points ?? r.points,
          delta: (a?.points ?? r.points) - r.points,
          max: r.max,
        };
      })
    : [];

  const field_changes: FieldChange[] = tasks
    .filter((t) => t.status === "done" && (t.change_before || t.change_after))
    .map((t) => ({
      rubric_key: t.rubric_key,
      title: t.title,
      group: sprintGroupFor(t.rubric_key),
      rubric: SEED_BY_KEY.get(t.rubric_key)?.rubric ?? null,
      before: t.change_before,
      after: t.change_after,
    }));

  const report: SprintBeforeAfter = {
    baseline_score: before.total,
    final_score: after?.total ?? null,
    score_delta: after ? after.total - before.total : null,
    band_before: bandFor(before.total),
    band_after: after ? bandFor(after.total) : null,
    rubric_deltas,
    field_changes,
    grid,
    work_log: tasks.map((t) => ({
      title: t.title,
      status: t.status,
      done_at: t.done_at,
    })),
    tasks_done: tasks.filter((t) => t.status === "done").length,
    tasks_total: tasks.length,
  };

  return { business: businessRow as Business, sprint, report };
}

/** Report copy per language (deterministic strings; US-023 Marathi default). */
const L: Record<
  PdfLanguage,
  { title: string; before: string; after: string; deltas: string; changes: string; log: string; partial: string }
> = {
  mr: {
    title: "सुधारणा अहवाल",
    before: "आधी",
    after: "नंतर",
    deltas: "गुण बदल",
    changes: "बदललेली माहिती",
    log: "कामाची नोंद",
    partial:
      "स्प्रिंट सुरू झाल्यापासून पुन्हा-ऑडिट झालेले नाही — सध्या फक्त बेसलाइन दिसते. फरक पाहण्यासाठी पुन्हा-ऑडिट करा.",
  },
  en: {
    title: "Improvement Report",
    before: "Before",
    after: "After",
    deltas: "Rubric deltas",
    changes: "Field changes",
    log: "Work log",
    partial:
      "No re-audit since sprint start — showing baseline only. Re-audit to unlock the delta.",
  },
  hinglish: {
    title: "Sudharna Report",
    before: "Aadhi",
    after: "Nantar",
    deltas: "Gun Badal",
    changes: "Badleli Mahiti",
    log: "Kamachi Nond",
    partial:
      "Sprint suru zalyapasun re-audit zale nahi — sadhya fakt baseline. Farak pahnyasathi re-audit kara.",
  },
};

/** Compact before/after HTML (SEC-003: esc everything dynamic; same CSP +
 * bundled-font posture as the audit template — Devanagari included). */
export function renderSprintReportHtml(
  data: SprintReportData,
  lang: PdfLanguage = "mr"
): string {
  const { business, sprint, report: r } = data;
  const t = L[lang];

  const deltaRows = r.rubric_deltas
    .map(
      (d) => `<tr>
        <td>${esc(d.label)}</td>
        <td class="num">${esc(d.before)}/${esc(d.max)}</td>
        <td class="num">${esc(d.after)}/${esc(d.max)}</td>
        <td class="num ${d.delta > 0 ? "up" : ""}">${d.delta > 0 ? `+${esc(d.delta)}` : esc(d.delta)}</td>
      </tr>`
    )
    .join("");

  const changes = r.field_changes
    .map(
      (f) => `<tr><td>${esc(f.title)}</td><td>${esc(f.before ?? "—")}</td><td>${esc(
        f.after ?? "—"
      )}</td></tr>`
    )
    .join("");

  const log = r.work_log
    .map(
      (w) =>
        `<li class="${esc(w.status)}">${esc(w.title)} — ${esc(w.status)}${
          w.done_at ? ` (${esc(w.done_at.slice(0, 10))})` : ""
        }</li>`
    )
    .join("");

  return `<!doctype html>
<html lang="${lang === "hinglish" ? "mr-Latn" : lang}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:;">
<title>${esc(business.name)} — ${t.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Noto Sans Devanagari", "Segoe UI", Arial, sans-serif;
         font-size: 10px; color: #111827; padding: 16px 22px; }
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
  .summary { color: #6b7280; margin: 4px 0; }
</style>
</head>
<body>
  <h1>${esc(business.name)} — ${t.title}</h1>
  <div class="meta">${esc(sprint.started_at.slice(0, 10))}${
    sprint.completed_at ? ` → ${esc(sprint.completed_at.slice(0, 10))}` : " (active)"
  } · ${esc(r.tasks_done)}/${esc(r.tasks_total)} ✓</div>

  ${r.final_score === null ? `<div class="note">${t.partial}</div>` : ""}

  <div class="gauges">
    <div class="col">${gaugeSvg(r.baseline_score ?? 0, r.band_before ?? "amber")}<div>${t.before}</div></div>
    ${
      r.final_score !== null
        ? `<div class="delta">${(r.score_delta ?? 0) >= 0 ? "▲" : "▼"} ${esc(
            Math.abs(r.score_delta ?? 0)
          )}</div>
           <div class="col">${gaugeSvg(r.final_score, r.band_after ?? "amber")}<div>${t.after}</div></div>`
        : ""
    }
  </div>

  ${deltaRows ? `<h2>${t.deltas}</h2><table>${deltaRows}</table>` : ""}

  ${changes ? `<h2>${t.changes}</h2><table>${changes}</table>` : ""}

  <h2>${t.log}</h2>
  <ul>${log}</ul>
</body>
</html>`;
}
