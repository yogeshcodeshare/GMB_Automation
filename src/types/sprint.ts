/** TB-017/018 + P12 Optimization Sprint (US-021..025). */

export type SprintStatus = "active" | "complete";
export type FixTaskStatus = "todo" | "doing" | "done" | "blocked";
export type FixTaskSource = "audit" | "manual";

export interface OptimizationSprint {
  id: string;
  business_id: string;
  started_at: string;
  baseline_audit_id: string | null;
  baseline_grid_id: string | null;
  after_audit_id: string | null;
  after_grid_id: string | null;
  status: SprintStatus;
  completed_at: string | null;
}

export interface FixTask {
  id: string;
  sprint_id: string;
  rubric_key: string;
  title: string;
  status: FixTaskStatus;
  source: FixTaskSource;
  done_at: string | null;
  note: string | null;
  change_before: string | null;
  change_after: string | null;
  created_at: string;
}

/** P12 checklist groups — derived from rubric_key, not a DB column. */
export type SprintGroup =
  | "profile"
  | "reviews"
  | "posts"
  | "website"
  | "visibility"
  | "citations";

export function sprintGroupFor(rubricKey: string): SprintGroup {
  if (rubricKey.startsWith("website_")) return "website";
  if (rubricKey.startsWith("citation_")) return "citations";
  if (rubricKey.startsWith("review_") || rubricKey === "reply_backlog")
    return "reviews";
  if (rubricKey.startsWith("posts_")) return "posts";
  if (rubricKey === "weak_zone") return "visibility";
  return "profile";
}

/** US-024 prerequisites gate — all four must pass to start a sprint. */
export interface SprintPrereqs {
  is_client_with_plan: boolean;
  owner_contact_saved: boolean;
  connection_ready: boolean; // oauth OR manager confirmed
  fresh_audit: boolean; // ≤7 days
  fresh_audit_age_days: number | null;
}

export interface SprintDetail {
  sprint: OptimizationSprint;
  tasks: FixTask[];
  baseline_score: number | null;
  current_projected_score: number | null; // score simulator
}

/** EP-021 requests. */
export interface SprintStartRequest {
  business_id: string;
}
export interface SprintPatchRequest {
  task_id?: string;
  task_status?: FixTaskStatus;
  task_note?: string;
  change_after?: string;
  add_custom_task?: { title: string; rubric_key: string };
  complete_sprint?: boolean;
}
