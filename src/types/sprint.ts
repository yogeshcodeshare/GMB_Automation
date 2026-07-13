/**
 * TB-017/018 + P12 Optimization Sprint (US-021..025), MANUAL mode (ADR-010).
 *
 * LOCKED Day-6 contract (MAIN-arbitrated from a research→design→adversarial-critique
 * pass). The hard guarantees below are enforced SERVER-SIDE + at the DB layer, not by
 * these types alone — the types just make them expressible:
 *   #1 Manual mode: ZERO GBP API writes anywhere in the sprint flow. "Apply a fix" =
 *      copy suggested_value → open the Google editor deep-link → edit by hand.
 *   #3 Baseline (TB-017) is captured at create and IMMUTABLE (DB trigger, migration
 *      20260717000001) — no PATCH/service-role write can change baseline_* once set,
 *      and no field of a status='complete' sprint can change.
 *   #4 Approve-before-publish: AI-prefilled tasks persist approved=false. For a
 *      source='audit' task the copy control + open-editor + the 'done' transition are
 *      GATED on approved=true (in manual mode, copy→paste IS the publish step).
 *   #7 No paid calls: POST/PATCH/report read existing TB-002/003/004 rows only; they
 *      NEVER trigger EP-001 or a grid scan. Re-audit is a separate spend-guarded call.
 */

import type { PdfLanguage } from "./api";
import type { RubricKey, ScoreBand } from "./audit";
import type { GridCompare } from "./grid";

/* ------------------------------------------------------------------ *
 * Enums — every union equals its DB CHECK constraint verbatim.
 * ------------------------------------------------------------------ */

/** optimization_sprints.status CHECK in ('active','complete'). */
export type SprintStatus = "active" | "complete";

/** fix_tasks.status CHECK in ('todo','doing','done','blocked').
 *  No separate 'skipped' value — a skipped task is `blocked` with a note. */
export type FixTaskStatus = "todo" | "doing" | "done" | "blocked";

/** fix_tasks.source CHECK in ('audit','manual'). */
export type FixTaskSource = "audit" | "manual";

/* ------------------------------------------------------------------ *
 * TB-017 optimization_sprints (DB-backed row).
 * ------------------------------------------------------------------ */

export interface OptimizationSprint {
  id: string;
  business_id: string;
  started_at: string;
  /** Captured at create, NOT NULL, IMMUTABLE thereafter (constraint #3, DB trigger). */
  baseline_audit_id: string;
  /** Latest grid at create; may be null when the business has no grid scan. Immutable once set. */
  baseline_grid_id: string | null;
  /** After-state FKs linked only at completion, from ALREADY-EXISTING scans (constraint #7). */
  after_audit_id: string | null;
  after_grid_id: string | null;
  status: SprintStatus;
  completed_at: string | null;
}

/* ------------------------------------------------------------------ *
 * TB-018 fix_tasks (DB-backed row).
 * Migration 20260717000001 adds: approved, suggested_value, copy_text, ai_output_id.
 * (US-022 per-task `notify` is DEFERRED to Week-2 — no delivery path in a manual,
 * wa-flag-off sprint, so it is intentionally NOT in this contract.)
 * ------------------------------------------------------------------ */

