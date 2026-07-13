import type {
  SprintDetail,
  SprintGroup,
  SprintPrereqs,
  SprintTask,
  SprintTaskGroup,
} from "@/types";
import { SPRINT_GROUP_LABELS, SPRINT_GROUPS, projectedScore } from "@/types";

/**
 * Typed mocks for P12 Optimization Sprint against the LOCKED Day-6 contract
 * (enriched SprintTask, SprintPrereqs w/ PrereqCheck{ok,reason}). Task set
 * verbatim from the design prototype's RAWT (28 tasks). rubric_points are
 * arithmetically consistent with projectedScore(): done-sum 29 (41→70),
 * internal todos +8 (→~78), vendor-blocked +4 — the approved narrative.
 * Swapped for GET /api/sprint?businessId= when MAIN flips "/api/sprint".
 */

const S = "sprint-manovedh-01";
const EDITOR = "https://business.google.com/dashboard";

type Row = [
  id: string,
  rubricKey: string,
  title: string,
  status: SprintTask["status"],
  rubricPoints: number,
  estimateMin: number | null,
  meta: string,
  current: string,
  suggested: string,
  waLine: string,
  ui: string,
  editorHint: string,
];

/** Prototype RAWT → locked-contract fields. current=profile now, suggested=AI. */
const RAW: Row[] = [
  ["pcat", "category_primary_fix", "Change primary category", "done", 15, 2, "done 13 Jul", '"Hospital"', '"Mental health clinic" (165k/mo)', "✓ आज तुमची Google category 'Mental health clinic' केली — रँकिंगसाठी सर्वात महत्त्वाचा बदल.", "", "Paste under Business category in the editor"],
  ["phone", "primary_phone", "Add phone number", "done", 1, 1, "done 13 Jul", "—", "+91 98XXX XXXXX", "✓ फोन नंबर प्रोफाइलवर जोडला — आता ग्राहक थेट कॉल करू शकतात.", "", "Paste into Phone under Contact"],
  ["svc", "services", "Add services", "done", 1, 3, "done 14 Jul", "0 services", "8 services — संमोहन उपचार, NLP, EFT…", "✓ ८ सेवा प्रोफाइलवर जोडल्या.", "", "Add each service under Services"],
  ["hours", "hours_fix", "Fix business hours", "done", 1, 2, "done 14 Jul", "12–9 AM blocks", "Mon–Sat 10 AM – 8 PM", "✓ वेळा दुरुस्त केल्या.", "", "Correct the hours grid under Hours"],
  ["desc", "description", "Rewrite description", "todo", 2, 2, "AI draft ready — approve", "Hospital in Karad. Contact for appointment.", "कराडमधील विश्वासार्ह मानसिक आरोग्य क्लिनिक — संमोहन उपचार, NLP आणि EFT थेरपी. तणाव, भीती आणि सवयींवर उपाय. सोमवार पेठ, कराड. आजच अपॉइंटमेंट बुक करा.", "✓ व्यवसाय वर्णन सुधारले — कॅटेगरी + परिसर कीवर्डसह.", "desc", "Paste into Description under About"],
  ["photos", "logo_cover", "Upload 12 photos", "done", 2, 4, "done 16 Jul", "34 photos", "46 photos", "✓ १२ नवीन फोटो अपलोड केले.", "", "Upload under Photos"],
  ["scat", "category_secondary", "Add secondary categories", "done", 0, 1, "done 13 Jul", "1 category", "+ Hypnotherapy service ✓ · Psychotherapist ✓ · Alternative medicine practitioner", "✓ अतिरिक्त categories जोडल्या.", "", "Add under Additional categories"],
  ["attr", "attributes_upi", "Update attributes", "todo", 2, 2, "AI-prefilled — approve", "Payments: Cash only ⚠", 'UPI ✓ · Cards ✓ · amenities · accessibility · "From the business" identity', "✓ UPI पेमेंट attribute जोडले — स्थानिक ग्राहकांसाठी महत्त्वाचे.", "attr", "Tick each attribute under Attributes"],
  ["prod", "products", "Add Products / catalog", "done", 0, 4, "done 17 Jul", "0 products", "4 products — संमोहन उपचार सत्र ₹800 · NLP कोर्स ₹4,500 · SDP सत्र ₹1,200 · EFT सत्र ₹700", "✓ ४ products जोडले.", "", "Add each under Products"],
  ["book", "booking_link", "Add booking link", "done", 0, 1, "done 17 Jul", "—", "wa.me/9198XXXXX22 → GBP appointment URL", "✓ बुकिंग लिंक जोडली.", "", "Paste into Appointment links"],
  ["logo", "logo_cover", "Set logo & cover photo", "done", 1, 2, "done 16 Jul", "no logo · no cover", "logo + cover set from Media Inbox", "✓ लोगो आणि कव्हर फोटो सेट केले.", "", "Upload under Photos → Logo / Cover"],
  ["odate", "opening_date", "Add opening date", "done", 0, 1, "done 13 Jul", "—", "2016", "✓ opening date जोडली.", "", "Set under Opening date"],
  ["social", "social_links", "Add social profile links", "todo", 1, 1, "prefilled from onboarding — approve", "—", "Facebook · Instagram · YouTube URLs", "✓ सोशल प्रोफाइल लिंक जोडल्या.", "plain", "Paste each under Social profiles"],
  ["sab", "service_area", "Service-area settings", "todo", 0, 1, "approve — or N/A for storefronts", "no areas set", "SAB areas: Karad · Malkapur · Umbraj", "✓ सेवा क्षेत्रे सेट केली.", "na", "Set under Service area"],
  ["utm", "utm_link", "UTM-tag the website link", "todo", 0, 1, "prefilled — approve", "plain URL", "?utm_source=google&utm_medium=gbp — improvement shows in client analytics", "✓ वेबसाइट लिंकला UTM टॅग जोडले.", "plain", "Replace Website under Contact"],
  ["reply", "reply_backlog", "Reply to all 30 reviews", "done", 4, null, "done 18 Jul", "2/30 replied", "30/30 replied", "✓ सर्व ३० रिव्ह्यूंना उत्तरे दिली.", "jump6", "Reply from the Reviews tab"],
  ["machine", "review_machine", "Launch review-request machine", "done", 1, 2, "done 17 Jul", "not running", "QR card ✓ · WhatsApp template ✓ · first 10 asks queued", "✓ रिव्ह्यू-रिक्वेस्ट मशीन सुरू केली.", "machine", ""],
  ["rphotos", "review_velocity", "Review photos from customers", "doing", 2, null, "in progress — request machine on", "", "", "", "doing", ""],
  ["posts", "posts_cadence", "Schedule 4 posts", "done", 3, null, "done 18 Jul", "1 post / 293 days", "4 scheduled", "✓ ४ पोस्ट्स शेड्यूल केल्या.", "jump8", ""],
  ["wmeta", "website_meta", "Meta description fix", "blocked", 2, null, "BLOCKED — external", "category + locality missing", "AI suggestion ready — copy for vendor", "", "vendor", ""],
  ["wpage", "website_page", "Create category/service page", "blocked", 1, null, "BLOCKED — external", 'no page for "Mental health clinic"', "one service page per category", "", "vendor", ""],
  ["wspell", "website_spelling", 'Fix spelling "Minde → Mind"', "blocked", 0, null, "BLOCKED — external", '"Minde" in Products section', '"Mind"', "", "vendor", ""],
  ["whead", "website_headings", "Fix heading hierarchy", "blocked", 1, null, "BLOCKED — external", "H2→H5 · H2→H4 · H3→H6 skips", "proper H1–H3 ladder", "", "vendor", ""],
  ["tel", "website_tel", "Add tel: click-to-call link", "todo", 0, 1, "unblocked — phone added ✓", "no tel: link on site", "tel:+919822041122 on the header number", "✓ वेबसाइटवर click-to-call जोडले.", "plain", "Send to the website vendor or paste in the site editor"],
  ["weak", "weak_zone", "Weak zone action — Malkapur side", "todo", 0, 8, "suggested — approve or mark N/A", "ranks 9–14 beyond 1 km SE", "location-mention post + 2 SE-area citations", "✓ Malkapur भागासाठी पोस्ट + citations केल्या.", "na", ""],
  ["cjd", "citation_justdial", "JustDial listing", "done", 0, 2, "done 15 Jul", "not listed", "Listed ✓ · NAP matched", "✓ JustDial लिस्टिंग तपासली.", "", ""],
  ["cim", "citation_indiamart", "IndiaMART listing", "done", 0, 2, "done 15 Jul", "not listed", "Listed ✓ · NAP matched", "✓ IndiaMART लिस्टिंग तपासली.", "", ""],
  ["csul", "citation_directories", "Sulekha listing", "todo", 2, 3, "open listing → verify NAP", "pending", "Listed + NAP matched", "✓ Sulekha लिस्टिंग पूर्ण केली.", "plain", ""],
];

