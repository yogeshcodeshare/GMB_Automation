import type { SupabaseClient } from "@supabase/supabase-js";
import type { Business, PrereqCheck, SprintPrereqs } from "@/types";

/**
 * US-024 — the EP-021 prerequisites gate, enforced SERVER-SIDE (the UI's
 * locked state is cosmetics; POST re-runs this and never trusts the client).
 * LOCKED shape: five discrete PrereqCheck{ok,reason} + eligible = AND of all.
 */

const MS_PER_DAY = 86_400_000;
export const FRESH_AUDIT_MAX_DAYS = 7;

/**
 * Newest audit that actually finished scoring. Two explicit queries instead
 * of a PostgREST embed — portable across the real client and test stubs,
 * and audits per business are few.
 */
export async function latestScoredAudit(
  db: SupabaseClient,
  businessId: string,
  opts: { sinceIso?: string; excludeId?: string } = {}
): Promise<{ id: string; created_at: string } | null> {
  const { data: auditRows, error } = await db
    .from("audits")
    .select("id, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(`audits read failed: ${error.message}`);
  for (const audit of auditRows ?? []) {
    if (opts.excludeId && audit.id === opts.excludeId) continue;
    if (
      opts.sinceIso &&
      Date.parse(audit.created_at as string) < Date.parse(opts.sinceIso)
    ) {
      continue; // rows are newest-first: everything after this is older too
    }
    const { data: scores, error: sErr } = await db
      .from("audit_scores")
      .select("total")
      .eq("audit_id", audit.id)
      .maybeSingle();
    if (sErr) throw new Error(`audit_scores read failed: ${sErr.message}`);
    if (scores?.total !== undefined && scores?.total !== null) {
      return { id: audit.id as string, created_at: audit.created_at as string };
    }
  }
  return null;
}

/** Newest finished grid scan (locked as baseline_grid_id at create). */
export async function latestDoneGrid(
  db: SupabaseClient,
  businessId: string,
  opts: { sinceIso?: string } = {}
): Promise<string | null> {
  const { data, error } = await db
    .from("grid_scans")
    .select("id, status, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(`grid_scans read failed: ${error.message}`);
  const found = (data ?? []).find(
    (g) =>
      g.status === "done" &&
      (!opts.sinceIso ||
        Date.parse(g.created_at as string) >= Date.parse(opts.sinceIso))
  );
  return found ? (found.id as string) : null;
}

function check(ok: boolean, reason: string): PrereqCheck {
  return { ok, reason: ok ? "" : reason };
}

export interface PrereqResult {
  prereqs: SprintPrereqs;
  /** Human reasons for every FAILED gate (FORBIDDEN details). */
  failures: string[];
  business: Business | null;
}

export async function computePrereqs(
  db: SupabaseClient,
  businessId: string,
  now = new Date()
): Promise<PrereqResult> {
  const { data: businessRow, error: bizErr } = await db
    .from("businesses")
    .select()
    .eq("id", businessId)
    .maybeSingle();
  if (bizErr) throw new Error(`business read failed: ${bizErr.message}`);
  const business = (businessRow as Business) ?? null;

  if (!business) {
    const missing = check(false, "business not found");
    const prereqs: SprintPrereqs = {
      eligible: false,
      is_client_with_plan: missing,
      owner_contact_saved: missing,
      connection_ready: missing,
      fresh_audit: missing,
      no_active_sprint: missing,
      fresh_audit_age_days: null,
      fresh_audit_id: null,
      latest_grid_id: null,
      active_sprint_id: null,
    };
    return { prereqs, failures: ["business not found"], business: null };
  }

  const [scored, latestGridId, activeRows] = await Promise.all([
    latestScoredAudit(db, businessId),
    latestDoneGrid(db, businessId),
    db
      .from("optimization_sprints")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "active"),
  ]);
  if (activeRows.error) {
    throw new Error(`sprint lookup failed: ${activeRows.error.message}`);
  }
  const activeSprintId = ((activeRows.data ?? [])[0]?.id as string) ?? null;

  const ageDays = scored
    ? Math.floor((now.getTime() - Date.parse(scored.created_at)) / MS_PER_DAY)
    : null;
  const freshOk = ageDays !== null && ageDays <= FRESH_AUDIT_MAX_DAYS;

  const prereqs: SprintPrereqs = {
    eligible: false, // set below
    is_client_with_plan: check(
      business.is_client && business.plan !== null,
      business.is_client
        ? "client has no plan — set one on the business (Manage plan)"
        : "business is a prospect — mark as client with a plan first"
    ),
    owner_contact_saved: check(
      Boolean(business.owner_name && business.owner_whatsapp),
      "owner contact missing — save owner name + WhatsApp number"
    ),
    connection_ready: check(
      business.connection_status === "oauth" ||
        business.connection_status === "manager",
      "no profile access — connect via OAuth or confirm Manager access (manual mode)"
    ),
    fresh_audit: check(
      freshOk,
      ageDays === null
        ? "no finished audit — run an audit first"
        : `latest audit is ${ageDays} days old (max ${FRESH_AUDIT_MAX_DAYS}) — re-audit before starting`
    ),
    no_active_sprint: check(
      activeSprintId === null,
      "an active sprint already exists for this business — complete it first"
    ),
    fresh_audit_age_days: ageDays,
    fresh_audit_id: freshOk && scored ? scored.id : null,
    latest_grid_id: latestGridId,
    active_sprint_id: activeSprintId,
  };
  prereqs.eligible =
    prereqs.is_client_with_plan.ok &&
    prereqs.owner_contact_saved.ok &&
    prereqs.connection_ready.ok &&
    prereqs.fresh_audit.ok &&
    prereqs.no_active_sprint.ok;

  const failures = [
    prereqs.is_client_with_plan,
    prereqs.owner_contact_saved,
    prereqs.connection_ready,
    prereqs.fresh_audit,
    prereqs.no_active_sprint,
  ]
    .filter((c) => !c.ok)
    .map((c) => c.reason);

  return { prereqs, failures, business };
}