export interface FixTask {
  id: string;
  sprint_id: string;
  rubric_key: string;
  title: string;
  status: FixTaskStatus;
  source: FixTaskSource;
  /** Approve-before-publish (#4). source='audit' tasks persist approved=false and
   *  cannot be copied/opened-in-editor/marked-done until the founder taps approve.
   *  source='manual' tasks need no approval (founder authored them). */
  approved: boolean;
  /** The AI-prefilled value the founder reviews then copies ("approve, don't compose",
   *  US-022). The MACHINE suggestion — NOT the value actually applied. */
  suggested_value: string | null;
  /** Longer copy blob when a one-liner won't do (e.g. the "copy brief for vendor" text
   *  on website tasks, P12). Copy precedence in the UI: copy_text ?? suggested_value. */
  copy_text: string | null;
  /** FK to the ai_outputs('fixes') row that generated the suggestion — the
   *  approve-before-publish trail. null for manual tasks / non-AI tasks. */
  ai_output_id: string | null;
  /** Manual-mode change log (#1): the value BEFORE and AFTER the founder edited it by
   *  hand in the Google editor. Feeds the EP-022 field-level change list. `change_after`
   *  is REQUIRED to move a source='audit' task to 'done'. NOT the AI suggestion. */
  change_before: string | null;
  change_after: string | null;
  note: string | null;
  done_at: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ *
 * Task grouping — derived from rubric_key, never a stored column.
 * ------------------------------------------------------------------ */

export type SprintGroup =
  | "profile"
  | "reviews"
  | "posts"
  | "website"
  | "visibility"
  | "citations";

/** Canonical ordering for the P12 checklist UI (constraint #5). */
export const SPRINT_GROUPS: readonly SprintGroup[] = [
  "profile",
  "reviews",
  "posts",
  "website",
  "visibility",
  "citations",
] as const;

export const SPRINT_GROUP_LABELS: Record<SprintGroup, string> = {
  profile: "Profile",
  reviews: "Reviews",
  posts: "Posts",
  website: "Website",
  visibility: "Visibility",
  citations: "Citations",
};

/**
 * Deterministic group for a rubric_key. Covers the full P12 seed catalog plus any
 * custom-task key; unknown keys fall through to "profile" so a custom task always
 * lands in a real group.
 */
export function sprintGroupFor(rubricKey: string): SprintGroup {
  if (rubricKey.startsWith("website_")) return "website";
  if (rubricKey.startsWith("citation_") || rubricKey === "nap") return "citations";
  if (rubricKey.startsWith("review_") || rubricKey === "reply_backlog") return "reviews";
  if (rubricKey.startsWith("posts")) return "posts";
  if (rubricKey.startsWith("weak_zone")) return "visibility";
  // categories, services, hours, attributes/UPI, products, booking link, logo/cover,
  // opening date, social links, service area, UTM link, phone, description → Profile.
  return "profile";
}

/* ------------------------------------------------------------------ *
 * Seed catalog — pins the ~23-task rubric_key vocabulary so grouping, the AI prefill,
 * and the projected-score math are deterministic across backend runs. Each entry maps
 * to the audit RubricKey it recovers points against (null = it moves the grid, not the
 * 100-pt rubric, e.g. weak_zone → visibility). Titles are English defaults; the AI
 * layer localizes/redrafts per business.
 * ------------------------------------------------------------------ */

export interface SprintTaskSeed {
  rubric_key: string;
  title: string;
  /** Must equal sprintGroupFor(rubric_key). */
  group: SprintGroup;
  /** The audit rubric row this task recovers points against; null when it doesn't
   *  move the scored rubric (visibility/grid tasks). */
  rubric: RubricKey | null;
  estimate_minutes: number;
}

export const SPRINT_TASK_CATALOG: readonly SprintTaskSeed[] = [
  // Profile
  { rubric_key: "primary_phone", title: "Add primary phone number", group: "profile", rubric: "completeness", estimate_minutes: 3 },
  { rubric_key: "category_primary_fix", title: "Replace generic primary category", group: "profile", rubric: "category", estimate_minutes: 5 },
  { rubric_key: "category_secondary", title: "Add secondary categories", group: "profile", rubric: "category", estimate_minutes: 5 },
  { rubric_key: "services", title: "Add services / service items", group: "profile", rubric: "completeness", estimate_minutes: 15 },
  { rubric_key: "hours_fix", title: "Fix opening-hours anomaly", group: "profile", rubric: "completeness", estimate_minutes: 3 },
  { rubric_key: "attributes_upi", title: "Set attributes + UPI payment", group: "profile", rubric: "completeness", estimate_minutes: 5 },
  { rubric_key: "products", title: "Add Products", group: "profile", rubric: "completeness", estimate_minutes: 20 },
  { rubric_key: "booking_link", title: "Add booking link", group: "profile", rubric: "completeness", estimate_minutes: 3 },
  { rubric_key: "logo_cover", title: "Upload logo + cover photo", group: "profile", rubric: "photos", estimate_minutes: 10 },
  { rubric_key: "opening_date", title: "Set opening date", group: "profile", rubric: "completeness", estimate_minutes: 2 },
  { rubric_key: "social_links", title: "Add social profile links", group: "profile", rubric: "completeness", estimate_minutes: 5 },
  { rubric_key: "service_area", title: "Define service area (SAB)", group: "profile", rubric: "completeness", estimate_minutes: 5 },
  { rubric_key: "utm_link", title: "Add UTM-tagged website link", group: "profile", rubric: "website", estimate_minutes: 3 },
  { rubric_key: "description", title: "Write business description", group: "profile", rubric: "completeness", estimate_minutes: 10 },
  // Reviews
  { rubric_key: "reply_backlog", title: "Reply to pending reviews", group: "reviews", rubric: "reply_rate", estimate_minutes: 20 },
  { rubric_key: "review_machine", title: "Launch review-request machine", group: "reviews", rubric: "reviews_count", estimate_minutes: 15 },
  { rubric_key: "review_velocity", title: "Set a steady review cadence", group: "reviews", rubric: "reviews_velocity", estimate_minutes: 10 },
  // Posts
  { rubric_key: "posts_cadence", title: "Restart weekly Google posts", group: "posts", rubric: "posts", estimate_minutes: 15 },
  // Website
  { rubric_key: "website_vendor", title: "Website fixes — copy brief for vendor", group: "website", rubric: "website", estimate_minutes: 10 },
  { rubric_key: "website_quality", title: "Fix website SSL / mobile issues", group: "website", rubric: "website", estimate_minutes: 10 },
  // Visibility (moves the grid, not the scored rubric → rubric: null)
  { rubric_key: "weak_zone", title: "Target weak grid zone(s)", group: "visibility", rubric: null, estimate_minutes: 15 },
  // Citations
  { rubric_key: "citation_nap", title: "Fix NAP phone mismatch", group: "citations", rubric: "nap", estimate_minutes: 10 },
  { rubric_key: "citation_directories", title: "Fix / add key directory citations", group: "citations", rubric: "nap", estimate_minutes: 20 },
] as const;

/* ------------------------------------------------------------------ *
 * Enriched task view — what the API returns (FixTask + server-derived fields).
 * All added fields are COMPUTED server-side; none are persisted.
 * ------------------------------------------------------------------ */

export interface SprintTask extends FixTask {
  /** Derived via sprintGroupFor(rubric_key). */
  group: SprintGroup;
  /** The audit rubric row this task rolls up to (from the catalog); null for
   *  visibility/grid tasks. Correlates a FieldChange to its RubricDelta. */
  rubric: RubricKey | null;
  /** The CURRENT value of this field on the profile (from the baseline audit snapshot),
   *  so the UI can show "current → suggested" and prefill change_before. null when
   *  the field is empty/unknown. */
  current_value: string | null;
  /** Manual-mode "open Google editor" deep-link (#1, ADR-010). MUST be an allowlisted
   *  Google editor UI host, opened by the founder in their OWN browser; it is NEVER
   *  fetched server-side and NEVER carries a token or API path. null when no direct
   *  editor target exists (UI falls back to copy-only). */
  editor_url: string | null;
  /** Short localizable instruction, e.g. "Paste into Phone under Contact". null → the
   *  copy-only fallback label is used. */
  editor_hint: string | null;
  /** US-022 per-task time estimate (from the catalog; null for custom tasks). */
  estimate_minutes: number | null;
  /** Server-computed recoverable rubric points for THIS task from the baseline gap
   *  (0 when rubric is null or the row is already maxed). Per rubric, the sum across
   *  its tasks is ≤ RUBRIC_MAX[rubric] − baseline[rubric]. Feeds projectedScore(). */
  rubric_points: number;
}

/** One P12 checklist section (tasks grouped by audit source, constraint #5). */
export interface SprintTaskGroup {
  group: SprintGroup;
  label: string;
  tasks: SprintTask[];
  done_count: number;
  total_count: number;
  /** Sum of estimate_minutes for not-yet-done tasks (US-022); null estimates coalesce to 0. */
  remaining_minutes: number;
}

/* ------------------------------------------------------------------ *
 * Locked baseline (TB-017, US-021, constraint #3).
 * ------------------------------------------------------------------ */

export interface SprintBaseline {
  audit_id: string; // baseline_audit_id — NOT NULL, immutable after create
  grid_id: string | null; // baseline_grid_id — immutable once set
  score: number | null; // frozen reference from the baseline audit_scores.total
  band: ScoreBand | null;
  captured_at: string; // == sprint.started_at
  /** Derived (audit_id != null): drives the "baseline locked" chip. A DB trigger
   *  rejects any change to baseline_* once set, so this cannot silently drift. */
  locked: boolean;
}

/* ------------------------------------------------------------------ *
 * US-024 prerequisites gate — enforced SERVER-SIDE on POST /api/sprint.
 * Each condition is a discrete check with a human reason (populated only when ok=false);
 * `eligible` is the AND of every check.
 * ------------------------------------------------------------------ */

export interface PrereqCheck {
  ok: boolean;
  /** Human reason, meaningful only when ok=false; may be "" when ok=true. */
  reason: string;
}

export interface SprintPrereqs {
  /** true only when EVERY check passes — the gate POST re-runs (never trust the client). */
  eligible: boolean;
  /** ① businesses.is_client === true AND businesses.plan is non-null. */
  is_client_with_plan: PrereqCheck;
  /** ② owner_name AND owner_whatsapp both present (TB-001). */
  owner_contact_saved: PrereqCheck;
  /** ③ connection_status IN ('oauth','manager') — OAuth or Manager-access (ADR-010). */
  connection_ready: PrereqCheck;
  /** ④ a TB-002 audit ≤7 days old that is SCORED (has an audit_scores row) exists. */
  fresh_audit: PrereqCheck;
  /** ⑤ no sprint is already active for this business (one-active invariant, DB unique index). */
  no_active_sprint: PrereqCheck;
  /** Age of the most recent audit in days (null when none) — powers one-tap re-audit. */
  fresh_audit_age_days: number | null;
  /** The scored ≤7d audit that WILL be locked as baseline_audit_id at create (null if none). */
  fresh_audit_id: string | null;
  /** The latest grid_scan that WILL be locked as baseline_grid_id at create (null if none). */
  latest_grid_id: string | null;
  /** The already-running sprint's id, when no_active_sprint fails — lets the UI resume
   *  instead of offering Start. null when none is active. */
  active_sprint_id: string | null;
}

/* ------------------------------------------------------------------ *
 * Composite detail — EP-021 create/patch/read response.
 * ------------------------------------------------------------------ */

export interface SprintDetail {
  sprint: OptimizationSprint;
  baseline: SprintBaseline;
  /** Tasks grouped by the 6 audit sources (constraint #5), catalog-ordered. */
  groups: SprintTaskGroup[];
  /** Flat task list (same rows as `groups`) for consumers that don't need sections. */
  tasks: SprintTask[];
  /** Mirror of baseline.score (kept for existing consumers). */
  baseline_score: number | null;
  /** Projected score if the done tasks hold — see projectedScore(). */
  current_projected_score: number | null;
  /** Gate state echoed so the UI can offer re-audit / show blockers. */
  prereqs: SprintPrereqs;
}

/**
 * Projected-score simulator (co-located pure helper, house style): baseline + the
 * rubric_points of every task marked done, capped at 100.
 */
export function projectedScore(
  baseline: number | null,
  tasks: ReadonlyArray<Pick<SprintTask, "status" | "rubric_points">>,
): number | null {
  if (baseline == null) return null;
  const gained = tasks
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + t.rubric_points, 0);
  return Math.min(100, baseline + gained);
}

