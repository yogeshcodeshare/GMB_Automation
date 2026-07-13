import type { FixTask, SprintDetail } from "@/types";

/**
 * Typed mocks for P12 Optimization Sprint (EP-021/022 + prereqs). Task set
 * verbatim from the design prototype's RAWT (28 tasks). Contract-pure
 * `FixTask` rows + a parallel UI-extras map (pts/time/wa-lines are display
 * intel the contract doesn't carry). Swapped for the real routes when
 * backend lands EP-021 (registry "/api/sprint", OFF).
 */

const S = "sprint-manovedh-01";

type Row = [
  id: string,
  rubricKey: string,
  title: string,
  status: FixTask["status"],
  pts: string,
  time: string,
  meta: string,
  before: string,
  after: string,
  waLine: string,
  ui: string,
];

const RAW: Row[] = [
  ["pcat", "category", "Change primary category", "done", "+15", "~2 min", "done 13 Jul", '"Hospital"', '"Mental health clinic" (165k/mo)', "✓ आज तुमची Google category 'Mental health clinic' केली — रँकिंगसाठी सर्वात महत्त्वाचा बदल.", ""],
  ["phone", "completeness", "Add phone number", "done", "+4", "~1 min", "done 13 Jul", "—", "+91 98XXX XXXXX", "✓ फोन नंबर प्रोफाइलवर जोडला — आता ग्राहक थेट कॉल करू शकतात.", ""],
  ["svc", "completeness", "Add services", "done", "+4", "~3 min", "done 14 Jul", "0 services", "8 services — संमोहन उपचार, NLP, EFT…", "✓ ८ सेवा प्रोफाइलवर जोडल्या.", ""],
  ["hours", "completeness", "Fix business hours", "done", "+3", "~2 min", "done 14 Jul", "12–9 AM blocks", "Mon–Sat 10 AM – 8 PM", "✓ वेळा दुरुस्त केल्या.", ""],
  ["desc", "completeness", "Rewrite description", "todo", "+2", "~2 min", "AI draft ready — approve", "Hospital in Karad. Contact for appointment.", "कराडमधील विश्वासार्ह मानसिक आरोग्य क्लिनिक — संमोहन उपचार, NLP आणि EFT थेरपी. तणाव, भीती आणि सवयींवर उपाय. सोमवार पेठ, कराड. आजच अपॉइंटमेंट बुक करा.", "✓ व्यवसाय वर्णन सुधारले — कॅटेगरी + परिसर कीवर्डसह.", "desc"],
  ["photos", "photos", "Upload 12 photos", "done", "+4", "~4 min", "done 16 Jul", "34 photos", "46 photos", "✓ १२ नवीन फोटो अपलोड केले.", ""],
  ["scat", "category", "Add secondary categories", "done", "+2", "~1 min", "done 13 Jul", "1 category", "+ Hypnotherapy service ✓ · Psychotherapist ✓ · Alternative medicine practitioner", "✓ अतिरिक्त categories जोडल्या.", ""],
  ["attr", "completeness", "Update attributes", "todo", "+2", "~2 min", "AI-prefilled — approve", "Payments: Cash only ⚠", 'UPI ✓ · Cards ✓ · amenities · accessibility · "From the business" identity', "✓ UPI पेमेंट attribute जोडले — स्थानिक ग्राहकांसाठी महत्त्वाचे.", "attr"],
  ["prod", "completeness", "Add Products / catalog", "done", "+2", "~4 min", "done 17 Jul", "0 products", "4 products — संमोहन उपचार सत्र ₹800 · NLP कोर्स ₹4,500 · SDP सत्र ₹1,200 · EFT सत्र ₹700", "✓ ४ products जोडले.", ""],
  ["book", "completeness", "Add booking link", "done", "+2", "~1 min", "done 17 Jul", "—", "wa.me/9198XXXXX22 → GBP appointment URL", "✓ बुकिंग लिंक जोडली.", ""],
  ["logo", "photos", "Set logo & cover photo", "done", "+2", "~2 min", "done 16 Jul", "no logo · no cover", "logo + cover set from Media Inbox", "✓ लोगो आणि कव्हर फोटो सेट केले.", ""],
  ["odate", "completeness", "Add opening date", "done", "+1", "~1 min", "done 13 Jul", "—", "2016", "✓ opening date जोडली.", ""],
  ["social", "completeness", "Add social profile links", "todo", "+1", "~1 min", "prefilled from onboarding — approve", "—", "Facebook · Instagram · YouTube URLs", "✓ सोशल प्रोफाइल लिंक जोडल्या.", "plain"],
  ["sab", "completeness", "Service-area settings", "todo", "+1", "~1 min", "approve — or N/A for storefronts", "no areas set", "SAB areas: Karad · Malkapur · Umbraj", "✓ सेवा क्षेत्रे सेट केली.", "na"],
  ["utm", "completeness", "UTM-tag the website link", "todo", "+1", "~1 min", "prefilled — approve", "plain URL", "?utm_source=google&utm_medium=gbp — improvement shows in client analytics", "✓ वेबसाइट लिंकला UTM टॅग जोडले.", "plain"],
  ["reply", "review_reply", "Reply to all 30 reviews", "done", "+6", "via Inbox", "done 18 Jul", "2/30 replied", "30/30 replied", "✓ सर्व ३० रिव्ह्यूंना उत्तरे दिली.", "jump6"],
  ["machine", "review_machine", "Launch review-request machine", "done", "+4", "~2 min", "done 17 Jul", "not running", "QR card ✓ · WhatsApp template ✓ · first 10 asks queued", "✓ रिव्ह्यू-रिक्वेस्ट मशीन सुरू केली.", "machine"],
  ["rphotos", "review_photos", "Review photos from customers", "doing", "+2", "running", "in progress — request machine on", "", "", "", "doing"],
  ["posts", "posts_schedule", "Schedule 4 posts", "done", "+6", "via AI Tools", "done 18 Jul", "1 post / 293 days", "4 scheduled", "✓ ४ पोस्ट्स शेड्यूल केल्या.", "jump8"],
  ["wmeta", "website_meta", "Meta description fix", "blocked", "+2", "vendor", "BLOCKED — external", "category + locality missing", "AI suggestion ready — copy for vendor", "", "vendor"],
  ["wpage", "website_page", "Create category/service page", "blocked", "+1", "vendor", "BLOCKED — external", 'no page for "Mental health clinic"', "one service page per category", "", "vendor"],
  ["wspell", "website_spelling", 'Fix spelling "Minde → Mind"', "blocked", "+1", "vendor", "BLOCKED — external", '"Minde" in Products section', '"Mind"', "", "vendor"],
  ["whead", "website_headings", "Fix heading hierarchy", "blocked", "+1", "vendor", "BLOCKED — external", "H2→H5 · H2→H4 · H3→H6 skips", "proper H1–H3 ladder", "", "vendor"],
  ["tel", "website_tel", "Add tel: click-to-call link", "todo", "+1", "~1 min", "unblocked — phone added ✓", "no tel: link on site", "tel:+919822041122 on the header number", "✓ वेबसाइटवर click-to-call जोडले.", "plain"],
  ["weak", "weak_zone", "Weak zone action — Malkapur side", "todo", "+2", "~8 min", "suggested — approve or mark N/A", "ranks 9–14 beyond 1 km SE", "location-mention post + 2 SE-area citations", "✓ Malkapur भागासाठी पोस्ट + citations केल्या.", "na"],
  ["cjd", "citation_justdial", "JustDial listing", "done", "+1", "~2 min", "done 15 Jul", "not listed", "Listed ✓ · NAP matched", "✓ JustDial लिस्टिंग तपासली.", ""],
  ["cim", "citation_indiamart", "IndiaMART listing", "done", "+1", "~2 min", "done 15 Jul", "not listed", "Listed ✓ · NAP matched", "✓ IndiaMART लिस्टिंग तपासली.", ""],
  ["csul", "citation_sulekha", "Sulekha listing", "todo", "+1", "~3 min", "open listing → verify NAP", "pending", "Listed + NAP matched", "✓ Sulekha लिस्टिंग पूर्ण केली.", "plain"],
];

