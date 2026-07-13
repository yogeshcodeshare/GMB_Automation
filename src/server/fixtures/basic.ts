import { buildHoursDays } from "@/server/audit/hours";
import type { NormalizedHoursDay } from "@/server/audit/input";
import {
  findLine,
  labeledValue,
  parseTableAt,
  sectionLines,
  stripBold,
} from "./md";

/** Parsed fixtures/BasicAudit.md (GMB Everywhere "Basic Audit" export). */
export interface ParsedBasicAudit {
  name: string;
  generated: string | null; // ISO date of the report ("Generated: 7/11/2026")
  address: string | null;
  website: string | null;
  phone: string | null; // "Phone number not provided" → null
  claimed: boolean;
  lat: number | null;
  lng: number | null;
  reviews_total: number | null;
  rating: number | null;
  profile_id: string | null;
  place_id: string | null;
  kg_id: string | null;
  cid: string | null;
  hours: NormalizedHoursDay[];
  categories: string[];
  services: string[]; // "Services not found" → []
  attributes: Record<string, string[]>;
  /** The export's link tables, grouped by section heading. */
  links: Record<string, Array<{ label: string; url: string }>>;
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function usDateToIso(value: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function bulletItems(lines: string[]): string[] {
  return lines
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.trim().slice(2).trim());
}

export function parseBasicAudit(md: string): ParsedBasicAudit {
  const lines = md.split(/\r?\n/);

  const name = labeledValue(lines, "Business Name") ?? "";
  const generatedRaw = labeledValue(lines, "Generated");
  const generated = generatedRaw ? usDateToIso(generatedRaw) : null;

  // "Business Details" field/value table.
  const detailsStart = findLine(lines, /^##\s+.*Business Details/);
  const { rows: detailRows } = parseTableAt(lines, detailsStart + 1);
  const details = new Map<string, string>();
  for (const row of detailRows) {
    if (row.length >= 2) details.set(stripBold(row[0]), row[1]);
  }

  const phoneRaw = details.get("Phone") ?? null;
  const phone =
    phoneRaw && !/not provided|not found|^-?$/i.test(phoneRaw) ? phoneRaw : null;

  let lat: number | null = null;
  let lng: number | null = null;
  const latLng = details.get("Latitude/Longitude");
  if (latLng) {
    const [a, b] = latLng.split(",").map((s) => Number(s.trim()));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      lat = a;
      lng = b;
    }
  }

  const reviewsRaw = details.get("Total Number of Reviews");
  const ratingRaw = details.get("Review Rating");

  // Hours table (skip the "Present day" row — it duplicates today's weekday).
  const hoursStart = findLine(lines, /^###\s+Business Hours/);
  const { rows: hourRows } = parseTableAt(lines, hoursStart + 1);
  const hoursRaw = hourRows
    .filter((r) => r.length >= 2 && WEEKDAYS.includes(r[0]))
    .map((r) => ({ day: r[0], text: r[1] }));

  const categories = bulletItems(sectionLines(lines, /^###\s+Categories/, 3));

  const servicesItems = bulletItems(sectionLines(lines, /^###\s+Services/, 3));
  const services = servicesItems.filter(
    (s) => !/services not found|not found/i.test(s)
  );

  // Attributes: "**Amenities**" group headers followed by bullets.
  const attributes: Record<string, string[]> = {};
  {
    const attrLines = sectionLines(lines, /^###\s+Attributes/, 3);
    let group: string | null = null;
    for (const line of attrLines) {
      const t = line.trim();
      const g = /^\*\*(.+)\*\*$/.exec(t);
      if (g) {
        group = g[1].trim();
        attributes[group] = attributes[group] ?? [];
      } else if (t.startsWith("- ") && group) {
        attributes[group].push(t.slice(2).trim());
      }
    }
  }

  // Link tables — every "## …" section that contains a | Link | URL | table.
  const links: Record<string, Array<{ label: string; url: string }>> = {};
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.+)$/.exec(lines[i].trim());
    if (!h || /Business Details/.test(h[1])) continue;
    const { rows } = parseTableAt(lines, i + 1);
    const items = rows
      .filter((r) => r.length >= 2 && /^https?:\/\//.test(r[1]))
      .map((r) => ({ label: stripBold(r[0]), url: r[1] }));
    if (items.length > 0) {
      // Strip the emoji prefix from the heading ("🗺️ Google Maps Links").
      links[h[1].replace(/^[^A-Za-zऀ-ॿ]+/, "").trim()] = items;
    }
  }

  return {
    name,
    generated,
    address: details.get("Current Address") ?? null,
    website: details.get("Website") ?? null,
    phone,
    claimed: /claimed/i.test(details.get("Business Status") ?? ""),
    lat,
    lng,
    reviews_total: reviewsRaw ? Number(reviewsRaw) : null,
    rating: ratingRaw ? Number(ratingRaw) : null,
    profile_id: details.get("Business Profile ID") ?? null,
    place_id: details.get("Place ID") ?? null,
    kg_id: details.get("Knowledge Panel ID (KG ID)") ?? null,
    cid: details.get("CID Number") ?? null,
    hours: buildHoursDays(hoursRaw),
    categories,
    services,
    attributes,
    links,
  };
}
