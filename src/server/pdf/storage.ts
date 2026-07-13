import type { SupabaseClient } from "@supabase/supabase-js";

/** Upload a rendered report into the private `reports` bucket (M0 created
 * it) and hand back the storage path + a 7-day signed URL. */
export async function uploadReport(
  db: SupabaseClient,
  fileName: string,
  bytes: Buffer
): Promise<{ pdf_path: string; storage_url: string }> {
  const pdf_path = `reports/${fileName}`;
  const { error: upErr } = await db.storage
    .from("reports")
    .upload(fileName, bytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`report upload failed: ${upErr.message}`);

  const { data, error: signErr } = await db.storage
    .from("reports")
    .createSignedUrl(fileName, 7 * 24 * 3600);
  if (signErr || !data) {
    throw new Error(`signed URL failed: ${signErr?.message ?? "no data"}`);
  }
  return { pdf_path, storage_url: data.signedUrl };
}
