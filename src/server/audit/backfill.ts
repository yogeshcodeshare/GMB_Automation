import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditScores, Business } from "@/types";
import { demoInputFor } from "./demo";
import { buildSnapshot } from "./pipeline";
import { finishProgress, initProgress } from "./progress";
import { insertScores, replacePosts, upsertReviews } from "./repo";

/**
 * UAT-4 — seed-wide snapshot backfill (PM-approved pattern from a1111111).
 * Every audit whose raw_snapshot lacks the normalized `input` gets a full
 * deterministic demo snapshot (generator seeded by the business name+city,
 * quality tuned from the seeded score so bands stay in character). Also
 * refreshes audit_scores from the snapshot (report ↔ dashboard consistency)
 * and fills the review/post caches so P6/P7 work live for every demo
 * business. Idempotent: audits that already carry `input` are skipped.
 */
export async function backfillDemoSnapshots(
  db: SupabaseClient,
  opts: { now?: () => Date } = {}
): Promise<{ updated: string[]; skipped: string[] }> {
  const { data: audits, error } = await db.from("audits").select();
  if (error) throw new Error(`audits read failed: ${error.message}`);

  const updated: string[] = [];
  const skipped: string[] = [];

  for (const audit of audits ?? []) {
    const snap = audit.raw_snapshot as { input?: unknown } | null;
    if (snap?.input) {
      skipped.push(audit.id as string);
      continue;
    }
    const { data: businessRow, error: bErr } = await db
      .from("businesses")
      .select()
      .eq("id", audit.business_id)
      .maybeSingle();
    if (bErr) throw new Error(`business read failed: ${bErr.message}`);
    if (!businessRow) {
      skipped.push(audit.id as string);
      continue;
    }
    const business = businessRow as Business;

    const { data: scoreRow } = await db
      .from("audit_scores")
      .select()
      .eq("audit_id", audit.id)
      .maybeSingle();
    const seededTotal = (scoreRow as AuditScores | null)?.total ?? 50;

    const createdAt = String(audit.created_at);
    const input = demoInputFor(business.name, business.city ?? "Karad", {
      quality: Math.min(0.95, Math.max(0.1, seededTotal / 100)),
      reference: new Date(createdAt),
    });

    initProgress(audit.id as string);
    const progress = finishProgress(audit.id as string, "done", "backfilled demo snapshot");
    const snapshot = buildSnapshot(input, {
      source: "demo",
      auditedAt: createdAt,
      progress,
    });

    const { error: upErr } = await db
      .from("audits")
      .update({ raw_snapshot: snapshot })
      .eq("id", audit.id);
    if (upErr) throw new Error(`snapshot update failed (${audit.id}): ${upErr.message}`);

    // Keep the stored score consistent with what the snapshot renders.
    await insertScores(
      db,
      audit.id as string,
      snapshot.scores as Omit<AuditScores, "audit_id">
    );
    if (input.reviews) await upsertReviews(db, business.id, input.reviews.items);
    if (input.posts) await replacePosts(db, business.id, input.posts.items);

    updated.push(audit.id as string);
  }

  return { updated, skipped };
}