/* ------------------------------------------------------------------ *
 * EP-021 requests.
 * ------------------------------------------------------------------ */

/** Create a sprint. business_id only — the server re-runs the US-024 gate and
 *  captures/locks the baseline itself (never trust the client gate). Rejects with
 *  FORBIDDEN when the gate fails, CONFLICT when a sprint is already active. */
export interface SprintStartRequest {
  business_id: string;
}

/**
 * Mutate task state only. This request CANNOT carry baseline_* or after_* fields — the
 * baseline is locked at create (TB-017, #3) and the route validates against this strict
 * shape (unknown keys → VALIDATION_ERROR). A PATCH on a status='complete' sprint fails.
 * Zero GBP writes (#1): applying a task only logs change_before/after + flips status.
 * For a source='audit' task: task_status='done' requires approved=true AND a non-empty
 * change_after (the value the founder actually applied).
 */
export interface SprintPatchRequest {
  task_id?: string;
  task_status?: FixTaskStatus;
  /** Founder taps "approve" on an AI suggestion (approve-before-publish, #4); this is
   *  what unlocks the copy control, the editor link, and the 'done' transition. */
  task_approved?: boolean;
  task_note?: string;
  /** Manual-mode change log — the value before/after the founder applied it by hand. */
  change_before?: string;
  change_after?: string;
  /** Founder-added custom task (source='manual'); the group is picked directly (no raw
   *  rubric_key), rubric_points=0, estimate_minutes=null. The server synthesizes a
   *  rubric_key and cannot be made source='audit' from the client. */
  add_custom_task?: { title: string; group: SprintGroup };
  /** Finalize: sets status='complete', completed_at=now(), links after_audit_id/
   *  after_grid_id from the latest ALREADY-EXISTING scored audit / grid — NEVER triggers
   *  a paid EP-001 / grid scan (#7). If none exists, after_*=null (partial report). */
  complete_sprint?: boolean;
}

