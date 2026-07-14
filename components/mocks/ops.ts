import type { ServiceCycle, Settings, SpendLedgerEntry, TodaysWorkItem } from "@/types";

/**
 * Typed mocks for P9 Client Ops (ServiceCycle/TodaysWorkItem — M9 contract
 * shapes, read views today) and P11 Settings & Spend. Flushable per the
 * client data policy.
 */

/** Base-plan display labels (pricing is demo copy — flushable). */
export const planBaseLabelMock: Record<string, string> = {
  gmb_boost: "GMB Boost ₹2,999",
};

/** Next scheduled monthly report send (demo). */
export const reportScheduleMock = "1 Aug 09:00";

/** July-2026 service cycles for the 3 clients (quota bars). */
export const serviceCyclesMock: Record<string, ServiceCycle> = {
  "biz-sahyadri": {
    id: "cycle-sahyadri-07",
    business_id: "biz-sahyadri",
    month: "2026-07-01",
    posts_done: 6,
    posts_target: 8,
    photos_done: 7,
    photos_target: 10,
    replies_pct: 100,
    report_sent: false,
    checklist: { content_articles_done: 2, content_articles_target: 4 },
  },
  "biz-shree-dental": {
    id: "cycle-dental-07",
    business_id: "biz-shree-dental",
    month: "2026-07-01",
    posts_done: 5,
    posts_target: 8,
    photos_done: 6,
    photos_target: 10,
    replies_pct: 97,
    report_sent: false,
    checklist: { whatsapp_replies_done: 41, whatsapp_replies_target: 50 },
  },
  "biz-patil-coaching": {
    id: "cycle-patil-07",
    business_id: "biz-patil-coaching",
    month: "2026-07-01",
    posts_done: 3,
    posts_target: 8,
    photos_done: 4,
    photos_target: 10,
    replies_pct: 92,
    report_sent: false,
    checklist: {},
  },
};

/** June cycles (month selector's previous month — all complete). */
export const serviceCyclesJuneMock: Record<string, ServiceCycle> = {
  "biz-sahyadri": {
    ...serviceCyclesMock["biz-sahyadri"],
    id: "cycle-sahyadri-06",
    month: "2026-06-01",
    posts_done: 8,
    photos_done: 10,
    replies_pct: 100,
    report_sent: true,
    checklist: { content_articles_done: 4, content_articles_target: 4 },
  },
  "biz-shree-dental": {
    ...serviceCyclesMock["biz-shree-dental"],
    id: "cycle-dental-06",
    month: "2026-06-01",
    posts_done: 8,
    photos_done: 9,
    replies_pct: 100,
    report_sent: true,
    checklist: { whatsapp_replies_done: 50, whatsapp_replies_target: 50 },
  },
  "biz-patil-coaching": {
    ...serviceCyclesMock["biz-patil-coaching"],
    id: "cycle-patil-06",
    month: "2026-06-01",
    posts_done: 7,
    photos_done: 8,
    replies_pct: 95,
    report_sent: true,
    checklist: {},
  },
};

/** "Today's work" strip — one-tap pending actions across ALL clients. */
export const todaysWorkMock: TodaysWorkItem[] = [
  { business_id: "biz-sahyadri", business_name: "Hotel Sahyadri Veg", kind: "publish_photo", label: "2 photos in inbox — publish to GBP", count: 2 },
  { business_id: "biz-shree-dental", business_name: "श्री डेंटल केअर", kind: "pending_reply", label: "3 reviews waiting for a reply", count: 3 },
  { business_id: "biz-patil-coaching", business_name: "Patil Coaching Classes", kind: "post_due", label: "post due — 5 behind this month", count: 1 },
  { business_id: "biz-sahyadri", business_name: "Hotel Sahyadri Veg", kind: "report_due", label: "monthly report scheduled 1 Aug 09:00", count: 1 },
];

/** Work log (change-log style, latest first). */
export const workLogMock = [
  { date: "17 Jul", business: "Hotel Sahyadri Veg", action: "Published 2 photos (thali.jpg, lobby.jpg) to GBP" },
  { date: "17 Jul", business: "श्री डेंटल केअर", action: "Replied to 3 reviews (AI drafts approved)" },
  { date: "16 Jul", business: "Patil Coaching Classes", action: "Post copied for manual publish — toppers announcement" },
  { date: "15 Jul", business: "Hotel Sahyadri Veg", action: "Scheduled 2 GBP posts via AI Tools" },
  { date: "14 Jul", business: "श्री डेंटल केअर", action: "Sent 5 review requests (QR + WhatsApp)" },
];

/** Monthly counters (review-request machine). */
export const opsCountersMock = {
  requests_sent: 34,
  reminders: 12,
  new_reviews: 9,
  conversion_pct: 26,
};

/** TB-011 settings row (P11) — served by GET /api/settings once flipped. */
export const settingsMock: Settings = {
  daily_spend_cap_usd: 1.15,
  public_daily_limit: 50,
  per_ip_limit: 3,
  model_chain: [
    "groq/llama-3.3-70b-versatile",
    "openrouter/qwen-2.5-72b-instruct:free",
    "openrouter/gemma-2-27b-it:free",
  ],
  dataforseo_live_enabled: false,
};

/**
 * Spend ledger rows (TB-010) for the P11 table. CONTRACT GAP (HANDOFF): no
 * GET endpoint lists ledger entries — only /api/spend/today aggregates.
 * Proposal: GET /api/spend/ledger?limit= → SpendLedgerEntry[].
 */
export const spendLedgerMock: SpendLedgerEntry[] = [
  { id: 112, endpoint: "serp/google/maps (5×5 grid)", cost_usd: 0.015, task_id: "t-9911", created_at: "2026-07-17T09:32:00+05:30" },
  { id: 111, endpoint: "business_data/my_business_info", cost_usd: 0.012, task_id: "t-9910", created_at: "2026-07-17T09:05:00+05:30" },
  { id: 110, endpoint: "business_data/reviews", cost_usd: 0.0075, task_id: "t-9909", created_at: "2026-07-16T16:40:00+05:30" },
  { id: 109, endpoint: "business_data/my_business_updates", cost_usd: 0.002, task_id: "t-9908", created_at: "2026-07-16T16:39:00+05:30" },
  { id: 108, endpoint: "serp/google/local_finder", cost_usd: 0.006, task_id: "t-9907", created_at: "2026-07-16T11:12:00+05:30" },
  { id: 107, endpoint: "keywords_data/search_volume", cost_usd: 0.001, task_id: "t-9906", created_at: "2026-07-15T14:20:00+05:30" },
];

/** P11 spend summary extras (this-month + vendor balance + AI usage). */
export const spendSummaryMock = {
  month_inr: 214,
  month_calls: 112,
  vendor_balance_usd: 46.1,
  ai_used: 2,
  ai_limit: 1000,
};
