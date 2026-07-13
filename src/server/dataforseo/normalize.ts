import type {
  CompetitorSnapshot,
  NormalizedHoursDay,
  NormalizedPost,
  NormalizedProfile,
  NormalizedReview,
} from "@/server/audit/input";
import { buildHoursDays } from "@/server/audit/hours";
import { haversineKm, roundKm } from "@/server/audit/geo";
import type {
  RawBusinessInfo,
  RawMapsItem,
  RawReviewItem,
  RawUpdateItem,
} from "./types";
import { relativeDateToIso } from "@/server/fixtures/review";

/** MS1-T02 — my_business_info → the SAME NormalizedProfile shape the fixture
 * parser emits, so score.service is provably identical for live audits. */

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function formatTime(hour: number, minute: number): string {
  const mer = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute > 0 ? `${h12}:${String(minute).padStart(2, "0")} ${mer}` : `${h12} ${mer}`;
}

export function hoursFromTimetable(
  timetable: NonNullable<
    NonNullable<NonNullable<RawBusinessInfo["work_time"]>["work_hours"]>["timetable"]
  >
): NormalizedHoursDay[] {
  const raw: Array<{ day: string; text: string }> = [];
  for (const day of DAY_ORDER) {
    const ranges = timetable[day];
    if (ranges === undefined) continue;
    const label = day.charAt(0).toUpperCase() + day.slice(1);
    if (ranges === null || ranges.length === 0) {
      raw.push({ day: label, text: "Closed" });
      continue;
    }
    const text = ranges
      .map((r) => {
        const open = formatTime(r.open?.hour ?? 0, r.open?.minute ?? 0);
        const close = formatTime(r.close?.hour ?? 0, r.close?.minute ?? 0);
        return `${open}–${close}`;
      })
      .join("; ");
    raw.push({ day: label, text });
  }
  return buildHoursDays(raw);
}

function flattenAttributes(info: RawBusinessInfo): Record<string, string[]> {
  const available = info.attributes?.available_attributes;
  if (!available) return {};
  const out: Record<string, string[]> = {};
  for (const key of Object.keys(available)) {
    if (available[key]?.length) out[key] = available[key];
  }
  return out;
}

export function normalizeBusinessInfo(
  info: RawBusinessInfo,
  extras?: { city?: string | null; kg_id?: string | null; services?: string[] }
): NormalizedProfile {
  const timetable = info.work_time?.work_hours?.timetable;
  return {
    name: info.title ?? "",
    address: info.address ?? info.snippet ?? info.address_info?.address ?? null,
    phone: info.phone ?? null,
    website: info.url ?? null,
    claimed: info.is_claimed ?? false,
    lat: info.latitude ?? null,
    lng: info.longitude ?? null,
    rating: info.rating?.value ?? null,
    reviews_total: info.rating?.votes_count ?? null,
    place_id: info.place_id ?? null,
    cid: info.cid ?? null,
    kg_id: extras?.kg_id ?? null,
    profile_id: info.feature_id ?? null,
    categories: {
      primary: info.category ?? null,
      secondary: info.additional_categories ?? [],
    },
    // my_business_info has no services payload — empty unless a later source
    // (GBP API, M6) fills it. "Services not found" is itself a finding.
    services: extras?.services ?? [],
    attributes: flattenAttributes(info),
    hours: timetable ? hoursFromTimetable(timetable) : [],
    photos_total: info.total_photos ?? null,
    description: info.description ?? null,
    city: extras?.city ?? info.address_info?.city ?? null,
  };
}

export function normalizeReviewItem(
  item: RawReviewItem,
  index: number,
  reference: Date
): NormalizedReview {
  let iso: string | null = null;
  let approximated = false;
  if (item.timestamp) {
    const t = Date.parse(item.timestamp);
    if (Number.isFinite(t)) iso = new Date(t).toISOString().slice(0, 10);
  }
  if (!iso && item.time_ago) {
    const rel = relativeDateToIso(item.time_ago, reference);
    iso = rel.iso;
    approximated = rel.approximated;
  }
  const text = item.original_review_text ?? item.review_text ?? null;
  return {
    review_id: item.review_id ?? `review-${index + 1}`,
    rating: item.rating?.value ?? 0,
    text,
    author: item.profile_name ?? null,
    review_ts: iso,
    approximated,
    replied: Boolean(item.owner_answer ?? item.original_owner_answer),
    owner_reply: item.original_owner_answer ?? item.owner_answer ?? null,
    has_photos: Boolean(item.images?.length),
    author_review_count: item.reviews_count ?? null,
    author_photo_count: item.photos_count ?? null,
    is_local_guide: item.local_guide ?? false,
  };
}

const URL_RE = /https?:\/\/[^\s)"']+/g;

export function normalizeUpdateItem(item: RawUpdateItem): NormalizedPost {
  const text = item.post_text ?? item.snippet ?? null;
  const linkCount =
    item.links?.length ?? (text ? (text.match(URL_RE)?.length ?? 0) : 0);
  const image = item.images_url ?? item.post_image_url ?? null;
  let iso: string | null = null;
  if (item.timestamp) {
    const t = Date.parse(item.timestamp);
    if (Number.isFinite(t)) iso = new Date(t).toISOString();
  }
  return {
    post_ts: iso,
    text,
    char_count: text ? text.length : null,
    has_media: Boolean(image),
    media_type: image ? "image" : null,
    links: linkCount,
  };
}

/** Resolver candidates (P2 cards) from a maps/local-finder SERP. */
export interface ResolveCandidate {
  name: string;
  address: string | null;
  place_id: string | null;
  cid: string | null;
  rating: number | null;
  reviews_total: number | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
}

export function candidatesFromSerp(items: RawMapsItem[]): ResolveCandidate[] {
  return items
    .filter((i) => Boolean(i.title))
    .map((i) => ({
      name: i.title as string,
      address: i.address ?? null,
      place_id: i.place_id ?? null,
      cid: i.cid ?? null,
      rating: i.rating?.value ?? null,
      reviews_total: i.rating?.votes_count ?? null,
      lat: i.latitude ?? null,
      lng: i.longitude ?? null,
      category: i.category ?? null,
    }));
}

/** MS1-T03 — competitor discovery: SERP items minus the target itself. */
export function competitorsFromSerp(
  items: RawMapsItem[],
  target: { cid: string | null; place_id: string | null; lat: number | null; lng: number | null },
  limit: number
): CompetitorSnapshot[] {
  return items
    .filter((i) => Boolean(i.title))
    .filter(
      (i) =>
        !(target.cid && i.cid === target.cid) &&
        !(target.place_id && i.place_id === target.place_id)
    )
    .slice(0, limit)
    .map((i) => ({
      name: i.title as string,
      primary_category: i.category ?? null,
      rating: i.rating?.value ?? null,
      reviews_total: i.rating?.votes_count ?? null,
      distance_km:
        target.lat !== null &&
        target.lng !== null &&
        i.latitude !== undefined &&
        i.longitude !== undefined
          ? roundKm(haversineKm(target.lat, target.lng, i.latitude, i.longitude))
          : null,
      photos: i.total_photos ?? null,
      cid: i.cid ?? null,
      place_id: i.place_id ?? null,
    }));
}