/* ------------------------------------------------------------------ *
 * EP-022 before/after report (US-023, constraint #6). No DataForSEO, ₹0.
 * ------------------------------------------------------------------ */

export interface SprintReportRequest {
  /** Marathi is the default (US-023). */
  language?: PdfLanguage;
  /** Send the finished PDF over WhatsApp. The WA leg is behind the wa feature flag —
   *  when off, the PDF is STILL produced/saved and `sent` is false (never a hard error). */
  send_whatsapp?: boolean;
}

export type WaSendStatus =
  | "sent"
  | "not_requested" // send_whatsapp was false/absent
  | "skipped_flag_off" // wa.service disabled — PDF still saved (FEATURE_DISABLED semantics)
  | "failed"; // WA call attempted and errored — PDF still saved

/** Per-rubric-row before/after delta rendered in the PDF + UI mini-compare. */
export interface RubricDelta {
  key: RubricKey;
  label: string;
  before: number;
  after: number;
  delta: number; // after - before (positive = improved)
  max: number;
}

/** One field the founder changed manually (from change_before/after logs). */
export interface FieldChange {
  rubric_key: string;
  title: string;
  group: SprintGroup;
  /** The audit rubric row this change rolls up to (null for visibility tasks). */
  rubric: RubricKey | null;
  before: string | null;
  after: string | null;
}