/** Contract-pure task rows (FixTask). waLine lives in the UI extras map. */
export const sprintTasksMock: FixTask[] = RAW.map(
  ([id, rubric_key, title, status, , , , before, after], i) => ({
    id,
    sprint_id: S,
    rubric_key,
    title,
    status,
    source: "audit",
    done_at: status === "done" ? `2026-07-${13 + (i % 6)}T10:00:00+05:30` : null,
    note: null,
    change_before: before || null,
    change_after: after || null,
    created_at: "2026-07-12T09:00:00+05:30",
  }),
);

/** Display intel the contract doesn't carry (pts/time/meta/wa/uiKind). */
export interface SprintTaskUi {
  pts: string;
  time: string;
  meta: string;
  waLine: string;
  /** "" done-plain · desc · attr · na · plain · vendor · doing · jump6/8 · machine */
  kind: string;
}
export const sprintTaskUiMock: Record<string, SprintTaskUi> =
  Object.fromEntries(
    RAW.map(([id, , , , pts, time, meta, , , waLine, kind]) => [
      id,
      { pts, time, meta, waLine, kind },
    ]),
  );

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
  tasks: sprintTasksMock,
  baseline_score: 41,
  current_projected_score: 70,
};

/** Group header meta (label, audit source, prototype order). */
export const sprintGroupsMeta = [
  { key: "profile", label: "Profile", src: "from Basic Audit" },
  { key: "reviews", label: "Reviews", src: "from Review Audit" },
  { key: "posts", label: "Posts", src: "from Post Audit" },
  { key: "website", label: "Website", src: "from Website Audit" },
  { key: "visibility", label: "Visibility", src: "from Grid Scan" },
  { key: "citations", label: "Citations", src: "NAP tracker" },
] as const;

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