/** Rubric mapping per prototype task (feeds SprintTask.rubric). */
const RUBRIC_OF: Record<string, SprintTask["rubric"]> = {
  pcat: "category", scat: "category",
  phone: "completeness", svc: "completeness", hours: "completeness",
  desc: "completeness", attr: "completeness", prod: "completeness",
  book: "completeness", odate: "completeness", social: "completeness",
  sab: "completeness",
  photos: "photos", logo: "photos",
  reply: "reply_rate", machine: "reviews_count", rphotos: "reviews_velocity",
  posts: "posts",
  wmeta: "website", wpage: "website", wspell: "website", whead: "website",
  tel: "website", utm: "website",
  weak: null,
  cjd: "nap", cim: "nap", csul: "nap",
};

/** Enriched SprintTask rows — exactly what GET /api/sprint returns. */
export const sprintTasksMock: SprintTask[] = RAW.map(
  ([id, rubric_key, title, status, rubric_points, estimate_minutes, , current, suggested, , ui, editor_hint], i) => {
    const done = status === "done";
    const vendor = ui === "vendor";
    return {
      id,
      sprint_id: S,
      rubric_key,
      title,
      status,
      source: "audit" as const,
      // #4: AI-prefilled tasks persist approved=false until the founder taps
      // approve; done tasks were approved before completion.
      approved: done,
      suggested_value: suggested || null,
      copy_text: vendor
        ? `${title}: ${current} → ${suggested} (brief for the website vendor)`
        : null,
      ai_output_id: ["desc", "attr"].includes(id) ? `ai-fixes-${id}` : null,
      change_before: done ? current || null : null,
      change_after: done ? suggested || null : null,
      note: null,
      done_at: done ? `2026-07-${13 + (i % 6)}T10:00:00+05:30` : null,
      created_at: "2026-07-12T09:00:00+05:30",
      // Server-computed enrichment:
      group: groupOfKey(rubric_key),
      rubric: RUBRIC_OF[id] ?? null,
      current_value: current || null,
      editor_url: vendor ? null : EDITOR,
      editor_hint: editor_hint || null,
      estimate_minutes,
      rubric_points,
    };
  },
);