/**
 * The full before/after payload — drives the Marathi PDF and the UI compare card.
 * PARTIAL-REPORT semantics (the CR-1-OFF world this sprint ships in): when there is no
 * after_audit yet, final_score/band_after are null, rubric_deltas is [], grid is null,
 * and the report degrades to field_changes + work_log only. field_changes always
 * populates from the manual change logs — it is the core deliverable.
 */
export interface SprintBeforeAfter {
  baseline_score: number | null;
  final_score: number | null;
  score_delta: number | null; // final - baseline; null when no after-audit
  band_before: ScoreBand | null;
  band_after: ScoreBand | null;
  rubric_deltas: RubricDelta[]; // [] when no after-audit
  field_changes: FieldChange[]; // always populated from change logs
  grid: GridCompare | null; // null when no after (or no baseline) grid
  work_log: Array<{ title: string; status: FixTaskStatus; done_at: string | null }>;
  tasks_done: number;
  tasks_total: number;
}

export interface SprintReportResponse {
  /** Server-internal storage path (EP-006 precedent). */
  pdf_path: string;
  /** The user-facing download/view link — this is the one the UI opens. */
  storage_url: string;
  /** true only when WhatsApp actually delivered. */
  sent: boolean;
  /** Explains sent=false without failing the request (flag off → PDF still saved). */
  wa_status: WaSendStatus;
  /** The deltas the PDF renders — also returned so the UI can show the compare inline. */
  report: SprintBeforeAfter;
}
