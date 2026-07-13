"use client";

import { cn } from "@/lib/utils";
import { sprintRubricDeltasMock } from "@/components/mocks/sprint";
import { gridJulMatrix, gridMayMatrix } from "@/components/mocks/grid";
import { MiniGrid } from "@/components/grid/mini-grid";
import { Card } from "@/components/ui/card";

const CIRC = 326.7;
const TRACK = 245;

function Gauge({
  score,
  size,
  stroke,
  faded = false,
}: {
  score: number;
  size: number;
  stroke: string;
  faded?: boolean;
}) {
  return (
    <svg width={size} height={size * 0.93} viewBox="0 0 140 130">
      <circle cx="70" cy="70" r="52" fill="none" stroke="#EDEAE3" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${TRACK} ${CIRC}`} transform="rotate(135 70 70)" />
      <circle cx="70" cy="70" r="52" fill="none" stroke={stroke} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${((score / 100) * TRACK).toFixed(0)} ${CIRC}`} transform="rotate(135 70 70)" />
      <text x="70" y="82" textAnchor="middle" fontSize={faded ? 34 : 38} fontWeight="700" fontFamily="var(--font-plex-mono), monospace" fill={faded ? "#5A6560" : "#1B2321"}>
        {score}
      </text>
    </svg>
  );
}

/** P12 score simulator — baseline vs current gauges, rubric deltas, grid minis. */
export function SprintSimulator({
  baseline,
  current,
}: {
  baseline: number;
  current: number;
}) {
  const delta = current - baseline;
  return (
    <Card className="px-5 py-4">
      <div className="mb-3 text-[14.5px] font-bold">Score simulator</div>
      <div className="mb-[6px] flex flex-wrap items-center justify-center gap-3">
        <div className="text-center">
          <Gauge score={baseline} size={78} stroke="#C77D00" faded />
          <div className="text-[10px] font-semibold text-ink-faint">
            BASELINE
          </div>
        </div>
        <span className="text-[18px] font-bold text-band-good">→</span>
        <div className="text-center">
          <Gauge
            score={current}
            size={110}
            stroke={current > 70 ? "#177B4B" : "#C77D00"}
          />
          <div>
            <span className="rounded-chip bg-band-good-bg px-[9px] py-[2px] text-[11px] font-bold text-band-good">
              ▲ +{delta}
            </span>
          </div>
        </div>
      </div>
      <div className="mb-[2px] text-center text-[12px] text-ink-soft">
        If remaining internal tasks are done:{" "}
        <span className="font-mono font-bold text-ink">~78</span>
      </div>
      <div className="mb-3 text-center text-[10.5px] text-ink-faint">
        external website tasks add up to +4 when the vendor completes
      </div>
      {sprintRubricDeltasMock
        .filter((r) => r.state !== "same")
        .slice(0, 6)
        .map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-2 border-t border-[rgba(27,35,33,0.06)] py-[6px]"
          >
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold">
              {r.label}
            </span>
            <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-soft">
              {r.before} →{" "}
              <span className="font-bold text-ink">{r.after}</span>
            </span>
            <span
              className={cn(
                "flex-none rounded-chip px-2 py-[2px] text-[10px] font-bold",
                r.state === "up"
                  ? "bg-band-good-bg text-band-good"
                  : "bg-band-warn-bg text-band-warn",
              )}
            >
              {r.state === "up" ? `▲ ${r.after - r.before}` : "wait"}
            </span>
          </div>
        ))}
      <div className="mt-3 flex items-center gap-[10px] border-t border-[rgba(27,35,33,0.07)] pt-[10px]">
        <div className="relative w-16 flex-none">
          <MiniGrid matrix={gridMayMatrix} />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[15px] font-bold text-band-crit">
            7.8
          </span>
        </div>
        <span className="flex-none text-[14px] font-bold text-band-good">
          →
        </span>
        <div className="relative w-16 flex-none">
          <MiniGrid matrix={gridJulMatrix} />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[15px] font-bold text-band-good">
            4.6
          </span>
        </div>
        <div className="min-w-0 text-[11.5px] leading-relaxed text-ink-soft">
          Grid avg <span className="font-bold text-ink">7.8 → 4.6</span>
          <br />
          Top-3 coverage <span className="font-bold text-ink">24% → 56%</span>
        </div>
      </div>
    </Card>
  );
}