function groupOfKey(key: string): SprintGroup {
  if (key.startsWith("website_")) return "website";
  if (key.startsWith("citation_")) return "citations";
  if (key.startsWith("review_") || key === "reply_backlog") return "reviews";
  if (key.startsWith("posts")) return "posts";
  if (key.startsWith("weak_zone")) return "visibility";
  return "profile";
}

/** Display extras the contract doesn't carry (status caption + WA line). */
export interface SprintTaskUi {
  meta: string;
  waLine: string;
  /** "" done-plain · desc · attr · na · plain · vendor · doing · jump6/8 · machine */
  kind: string;
}
export const sprintTaskUiMock: Record<string, SprintTaskUi> =
  Object.fromEntries(
    RAW.map(([id, , , , , , meta, , , waLine, kind]) => [
      id,
      { meta, waLine, kind },
    ]),
  );

/** Build SprintTaskGroup[] from (possibly state-patched) tasks. */
export function buildSprintGroups(tasks: SprintTask[]): SprintTaskGroup[] {
  return SPRINT_GROUPS.map((group) => {
    const rows = tasks.filter((t) => t.group === group);
    return {
      group,
      label: SPRINT_GROUP_LABELS[group],
      tasks: rows,
      done_count: rows.filter((t) => t.status === "done").length,
      total_count: rows.length,
      remaining_minutes: rows
        .filter((t) => t.status !== "done")
        .reduce((sum, t) => sum + (t.estimate_minutes ?? 0), 0),
    };
  }).filter((g) => g.total_count > 0);
}

/**
 * Prereqs echoed on the ACTIVE sprint (resume context): checks ①–④ pass,
 * ⑤ fails because this sprint is running → eligible=false, active_sprint_id
 * set so the UI resumes instead of offering Start.
 */
