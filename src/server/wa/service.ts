import { features } from "@/lib/env";
import { FeatureDisabledError } from "@/server/errors";

/**
 * MS4-T03 — wa.service INTERFACE + stub (EP-007). The Meta WhatsApp Cloud
 * API keys arrive next week; until then the flag is off and every call
 * returns the FEATURE_DISABLED envelope. This module must compile and
 * unit-test with the keys ABSENT (hard constraint / brief §3).
 */

export interface WaSendRequest {
  phone: string; // +91…
  pdf_path: string;
  summary: string; // short Marathi/English caption
}

export interface WaSendResult {
  sent: true;
  wa_message_id: string;
}

export function assertWhatsappEnabled(): void {
  if (!features.whatsapp()) {
    throw new FeatureDisabledError(
      "WhatsApp sending is not configured yet — keys arrive in week 2. The PDF stays saved in storage; share it manually meanwhile."
    );
  }
}

/** Sends the report document + summary. Real implementation lands when the
 * WHATSAPP_* keys exist; the interface is fixed now so EP-007 and the P3
 * send-flow don't change. */
export async function sendReport(req: WaSendRequest): Promise<WaSendResult> {
  assertWhatsappEnabled();
  // --- real Meta Cloud API call goes here (week 2) ---
  void req;
  throw new FeatureDisabledError(
    "WhatsApp transport not implemented yet — flag is on but the sender hasn't shipped (expected week 2)."
  );
}
