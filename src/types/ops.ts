/** TB-014/015/016 + P9 Client Ops (M9 — types reserved now for the contract). */

export interface ServiceCycle {
  id: string;
  business_id: string;
  month: string; // first day of month, ISO date
  posts_done: number;
  posts_target: number;
  photos_done: number;
  photos_target: number;
  replies_pct: number | null;
  report_sent: boolean;
  checklist: Record<string, unknown>;
}

export interface MediaInboxItem {
  id: string;
  business_id: string;
  storage_path: string;
  received_ts: string;
  published: boolean;
  gbp_media_id: string | null;
}

export interface ReviewRequest {
  id: string;
  business_id: string;
  customer_phone: string;
  sent_ts: string;
  reminded_ts: string | null;
  review_detected: boolean;
}

/** P9 "Today's work" strip — one-tap pending actions across ALL clients. */
export interface TodaysWorkItem {
  business_id: string;
  business_name: string;
  kind: "publish_photo" | "pending_reply" | "post_due" | "report_due" | "review_request_reminder";
  label: string;
  count: number;
}
