import type { SpendToday } from "@/types";

/**
 * Display-side mirror of the backend constant (src/server/costs.ts exports
 * INR_PER_USD = 85 per API_CONTRACT.md §Cost model). Frontend must not import
 * server code, so the fixed display rate is duplicated here.
 */
export const INR_PER_USD = 85;

export function usdToInr(usd: number): number {
  return usd * INR_PER_USD;
}

/** "₹6.20 / ₹95" — spend pill + P1 spend card (prototype format). */
export function spendLabel(spend: SpendToday): string {
  return `₹${usdToInr(spend.spent_usd).toFixed(2)} / ₹${Math.round(
    usdToInr(spend.cap_usd),
  )}`;
}

export function spendPct(spend: SpendToday): number {
  if (spend.cap_usd <= 0) return 100;
  return Math.min(100, (spend.spent_usd / spend.cap_usd) * 100);
}

/** "07 Jul" — table cells (mono). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Google-style relative date ("a week ago", "2 months ago", "a year ago").
 * Dates >1yr are approximated by Google — the caller labels that separately.
 */
export function relativeDate(iso: string, now: Date = new Date()): string {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000),
  );
  if (days < 1) return "today";
  if (days < 7) return days === 1 ? "a day ago" : `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? "a week ago" : `${w} weeks ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return m === 1 ? "a month ago" : `${m} months ago`;
  }
  const y = Math.floor(days / 365);
  return y === 1 ? "a year ago" : `${y} years ago`;
}

/** "Saturday, 11 July 2026" — top bar. */
export function longDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** "Sat, 11 Jul 2026" — mobile page header. */
export function mediumDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}
