import type { NormalizedHoursDay } from "./input";

/**
 * Business-hours sanity (MS1-T10 "hours-sanity").
 * The Manovedh fixture shows "12–9 am; 10 am–12 am" on all 7 days — an
 * overnight 00:00–09:00 block that is almost certainly a data-entry error
 * for a clinic. Deterministic rule: flag any range that STARTS in the
 * 00:00–04:59 window (midnight openings), unless the day is a true 24h
 * "12 am–12 am" single block.
 */

export interface HoursRange {
  startMin: number; // minutes since midnight
  endMin: number; // 1440 = midnight at close
}

const RANGE_RE =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

function toMinutes(hourRaw: number, minute: number, meridiem: string): number {
  let hour = hourRaw % 12;
  if (meridiem === "pm") hour += 12;
  return hour * 60 + minute;
}

/** Parse one range like "12–9 am", "10:30 am–12 am", "12:00 AM - 9:00 AM". */
export function parseHoursRange(text: string): HoursRange | null {
  const m = RANGE_RE.exec(text);
  if (!m) return null;
  const [, h1, min1, mer1raw, h2, min2, mer2raw] = m;
  // A missing meridiem inherits the other side's ("12–9 am" → 12 am – 9 am).
  const mer2 = (mer2raw ?? mer1raw ?? "am").toLowerCase();
  const mer1 = (mer1raw ?? mer2).toLowerCase();
  const startMin = toMinutes(Number(h1), Number(min1 ?? 0), mer1);
  let endMin = toMinutes(Number(h2), Number(min2 ?? 0), mer2);
  if (endMin === 0) endMin = 1440; // "…–12 am" = closes at midnight
  return { startMin, endMin };
}

/** Parse a day cell like "12–9 am; 10 am–12 am" (also "," separated). */
export function parseHoursText(text: string): HoursRange[] {
  if (/closed/i.test(text)) return [];
  return text
    .split(/[;,]/)
    .map((part) => parseHoursRange(part.trim()))
    .filter((r): r is HoursRange => r !== null);
}

export function isOpen24h(ranges: HoursRange[]): boolean {
  return ranges.length === 1 && ranges[0].startMin === 0 && ranges[0].endMin === 1440;
}

/** True when the day's hours look like a data-entry error. */
export function hasHoursAnomaly(text: string): boolean {
  const ranges = parseHoursText(text);
  if (ranges.length === 0) return false;
  if (isOpen24h(ranges)) return false;
  return ranges.some((r) => r.startMin < 5 * 60);
}

export function buildHoursDays(
  raw: Array<{ day: string; text: string }>
): NormalizedHoursDay[] {
  return raw.map(({ day, text }) => ({
    day,
    text,
    anomaly: hasHoursAnomaly(text),
  }));
}

/** One-line message for the sanity flag, e.g. "Overnight block 12–9 AM on all 7 days". */
export function hoursAnomalyMessage(days: NormalizedHoursDay[]): string | null {
  const flagged = days.filter((d) => d.anomaly);
  if (flagged.length === 0) return null;
  const scope =
    flagged.length === days.length && days.length >= 7
      ? "all 7 days"
      : flagged.map((d) => d.day).join(", ");
  return `Overnight block 12–9 AM on ${scope} — likely a data-entry error; confirm real opening hours with the owner`;
}
