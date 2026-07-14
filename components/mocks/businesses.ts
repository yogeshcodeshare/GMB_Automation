import type { BusinessListItem } from "@/types";

/**
 * Typed mock of `GET /api/businesses` — the 6 seed businesses (blueprint §2.9
 * / design-handoff XBIZ list). Scores + last-audit dates match the prototype's
 * P1 table exactly. Swapped for the real route on Day 5.
 *
 * Every seed row is `is_demo: true` — mirrors migration 20260713000002 (all
 * six §2.9 seed businesses are demo data reaped by `flush:demo`). Real
 * businesses the founder adds default is_demo=false and don't badge.
 */
export const businessesMock: BusinessListItem[] = (
  [
  {
    id: "biz-manovedh",
    name: "मनोवेध हिप्नोक्लिनिक (संमोहन उपचार, NLP, EFT थेरपी)",
    city: "Karad",
    place_id: "ChIJXQL5mR3BwjsRkH4v7VZ9aQY",
    cid: "1129384756602311845",
    lat: 17.2891,
    lng: 74.1844,
    website: "https://manovedh.grexa.site",
    is_client: false,
    gbp_location_id: null,
    plan: null,
    connection_status: "none",
    owner_name: null,
    owner_whatsapp: null,
    created_at: "2026-07-08T09:12:00+05:30",
    latest_score: 41,
    latest_audit_at: "2026-07-08T09:12:00+05:30",
    sprint_delta: null,
  },
  {
    id: "biz-sahyadri",
    name: "Hotel Sahyadri Veg",
    city: "Karad",
    place_id: "ChIJVVVVVVVVVRQRsahyadri0002",
    cid: "11297348762834455002",
    lat: 17.2911,
    lng: 74.1839,
    website: "https://hotelsahyadriveg.in",
    is_client: true,
    gbp_location_id: "locations/10000000000000002",
    plan: { base: "gmb_boost", addons: ["content"] },
    connection_status: "oauth",
    owner_name: "Suresh Patil",
    owner_whatsapp: "9822011001",
    created_at: "2026-06-01T10:00:00+05:30",
    latest_score: 74,
    latest_audit_at: "2026-07-05T11:40:00+05:30",
    sprint_delta: null,
  },
  {
    id: "biz-shree-dental",
    name: "श्री डेंटल केअर",
    city: "Karad",
    place_id: "ChIJVVVVVVVVVRQRshreedental3",
    cid: "11297348762834455003",
    lat: 17.2874,
    lng: 74.1902,
    website: "https://shreedentalkarad.in",
    is_client: true,
    gbp_location_id: "locations/10000000000000003",
    plan: { base: "gmb_boost", addons: ["whatsapp"] },
    connection_status: "oauth",
    owner_name: "Dr. Snehal Kulkarni",
    owner_whatsapp: "9822011002",
    created_at: "2026-06-05T10:00:00+05:30",
    latest_score: 58,
    latest_audit_at: "2026-07-02T15:05:00+05:30",
    sprint_delta: null,
  },
  {
    id: "biz-patil-coaching",
    name: "Patil Coaching Classes",
    city: "Karad",
    place_id: "ChIJVVVVVVVVVRQRpatilcoach04",
    cid: "11297348762834455004",
    lat: 17.279,
    lng: 74.1768,
    website: null,
    is_client: true,
    gbp_location_id: null,
    plan: { base: "gmb_boost", addons: [] },
    connection_status: "manager",
    owner_name: "Rahul Patil",
    owner_whatsapp: "9822011003",
    created_at: "2026-06-10T10:00:00+05:30",
    latest_score: 66,
    latest_audit_at: "2026-06-28T09:30:00+05:30",
    sprint_delta: null,
  },
  {
    id: "biz-krishna-misal",
    name: "कृष्णा मिसळ हाऊस",
    city: "Karad",
    place_id: "ChIJVVVVVVVVVRQRkrishnamisal",
    cid: "11297348762834455005",
    lat: 17.2932,
    lng: 74.1785,
    website: null,
    is_client: false,
    gbp_location_id: null,
    plan: null,
    connection_status: "none",
    owner_name: null,
    owner_whatsapp: null,
    created_at: "2026-06-24T12:00:00+05:30",
    latest_score: 34,
    latest_audit_at: "2026-06-24T12:00:00+05:30",
    sprint_delta: null,
  },
  {
    id: "biz-elegance",
    name: "Elegance Beauty Salon",
    city: "Karad",
    place_id: "ChIJVVVVVVVVVRQRelegance0006",
    cid: "11297348762834455006",
    lat: 17.2858,
    lng: 74.1741,
    website: null,
    is_client: false,
    gbp_location_id: null,
    plan: null,
    connection_status: "none",
    owner_name: null,
    owner_whatsapp: null,
    created_at: "2026-06-19T12:00:00+05:30",
    latest_score: 49,
    latest_audit_at: "2026-06-19T12:00:00+05:30",
    sprint_delta: null,
  },
] satisfies BusinessListItem[]
).map((b) => ({ ...b, is_demo: true }));

/**
 * The Manovedh fixture business is identified by mock id (mock phase) OR the
 * seeded UUID (live DB, supabase seed §2.9) — workspace screens carry full
 * demo data for it only.
 */
export const FIXTURE_BUSINESS_IDS = new Set([
  "biz-manovedh",
  "11111111-1111-4111-8111-111111111111",
]);

export function isFixtureBusiness(id: string): boolean {
  return FIXTURE_BUSINESS_IDS.has(id);
}

/** Seeded fixture audit row (TB-002) — the EP-002 read target on live DB. */
export const SEEDED_AUDIT_ID = "a1111111-1111-4111-8111-111111111111";

/** Prototype's business-switcher short labels (long names get ellipsis anyway). */
export const businessShortNames: Record<string, string> = {
  "biz-manovedh": "मनोवेध हिप्नोक्लिनिक",
  "biz-sahyadri": "Hotel Sahyadri Veg",
  "biz-shree-dental": "श्री डेंटल केअर",
  "biz-patil-coaching": "Patil Coaching",
  "biz-krishna-misal": "कृष्णा मिसळ हाऊस",
  "biz-elegance": "Elegance Beauty Salon",
};