const prereqsActiveSprintMock: SprintPrereqs = {
  eligible: false,
  is_client_with_plan: { ok: true, reason: "" },
  owner_contact_saved: { ok: true, reason: "" },
  connection_ready: { ok: true, reason: "" },
  fresh_audit: { ok: true, reason: "" },
  no_active_sprint: { ok: false, reason: "Sprint already running — resume it below." },
  fresh_audit_age_days: 4,
  fresh_audit_id: "a1111111-1111-4111-8111-111111111111",
  latest_grid_id: "scan-may",
  active_sprint_id: S,
};

export const sprintDetailMock: SprintDetail = {
  sprint: {
    id: S,
    business_id: "biz-manovedh",
    started_at: "2026-07-12T09:30:00+05:30",
    baseline_audit_id: "a1111111-1111-4111-8111-111111111111",
    baseline_grid_id: "scan-may",
    after_audit_id: null,
    after_grid_id: null,
    status: "active",
    completed_at: null,
  },
  baseline: {
    audit_id: "a1111111-1111-4111-8111-111111111111",
    grid_id: "scan-may",
    score: 41,
    band: "amber",
    captured_at: "2026-07-12T09:30:00+05:30",
    locked: true,
  },
  groups: buildSprintGroups(sprintTasksMock),
  tasks: sprintTasksMock,
  baseline_score: 41,
  current_projected_score: projectedScore(41, sprintTasksMock),
  prereqs: prereqsActiveSprintMock,
};

/**
 * US-024 gate fixtures per client — SprintPrereqs (locked shape) + the
 * founder fix-action per failing check. Values verbatim from the prototype.
 */
export interface SprintGateFixture {
  prereqs: SprintPrereqs;
  fixes: {
    plan?: "mark_client" | "manage_plan";
    owner?: "inline_fields";
    connection?: "manual_ack";
    audit?: "reaudit";
  };
  /** Reason line replacements once a fix action completes. */
  fixedValues: Partial<{
    plan: string;
    owner: string;
    connection: string;
    audit: string;
  }>;
  /** ok-check display lines (reason is empty when ok per contract). */
  okValues: Partial<{
    plan: string;
    owner: string;
    connection: string;
    audit: string;
  }>;
}

const check = (ok: boolean, reason = ""): { ok: boolean; reason: string } => ({
  ok,
  reason,
});

export const sprintGatesMock: Record<string, SprintGateFixture> = {
  "biz-manovedh": {
    prereqs: {
      eligible: false,
      is_client_with_plan: check(false, "Prospect — audit-only"),
      owner_contact_saved: check(false, "captured in the Mark-as-Client step"),
      connection_ready: check(false, "– Not connected"),
      fresh_audit: check(true),
      no_active_sprint: check(true),
      fresh_audit_age_days: 4,
      fresh_audit_id: "a1111111-1111-4111-8111-111111111111",
      latest_grid_id: "scan-may",
      active_sprint_id: null,
    },
    fixes: { plan: "mark_client" },
    fixedValues: {
      plan: "GMB Boost · Optimization ₹4,999",
      owner: "+91 98220 41122 · राजेश (owner) — powers reports & updates",
      connection: "● Connected (OAuth) — approved during onboarding",
    },
    okValues: { audit: "audited 08 Jul — 4 days old" },
  },
  "biz-sahyadri": {
    prereqs: {
      eligible: false,
      is_client_with_plan: check(true),
      owner_contact_saved: check(true),
      connection_ready: check(true),
      fresh_audit: check(false, "audited 05 Jul — 8 days (stale)"),
      no_active_sprint: check(true),
      fresh_audit_age_days: 8,
      fresh_audit_id: null,
      latest_grid_id: null,
      active_sprint_id: null,
    },
    fixes: { audit: "reaudit" },
    fixedValues: { audit: "audited just now ✓" },
    okValues: {
      plan: "GMB Boost · Content Pack · Optimization ₹4,999",
      owner: "+91 98500 12234 · सुनील (owner)",
      connection: "● Connected (OAuth)",
    },
  },
  "biz-shree-dental": {
    prereqs: {
      eligible: false,
      is_client_with_plan: check(true),
      owner_contact_saved: check(true),
      connection_ready: check(false, "access not confirmed"),
      fresh_audit: check(true),
      no_active_sprint: check(true),
      fresh_audit_age_days: 6,
      fresh_audit_id: "a2222222-2222-4222-8222-222222222222",
      latest_grid_id: null,
      active_sprint_id: null,
    },
    fixes: { connection: "manual_ack" },
    fixedValues: {
      connection: "○ Manager access confirmed — manual publish mode",
    },
    okValues: {
      plan: "GMB Boost · WhatsApp · Optimization ₹4,999",
      owner: "+91 97654 30988 · डॉ. साने",
      audit: "audited 06 Jul — 6 days old",
    },
  },
  "biz-patil-coaching": {
    prereqs: {
      eligible: false,
      is_client_with_plan: check(false, "GMB Boost — Optimization add-on missing"),
      owner_contact_saved: check(false, "owner name + WhatsApp missing"),
      connection_ready: check(true), // manager counts (ADR-010)
      fresh_audit: check(false, "audited 28 Jun — stale"),
      no_active_sprint: check(true),
      fresh_audit_age_days: 19,
      fresh_audit_id: null,
      latest_grid_id: null,
      active_sprint_id: null,
    },
    fixes: { plan: "manage_plan", owner: "inline_fields", audit: "reaudit" },
    fixedValues: { audit: "audited just now ✓" },
    okValues: {
      connection: "○ Manager access confirmed — manual publish mode",
    },
  },
};

