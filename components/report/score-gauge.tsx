import { bandFor } from "@/types";
import { BAND_STROKE } from "@/components/ui/band";

/**
 * 270° score gauge — r52, stroke 12 round-cap, track #EDEAE3, value stroke in
 * band color (#C77D00 amber), mono 34/700 center (handoff P3 spec).
 * Track length 245 = 75% of circumference 2π·52 ≈ 326.7.
 */
export function ScoreGauge({
  score,
  size = 150,
  stroke,
  subtitle = "/ 100",
}: {
  score: number;
  /** Rendered px size (viewBox stays 140). */
  size?: number;
  /** Override the band stroke (e.g. PSI banding differs from the rubric's). */
  stroke?: string;
  subtitle?: string;
}) {
  const CIRC = 326.7;
  const TRACK = 245;
  const value = (Math.max(0, Math.min(100, score)) / 100) * TRACK;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      role="img"
      aria-label={`Score ${score} of 100`}
    >
      <circle
        cx="70"
        cy="70"
        r="52"
        fill="none"
        stroke="#EDEAE3"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${TRACK} ${CIRC}`}
        transform="rotate(135 70 70)"
      />
      <circle
        cx="70"
        cy="70"
        r="52"
        fill="none"
        stroke={stroke ?? BAND_STROKE[bandFor(score)]}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${value.toFixed(1)} ${CIRC}`}
        transform="rotate(135 70 70)"
      />
      <text
        x="70"
        y="70"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fontFamily="var(--font-plex-mono), monospace"
        fill="#1B2321"
      >
        {score}
      </text>
      <text
        x="70"
        y="90"
        textAnchor="middle"
        fontSize="12"
        fontFamily="var(--font-plex-mono), monospace"
        fill="#5A6560"
      >
        {subtitle}
      </text>
    </svg>
  );
}

/** "NEEDS WORK · 40–70" pill + legend caption under the gauge. */
export function BandLabel({ score }: { score: number }) {
  const band = bandFor(score);
  const label =
    band === "green"
      ? "HEALTHY · 70+"
      : band === "amber"
        ? "NEEDS WORK · 40–70"
        : "CRITICAL · <40";
  const cls =
    band === "green"
      ? "bg-band-good-bg text-band-good"
      : band === "amber"
        ? "bg-band-warn-bg text-band-warn"
        : "bg-band-crit-bg text-band-crit";
  return (
    <>
      <span
        className={`rounded-chip px-[14px] py-[5px] text-[12px] font-bold tracking-[0.3px] ${cls}`}
      >
        {label}
      </span>
      <div className="text-center text-[12px] text-ink-soft">
        Red &lt;40 · Amber 40–70 · Green &gt;70
      </div>
    </>
  );
}
