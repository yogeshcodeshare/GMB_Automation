import type { AuditProgress } from "@/types";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgress } from "@/server/audit/progress";
import { err, errFrom, ok } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/audit/:id/progress — staged progress for P2. In-process registry
 * first; falls back to the snapshot persisted with the audit row. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return err("VALIDATION_ERROR", "audit id must be a UUID");
  }
  const live = getProgress(params.id);
  if (live) return ok(live);

  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from("audits")
      .select("raw_snapshot")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return err("NOT_FOUND", "No audit with this id");
    const snap = data.raw_snapshot as { progress?: AuditProgress } | null;
    if (snap?.progress) return ok({ ...snap.progress, audit_id: params.id });
    // Row exists but never recorded progress — treat as failed-unknown.
    return ok({
      audit_id: params.id,
      stage: "profile",
      done_stages: [],
      status: "failed",
      detail: "No progress recorded (process restarted?) — re-run the audit",
    } satisfies AuditProgress);
  } catch (e) {
    return errFrom(e);
  }
}