/** Rubric before→after (simulator top rows + full report table). */
export const sprintRubricDeltasMock = [
  { label: "Profile claimed", before: 10, after: 10, state: "same" as const },
  { label: "Primary category ✕→✓", before: 0, after: 15, state: "up" as const },
  { label: "Completeness ✕→✓", before: 7, after: 14, state: "up" as const },
  { label: "Photos !→✓", before: 4, after: 8, state: "up" as const },
  { label: "Reviews count !→✓", before: 5, after: 7, state: "up" as const },
  { label: "Review velocity !→✓", before: 3, after: 5, state: "up" as const },
  { label: "Owner reply rate ✕→✓", before: 1, after: 7, state: "up" as const },
  { label: "Posts ✕→✓", before: 2, after: 8, state: "up" as const },
  { label: "Website !", before: 6, after: 6, state: "wait" as const },
  { label: "NAP consistency !→✓", before: 3, after: 5, state: "up" as const },
];

/** EP-022 report body content (grid/review deltas + narrative blocks). */
export const sprintReportMock = {
  period: "Sprint 12–20 Jul 2026",
  before_score: 41,
  after_score: 78,
  before_band: "सुधारणा आवश्यक",
  after_band: "चांगले",
  grid: { avg_before: 7.8, avg_after: 4.6, top3_before: 24, top3_after: 56 },
  reviews: {
    count_before: 30,
    count_after: 39,
    velocity_before: 1.2,
    velocity_after: 3.0,
    reply_before: 6.67,
    reply_after: 100,
  },
  work_delivered: [
    ["Profile (10/10)", "category, phone, 8 services, hours, description, +12 photos, secondary categories, attributes (UPI), 4 products, booking link"],
    ["Reviews (3/3)", "30/30 replies · request machine live (9 new reviews) · photo drive on"],
    ["Posts (1/1)", "4 scheduled"],
    ["Website (1/5)", "tel: click-to-call added · 4 items with your vendor"],
    ["Visibility (1/1)", "Malkapur-side post + 2 SE-area citations"],
    ["Citations (3/3)", "JustDial ✓ · IndiaMART ✓ · Sulekha ✓"],
  ] as Array<[string, string]>,
  vendor_waiting:
    'Meta description · category/service page · spelling "Minde → Mind" · heading structure — briefs shared 14 Jul. These add up to +4 more points once done.',
  whats_next:
    "Website meta fixes (waiting on vendor) · customer photo drive continues · monthly GMB Boost plan takes over — posts, replies, reports.",
};

/** Client-updates panel seed (batched daily Marathi WhatsApp). */
export const sprintClientUpdatesMock = [
  {
    date: "18 Jul",
    status: "sent" as const,
    text: "नमस्कार! आजची प्रगती: ✓ सर्व ३० रिव्ह्यूंना उत्तरे · ✓ ४ पोस्ट्स शेड्यूल केल्या. — तुमची डिजिटल एजन्सी",
  },
];

/** Manovedh gate values AFTER Mark-as-Client (prototype's client variant). */
export const manovedhClientGateMock = {
  plan: "GMB Boost · Optimization ₹4,999",
  owner: "+91 98220 41122 · राजेश (owner) — powers reports & updates",
  connection: "● Connected (OAuth) — approved during onboarding",
};