/** GBP editor deep link (manual mode: copy value → open Google editor). */
export const GBP_EDITOR_URL = "https://business.google.com/dashboard";

/**
 * Per-client prerequisite fixtures (US-024 gate). `state` names which gate
 * needs which fix action; the page layers founder actions (mark-as-client,
 * re-audit, manager confirmation) on top. Values verbatim from the prototype.
 */
export interface SprintGateFixture {
  /** ① Client & plan */
  plan: { ok: boolean; value: string; fix?: "mark_client" | "manage_plan" };
  /** ② Owner contact saved */
  owner: { ok: boolean; value: string; fix?: "inline_fields" | "via_client_modal" };
  /** ③ Google profile access (oauth ok, manager = warn-pass after confirm) */
  connection: {
    ok: boolean | "warn";
    value: string;
    fix?: "manual_ack";
  };
  /** ④ Fresh audit ≤ 7 days */
  audit: { ok: boolean; value: string; fix?: "reaudit"; fresh_value?: string };
}

export const sprintGatesMock: Record<string, SprintGateFixture> = {
  "biz-manovedh": {
    // Starts as prospect — Mark-as-Client modal flips 1–3 (captures owner).
    plan: { ok: false, value: "Prospect — audit-only", fix: "mark_client" },
    owner: { ok: false, value: "captured in the Mark-as-Client step", fix: "via_client_modal" },
    connection: { ok: false, value: "– Not connected" },
    audit: { ok: true, value: "audited 08 Jul — 4 days old" },
  },
  "biz-sahyadri": {
    plan: { ok: true, value: "GMB Boost · Content Pack · Optimization ₹4,999" },
    owner: { ok: true, value: "+91 98500 12234 · सुनील (owner)" },
    connection: { ok: true, value: "● Connected (OAuth)" },
    audit: {
      ok: false,
      value: "audited 05 Jul — 8 days (stale)",
      fix: "reaudit",
      fresh_value: "audited just now ✓",
    },
  },
  "biz-shree-dental": {
    plan: { ok: true, value: "GMB Boost · WhatsApp · Optimization ₹4,999" },
    owner: { ok: true, value: "+91 97654 30988 · डॉ. साने" },
    connection: {
      ok: false,
      value: "access not confirmed",
      fix: "manual_ack",
    },
    audit: { ok: true, value: "audited 06 Jul — 6 days old" },
  },
  "biz-patil-coaching": {
    plan: {
      ok: false,
      value: "GMB Boost — Optimization add-on missing",
      fix: "manage_plan",
    },
    owner: {
      ok: false,
      value: "owner name + WhatsApp missing",
      fix: "inline_fields",
    },
    connection: {
      ok: "warn",
      value: "○ Manager access confirmed — manual publish mode",
    },
    audit: {
      ok: false,
      value: "audited 28 Jun — stale",
      fix: "reaudit",
      fresh_value: "audited just now ✓",
    },
  },
};

/** Manovedh gate values AFTER Mark-as-Client (prototype's client variant). */
export const manovedhClientGateMock = {
  plan: "GMB Boost · Optimization ₹4,999",
  owner: "+91 98220 41122 · राजेश (owner) — powers reports & updates",
  connection: "● Connected (OAuth) — approved during onboarding",
};
