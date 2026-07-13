import { bandFor, type ScoreBand } from "@/types";

/** Tailwind class pairs for the score bands (tokens in tailwind.config.ts). */
export const BAND_CLASSES: Record<ScoreBand, string> = {
  green: "bg-band-good-bg text-band-good",
  amber: "bg-band-warn-bg text-band-warn",
  red: "bg-band-crit-bg text-band-crit",
};

/** Raw hex (SVG fills, inline styles the classes can't reach). */
export const BAND_HEX: Record<ScoreBand, { fg: string; bg: string }> = {
  green: { fg: "#177B4B", bg: "#E3F2E9" },
  amber: { fg: "#9A5B00", bg: "#FAEEDC" },
  red: { fg: "#B3372B", bg: "#F9E5E2" },
};

/** Gauge/bar stroke uses the stronger amber (#C77D00) per the handoff. */
export const BAND_STROKE: Record<ScoreBand, string> = {
  green: "#177B4B",
  amber: "#C77D00",
  red: "#B3372B",
};

export function bandClasses(score: number): string {
  return BAND_CLASSES[bandFor(score)];
}
