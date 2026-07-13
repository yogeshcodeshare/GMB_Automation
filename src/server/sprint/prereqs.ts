import type { SupabaseClient } from "@supabase/supabase-js";
import type { Business, SprintPrereqs } from "@/types";

/**
 * US-024 — the EP-021 prerequisites gate, enforced SERVER-SIDE (the UI's
 * locked state is cosmetics; this is the real gate). All four must pass:
 * client with a plan · owner contact saved · connection ready (OAuth or
 * Manager access = the manual-mode ack, ADR-010) · fresh audit ≤ 7 days.
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

export interface PrereqResult {
  prereqs: SprintPrereqs;
  /** Human reasons for every FAILED gate — VALIDATION_ERROR details. */
  failures: string[];
  business: Business | null;
  latest_audit_id: string | null;
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
    return {
      prereqs: {
        is_client_with_plan: false,
        owner_contact_saved: false,
        connection_ready: false,
        fresh_audit: false,
        fresh_audit_age_days: null,
      },
      failures: ["business not found"],
      business: null,
      latest_audit_id: null,
    };
  }

  // Latest SCORED audit (a failed/running audit is not a baseline).
  const scored = await latestScoredAudit(db, businessId);
  const ageDays = scored
    ? Math.floor((now.getTime() - Date.parse(scored.created_at)) / MS_PER_DAY)
    : null;

  const prereqs: SprintPrereqs = {
    is_client_with_plan: business.is_client && business.plan !== null,
    owner_contact_saved: Boolean(business.owner_name && business.owner_whatsapp),
    connection_ready:
      business.connection_status === "oauth" ||
      business.connection_status === "manager",
    fresh_audit: ageDays !== null && ageDays <= FRESH_AUDIT_MAX_DAYS,
    fresh_audit_age_days: ageDays,
  };

  const failures: string[] = [];
  if (!prereqs.is_client_with_plan) {
    failures.push(
      business.is_client
        ? "client has no plan — set one on the business (Manage plan)"
        : "business is a prospect — mark as client with a plan first"
    );
  }
  if (!prereqs.owner_contact_saved) {
    failures.push("owner contact missing — save owner name + WhatsApp number");
  }
  if (!prereqs.connection_ready) {
    failures.push(
      "no profile access — connect via OAuth or confirm Manager access (manual mode)"
    );
  }
  if (!prereqs.fresh_audit) {
    failures.push(
      ageDays === null
        ? "no finished audit — run an audit first"
        : `latest audit is ${ageDays} days old (max ${FRESH_AUDIT_MAX_DAYS}) — re-audit before starting`
    );
  }

  return {
    prereqs,
    failures,
    business,
    latest_audit_id: scored ? (scored.id as string) : null,
  };
}
