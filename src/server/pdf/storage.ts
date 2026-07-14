import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upload a rendered report into the private `reports` bucket (M0 created it)
 * and hand back the storage path + a signed URL. UAT-1: storage failures
 * translate to actionable messages (bucket missing ≠ permission ≠ network).
 */

export const SIGNED_URL_TTL_SECONDS = 7 * 24 * 3600; // 7 days (UI re-requests after)

/** Storage-layer failure with an operator-actionable message (500 INTERNAL). */
export class ReportStorageError extends Error {
  readonly code = "INTERNAL" as const;
  constructor(message: string) {
    super(message);
    this.name = "ReportStorageError";
  }
}

function classify(stage: "upload" | "sign", message: string): ReportStorageError {
  const m = message.toLowerCase();
  if (m.includes("bucket") && (m.includes("not found") || m.includes("does not exist"))) {
    return new ReportStorageError(
      `reports bucket missing — the M0 migration creates it (storage.buckets 'reports'); re-run the init migration or create the bucket in the Supabase dashboard. (${stage}: ${message})`
    );
  }
  if (m.includes("permission") || m.includes("unauthorized") || m.includes("row-level security") || m.includes("access denied")) {
    return new ReportStorageError(
      `storage permission denied on the reports bucket — the server must use the SECRET key client (createServiceClient), not the anon key. (${stage}: ${message})`
    );
  }
  return new ReportStorageError(`report ${stage} failed: ${message}`);
}

export async function uploadReport(
  db: SupabaseClient,
  fileName: string,
  bytes: Buffer
): Promise<{ pdf_path: string; storage_url: string }> {
  const pdf_path = `reports/${fileName}`;
  const { error: upErr } = await db.storage
    .from("reports")
    .upload(fileName, bytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw classify("upload", upErr.message);

  const { data, error: signErr } = await db.storage
    .from("reports")
    .createSignedUrl(fileName, SIGNED_URL_TTL_SECONDS);
  if (signErr || !data) {
    throw classify("sign", signErr?.message ?? "no signed URL returned");
  }
  return { pdf_path, storage_url: data.signedUrl };
}
