"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { GridSize } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import { auditReportMock } from "@/components/mocks/audit-report";
import {
  gridCompareMock,
  gridCostInr,
  gridHistoryMock,
  gridJulMatrix,
  gridJulResultMock,
  gridMayMatrix,
  keywordDemandMock,
  pointDirection,
  pointDistanceKm,
  teleportAreaNoteMock,
  teleportAreasMock,
  teleportResultMock,
} from "@/components/mocks/grid";
import { MiniGrid } from "@/components/grid/mini-grid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LiveDataOffNote } from "@/components/ui/live-data";
import { useToast } from "@/components/ui/toast";

const GridMap = dynamic(() => import("@/components/grid/grid-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-[10px] bg-[#EDEAE3]" />
  ),
});
const TeleportMap = dynamic(() => import("@/components/grid/teleport-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] w-full animate-pulse rounded-[10px] bg-[#EDEAE3]" />
  ),
});

const GRID_LABELS: Array<{ label: string; size: GridSize }> = [
  { label: "Teleport", size: 1 },
  { label: "3×3", size: 3 },
  { label: "5×5", size: 5 },
  { label: "7×7", size: 7 },
];
const RADII = ["0.5 km", "1 km", "1.5 km", "3 km", "5 km"];

const CAPTION =
  "text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft mb-[6px]";
const CHIP_BTN = (active: boolean) =>
  cn(
    "rounded-lg border-[1.5px] px-[14px] py-[7px] text-[12.5px] font-semibold",
    active
      ? "border-brand bg-brand text-white"
      : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink-soft hover:border-brand",
  );

function rankBandClasses(v: number): string {
  return v <= 3
    ? "bg-band-good-bg text-band-good"
    : v <= 10
      ? "bg-band-warn-bg text-band-warn"
      : "bg-band-crit-bg text-band-crit";
}

/** P5 Grid Scan / Teleport — Leaflet + OSM rank heatmap around the business. */
export default function GridPage() {
  const router = useRouter();
  const toast = useToast();
  const { bizSel, setBizSelId, bizSelIsFixture, capHit, liveDataEnabled } =
    useAppState();
  const liveBlocked = !liveDataEnabled;
  const result = gridJulResultMock;

  const [keyword, setKeyword] = useState(result.scan.keyword);
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [radius, setRadius] = useState("1.5 km");
  const [run, setRun] = useState<"done" | "running">("done");
  /** Which result the finished run shows (grid vs teleport). */
  const [mode, setMode] = useState<"grid" | "teleport">("grid");
  const [view, setView] = useState<"map" | "table">("map");
  const [compare, setCompare] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!bizSelIsFixture) {
    return (
      <div className="flex max-w-[560px] flex-col items-start gap-2 rounded-card border-[1.5px] border-dashed border-[rgba(27,35,33,0.22)] bg-bg-surface px-6 py-7">
        <div
          title={bizSel.name}
          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold"
        >
          {bizSel.name}
        </div>
        <div className="text-[12.5px] leading-relaxed text-ink-soft">
          No grid scans yet for this business in the demo — full scan history
          lives on मनोवेध हिप्नोक्लिनिक.
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setBizSelId(auditReportMock.business.id)}
          >
            ← मनोवेध हिप्नोक्लिनिक
          </Button>
        </div>
      </div>
    );
  }

  const runScan = () => {
    setRun("running");
    timer.current = setTimeout(() => {
      setMode(gridSize === 1 ? "teleport" : "grid");
      setRun("done");
      toast("Scan complete — saved to history");
    }, 2300);
  };

  const pointCount = gridSize === 1 ? 1 : gridSize * gridSize;

  return (
    <section className="flex flex-col gap-[14px]">
      {/* Controls */}
      <Card className="flex flex-wrap items-end gap-[18px] px-5 py-4">
        <div className="min-w-[180px] flex-[1.2]">
          <div className={CAPTION}>Keyword</div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-[13px] py-[10px] text-[13.5px] outline-brand"
          />
        </div>
        <div>
          <div className={CAPTION}>Grid</div>
          <div className="flex flex-wrap gap-[6px]">
            {GRID_LABELS.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setGridSize(g.size)}
                className={CHIP_BTN(gridSize === g.size)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={CAPTION}>Radius</div>
          <div className="flex flex-wrap gap-[6px]">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={CHIP_BTN(radius === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {capHit ? (
          <button
            disabled
            title="Daily cap reached — resumes tomorrow"
            className="cursor-not-allowed rounded-[9px] bg-[#E5E1D8] px-5 py-[11px] text-[13.5px] font-bold text-ink-faint"
          >
            Scan paused
          </button>
        ) : liveBlocked ? (
          <div>
            <button
              disabled
              title="DataForSEO live data is off — enable it in Settings"
              className="cursor-not-allowed rounded-[9px] border border-[#C9D2DB] bg-[#EEF1F4] px-5 py-[11px] text-[13.5px] font-bold text-[#8697A6]"
            >
              Run scan
            </button>
            <LiveDataOffNote className="mt-[5px]" />
          </div>
        ) : (
          <button
            type="button"
            onClick={runScan}
            className="rounded-[9px] bg-brand px-5 py-[11px] text-[13.5px] font-bold text-white hover:bg-brand-hover"
          >
            Run scan · <span className="font-mono">₹{gridCostInr[gridSize]}</span>
          </button>
        )}
      </Card>

      {run === "running" && (
        <Card className="flex flex-col items-center gap-3 p-[26px]">
          <div className="h-9 w-9 animate-[spin_0.8s_linear_infinite] rounded-full border-[3.5px] border-[#EDEAE3] border-t-brand" />
          <div className="text-[14px] font-semibold">
            Querying {pointCount} grid point{pointCount > 1 ? "s" : ""} for
            &quot;{keyword}&quot;…
          </div>
          <div className="text-[12.5px] text-ink-soft">
            ~2–5 min on a real scan · results save to history automatically
          </div>
        </Card>
      )}

      {run === "done" && mode === "teleport" && (
        <>
          <div className="flex flex-wrap items-stretch gap-[14px]">
            <Card className="min-w-[300px] flex-1 p-4">
              <TeleportMap result={teleportResultMock} />
              <div className="mt-[10px] text-center text-[12px] text-ink-soft">
                Distance between business and dropped pin:{" "}
                <span className="font-mono font-bold text-ink">
                  {teleportResultMock.distance_km.toFixed(2)} km
                </span>
              </div>
            </Card>
            <Card className="min-w-[300px] flex-[1.2] px-5 py-4">
              <div className="mb-[6px] flex flex-wrap items-baseline justify-between gap-[10px]">
                <div className="text-[14.5px] font-bold">
                  Top 10 at this point
                </div>
                <span className="font-mono text-[11px] text-ink-faint">
                  {teleportResultMock.point.lat.toFixed(4)},{" "}
                  {teleportResultMock.point.lng.toFixed(4)} ·{" "}
                  {teleportAreaNoteMock}
                </span>
              </div>
              {teleportResultMock.top10.map((t) => (
                <div
                  key={t.position}
                  className={cn(
                    "-mx-2 flex items-center gap-[9px] border-t border-[rgba(27,35,33,0.07)] px-2 py-[7px]",
                    t.is_target && "rounded-lg bg-[#F0F5F2]",
                  )}
                >
                  <span
                    className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full font-mono text-[11px] font-bold text-white"
                    style={{
                      background:
                        t.position === 1
                          ? "#177B4B"
                          : t.position < 4
                            ? "#4C9B6E"
                            : "#C77D00",
                    }}
                  >
                    {t.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold">
                      {t.is_target ? "★ " : ""}
                      {t.name}
                    </div>
                    <div className="text-[11px] text-ink-soft">
                      {teleportAreasMock[t.name]}
                    </div>
                  </div>
                  {t.is_target && (
                    <span className="flex-none rounded bg-bg-nav px-[7px] py-[2px] text-[9.5px] font-bold tracking-[0.6px] text-white">
                      TARGET
                    </span>
                  )}
                </div>
              ))}
              <div className="mt-[10px] text-[11.5px] text-ink-faint">
                Teleport checks one exact lat/lng — anywhere in the world, any
                keyword.
              </div>
            </Card>
          </div>
          <div className="flex flex-wrap items-stretch gap-[14px]">
            <Card className="min-w-[260px] flex-1 px-4 py-[14px]">
              <div className="mb-[10px] flex flex-wrap items-start gap-[22px]">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
                    Grid avg (5×5)
                  </div>
                  <div className="mt-[3px] flex items-baseline gap-2">
                    <span className="font-mono text-[22px] font-semibold">
                      {result.scan.avg_rank?.toFixed(1)}
                    </span>
                    <span className="rounded-chip bg-band-good-bg px-2 py-[2px] text-[11px] font-bold text-band-good">
                      ▲ +{Math.abs(gridCompareMock.avg_rank_delta).toFixed(1)}{" "}
                      vs May
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
                    In top 3
                  </div>
                  <div className="mt-[3px] font-mono text-[22px] font-semibold">
                    {result.in_top3_pct}%
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-band-warn-bg px-[10px] py-2 text-[12px] leading-normal text-ink">
                <span className="font-bold text-band-warn">
                  Weak to the south-east
                </span>{" "}
                (Malkapur side) — ranks 9–14 beyond 1 km.
              </div>
            </Card>
            <Card className="min-w-[260px] flex-1 px-4 py-[14px]">
              <div className="mb-[6px] text-[11px] font-bold uppercase tracking-[0.8px] text-brand">
                Rank ≠ demand
              </div>
              <div className="text-[12.5px] leading-relaxed">
                &quot;{keywordDemandMock[0].keyword}&quot; ≈{" "}
                <span className="font-mono font-semibold">
                  {keywordDemandMock[0].volume}
                </span>{" "}
                searches/mo · &quot;{keywordDemandMock[1].keyword}&quot; ≈{" "}
                <span className="font-mono font-semibold">
                  {keywordDemandMock[1].volume}
                </span>{" "}
                — teleport the money keyword too.
              </div>
              {capHit ? (
                <button
                  disabled
                  className="mt-[9px] cursor-not-allowed rounded-[7px] border-[1.5px] border-[rgba(27,35,33,0.10)] bg-bg-app px-[13px] py-[7px] text-[12px] font-semibold text-ink-faint"
                >
                  Paused — cap reached
                </button>
              ) : liveBlocked ? (
                <button
                  disabled
                  title="DataForSEO live data is off — enable it in Settings"
                  className="mt-[9px] cursor-not-allowed rounded-[7px] border border-[#C9D2DB] bg-[#EEF1F4] px-[13px] py-[7px] text-[12px] font-semibold text-[#8697A6]"
                >
                  Live data off
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword(keywordDemandMock[1].keyword);
                    runScan();
                  }}
                  className="mt-[9px] rounded-[7px] border-[1.5px] border-brand bg-bg-surface px-[13px] py-[7px] text-[12px] font-semibold text-brand hover:bg-[#F0F5F2]"
                >
                  Check &quot;{keywordDemandMock[1].keyword}&quot; ·{" "}
                  <span className="font-mono">₹{gridCostInr[1]}</span>
                </button>
              )}
            </Card>
          </div>
        </>
      )}

      {run === "done" && mode === "grid" && (
        <>
          <div className="flex flex-wrap items-stretch gap-[14px]">
            {/* Map / table card */}
            <Card className="min-w-[300px] flex-[1.5] px-5 py-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-[10px]">
                <div className="text-[14.5px] font-bold">
                  &quot;{result.scan.keyword}&quot; —{" "}
                  {new Date(result.scan.created_at).toLocaleDateString(
                    "en-IN",
                    { day: "2-digit", month: "short", year: "numeric" },
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-[10px]">
                  <div className="font-mono text-[11.5px] text-ink-soft">
                    {result.scan.grid_size}×{result.scan.grid_size} ·{" "}
                    {(result.scan.radius_m / 1000).toFixed(1)} km
                  </div>
                  <div className="inline-flex overflow-hidden rounded-chip border-[1.5px] border-[rgba(27,35,33,0.14)]">
                    {(["map", "table"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setView(v)}
                        className={cn(
                          "border-none px-[14px] py-[6px] text-[12.5px] font-semibold capitalize",
                          view === v
                            ? "bg-brand text-white"
                            : "bg-bg-surface text-ink-soft",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {view === "map" ? (
                <GridMap
                  points={result.points}
                  center={{
                    lat: auditReportMock.business.lat ?? 0,
                    lng: auditReportMock.business.lng ?? 0,
                  }}
                  gridN={result.scan.grid_size}
                />
              ) : (
                <div className="overflow-hidden rounded-[10px] border border-[rgba(27,35,33,0.08)]">
                  <div className="grid grid-cols-[0.5fr_1.1fr_0.7fr_1.7fr] gap-[10px] bg-[#FAF8F4] px-[14px] py-[9px] text-[10px] font-semibold uppercase tracking-[0.7px] text-ink-soft">
                    <div>Pt</div>
                    <div>Position</div>
                    <div>Rank</div>
                    <div>Top business here</div>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {result.points.map((p, idx) => {
                      const ri = Math.floor(idx / result.scan.grid_size);
                      const ci = idx % result.scan.grid_size;
                      const center = ri === 2 && ci === 2;
                      const rank = p.rank ?? 21;
                      return (
                        <div
                          key={p.id}
                          className="grid grid-cols-[0.5fr_1.1fr_0.7fr_1.7fr] items-center gap-[10px] border-t border-[rgba(27,35,33,0.06)] px-[14px] py-2"
                        >
                          <span className="font-mono text-[11.5px] text-ink-soft">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-[11.5px]">
                            {center
                              ? "center"
                              : `${pointDistanceKm(ri, ci).toFixed(1)} km ${pointDirection(ri, ci)}`}
                          </span>
                          <span>
                            <span
                              className={cn(
                                "rounded-chip px-[9px] py-[2px] font-mono text-[11.5px] font-bold",
                                rankBandClasses(rank),
                              )}
                            >
                              {p.rank === null ? "20+" : `#${p.rank}`}
                            </span>
                          </span>
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px]">
                            {rank === 1
                              ? "मनोवेध हिप्नोक्लिनिक ★"
                              : (ri + ci) % 2
                                ? "Avani Hypnotism & Wellness"
                                : "Hypnotherapy Siddhivinayak"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {(
                  [
                    ["1–3", "#177B4B"],
                    ["4–10", "#C77D00"],
                    ["11–19", "#B3372B"],
                    ["20+", "#8A928D"],
                  ] as const
                ).map(([label, color]) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-[6px] text-[11.5px] text-ink-soft"
                  >
                    <span
                      className="h-[11px] w-[11px] rounded-full"
                      style={{ background: color }}
                    />
                    {label}
                  </span>
                ))}
                <span className="text-[11px] text-ink-faint">
                  · tap a dot for the rank there
                </span>
              </div>
            </Card>

            {/* Stats column */}
            <div className="flex min-w-[250px] flex-1 flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Card className="px-4 py-[14px]">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
                    Avg rank
                  </div>
                  <div className="mb-[2px] mt-1 font-mono text-[26px] font-semibold">
                    {result.scan.avg_rank?.toFixed(1)}
                  </div>
                  <span className="rounded-chip bg-band-good-bg px-2 py-[2px] text-[11px] font-bold text-band-good">
                    ▲ +{Math.abs(gridCompareMock.avg_rank_delta).toFixed(1)} vs
                    May
                  </span>
                </Card>
                <Card className="px-4 py-[14px]">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
                    In top 3
                  </div>
                  <div className="mb-[6px] mt-1 font-mono text-[26px] font-semibold">
                    {result.in_top3_pct}%
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-[3px] bg-[#EDEAE3]">
                    <div
                      className="h-full rounded-[3px] bg-band-good"
                      style={{ width: `${result.in_top3_pct}%` }}
                    />
                  </div>
                </Card>
              </div>
              <div className="rounded-card bg-band-warn-bg px-[15px] py-[13px] text-[12.5px] leading-relaxed text-ink">
                <span className="font-bold text-band-warn">
                  Weak to the {result.weak_direction?.split(" (")[0]}
                </span>{" "}
                (Malkapur side) — ranks 9–14 beyond 1 km. Consider a location
                page + citations for that area.
              </div>
              <Card className="px-[15px] py-[13px]">
                <div className="mb-[6px] text-[11px] font-bold uppercase tracking-[0.8px] text-brand">
                  Rank ≠ demand
                </div>
                <div className="text-[12.5px] leading-relaxed">
                  &quot;{keywordDemandMock[0].keyword}&quot; ≈{" "}
                  <span className="font-mono font-semibold">
                    {keywordDemandMock[0].volume}
                  </span>{" "}
                  searches/mo · &quot;{keywordDemandMock[1].keyword}&quot; ≈{" "}
                  <span className="font-mono font-semibold">
                    {keywordDemandMock[1].volume}
                  </span>{" "}
                  — scan the money keyword too.
                </div>
                {!capHit &&
                  (liveBlocked ? (
                    <button
                      disabled
                      title="DataForSEO live data is off — enable it in Settings"
                      className="mt-[9px] cursor-not-allowed rounded-[7px] border border-[#C9D2DB] bg-[#EEF1F4] px-[13px] py-[7px] text-[12px] font-semibold text-[#8697A6]"
                    >
                      Live data off
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword(keywordDemandMock[1].keyword);
                        runScan();
                      }}
                      className="mt-[9px] rounded-[7px] border-[1.5px] border-brand bg-bg-surface px-[13px] py-[7px] text-[12px] font-semibold text-brand hover:bg-[#F0F5F2]"
                    >
                      Scan &quot;{keywordDemandMock[1].keyword}&quot; ·{" "}
                      <span className="font-mono">₹{gridCostInr[5]}</span>
                    </button>
                  ))}
              </Card>
            </div>
          </div>

          {/* Who owns this area */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-[10px] px-4 py-[14px]">
              <div className="text-[14.5px] font-bold">Who owns this area</div>
              <span className="text-[11px] text-ink-faint">
                every business seen across the {pointCount} grid points
              </span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[0.3fr_2fr_0.8fr_0.9fr_0.8fr_0.7fr_0.8fr] gap-[10px] bg-[#FAF8F4] px-4 py-[9px] text-[10px] font-semibold uppercase tracking-[0.7px] text-ink-soft">
                  <div>#</div>
                  <div>Business</div>
                  <div>Avg rank</div>
                  <div>Best / worst</div>
                  <div>In top-3 at</div>
                  <div>Distance</div>
                  <div />
                </div>
                {result.ownership.map((o, i) => (
                  <div
                    key={o.name}
                    className={cn(
                      "grid grid-cols-[0.3fr_2fr_0.8fr_0.9fr_0.8fr_0.7fr_0.8fr] items-center gap-[10px] border-t border-[rgba(27,35,33,0.07)] px-4 py-[10px] text-[12.5px]",
                      o.is_target && "bg-[#F0F5F2]",
                    )}
                  >
                    <span className="font-mono text-[11.5px] text-ink-soft">
                      {i + 1}
                    </span>
                    <span
                      title={o.name}
                      className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                    >
                      {o.name}
                      {o.is_target && (
                        <span className="ml-[7px] rounded bg-bg-nav px-[6px] py-[2px] text-[9px] font-bold tracking-[0.6px] text-white">
                          TARGET
                        </span>
                      )}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "rounded-chip px-[9px] py-[2px] font-mono text-[12px] font-bold",
                          rankBandClasses(o.avg_rank),
                        )}
                      >
                        {o.avg_rank.toFixed(1)}
                      </span>
                    </span>
                    <span className="font-mono text-[11.5px]">
                      #{o.best_rank} / {o.worst_rank > 19 ? "#20+" : `#${o.worst_rank}`}
                    </span>
                    <span className="font-mono text-[11.5px]">
                      {o.top3_count}/{pointCount}
                    </span>
                    <span className="font-mono text-[11.5px] text-ink-soft">
                      {o.distance_km !== null
                        ? `${o.distance_km.toFixed(1)} km`
                        : "—"}
                    </span>
                    <span>
                      {!o.is_target && (
                        <button
                          type="button"
                          onClick={() => {
                            router.push("/competitors");
                            toast("Opened Competitor Compare");
                          }}
                          className="whitespace-nowrap text-[12px] font-semibold text-brand hover:text-brand-hover"
                        >
                          Compare →
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Scan history + before/after compare */}
      {run === "done" && (
        <Card className="px-5 py-4">
          <div className="mb-[10px] flex flex-wrap items-center justify-between gap-[10px]">
            <div className="flex items-baseline gap-[10px]">
              <div className="text-[14.5px] font-bold">
                Scan history · मनोवेध
              </div>
              <span className="rounded-chip bg-band-good-bg px-[9px] py-[3px] text-[11px] font-bold text-band-good">
                +{Math.abs(gridCompareMock.avg_rank_delta).toFixed(1)} in 2
                months
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCompare((c) => !c)}
              className="rounded-lg border-[1.5px] border-brand bg-bg-surface px-[14px] py-[7px] text-[12.5px] font-semibold text-brand hover:bg-[#F0F5F2]"
            >
              {compare ? "Hide compare" : "Compare before/after"}
            </button>
          </div>
          <div className="flex flex-col">
            {gridHistoryMock.map((h) => (
              <div
                key={h.date}
                className="flex flex-wrap items-center justify-between gap-[10px] border-t border-[rgba(27,35,33,0.07)] py-[9px]"
              >
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    !h.this_run && "text-ink-soft",
                  )}
                >
                  {h.date}
                  {h.this_run && (
                    <span className="ml-[6px] rounded bg-bg-app px-[7px] py-[2px] text-[10.5px] font-bold text-ink-soft">
                      THIS RUN
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "font-mono text-[12.5px]",
                    !h.this_run && "text-ink-soft",
                  )}
                >
                  avg{" "}
                  <span
                    className={cn(
                      "font-bold",
                      h.this_run && "text-band-good",
                    )}
                  >
                    {h.avg.toFixed(1)}
                  </span>{" "}
                  · top-3 {h.top3_pct}%
                </span>
              </div>
            ))}
          </div>

          {compare && (
            <div className="mt-[14px] border-t border-[rgba(27,35,33,0.08)] pt-[14px]">
              <div className="mb-[10px] text-[12px] text-ink-soft">
                Before / after — the proof artifact for the monthly client
                report.
              </div>
              <div className="flex flex-wrap items-center justify-center gap-[14px]">
                <div className="min-w-[220px] max-w-[300px] flex-1">
                  <div className="mb-[6px] text-center text-[12px] font-bold">
                    02 May · avg{" "}
                    <span className="text-band-crit">
                      {gridCompareMock.before.scan.avg_rank?.toFixed(1)}
                    </span>
                  </div>
                  <MiniGrid matrix={gridMayMatrix} />
                </div>
                <div className="flex-none text-[20px] font-bold text-band-good">
                  →
                </div>
                <div className="min-w-[220px] max-w-[300px] flex-1">
                  <div className="mb-[6px] text-center text-[12px] font-bold">
                    11 Jul · avg{" "}
                    <span className="text-band-good">
                      {gridCompareMock.after.scan.avg_rank?.toFixed(1)}
                    </span>
                  </div>
                  <MiniGrid matrix={gridJulMatrix} />
                </div>
              </div>
              <div className="mt-[14px] max-w-[620px]">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.7px] text-ink-soft">
                  Rank movement · May → Jul
                </div>
                {gridCompareMock.movement.map((m) => {
                  const improved = m.delta < 0;
                  return (
                    <div
                      key={m.name}
                      className="flex items-center gap-[10px] border-t border-[rgba(27,35,33,0.07)] py-[7px]"
                    >
                      <span
                        className={cn(
                          "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px]",
                          improved ? "font-bold" : "font-medium",
                        )}
                      >
                        {m.name}
                      </span>
                      <span className="whitespace-nowrap font-mono text-[12px] text-ink-soft">
                        {m.before_avg.toFixed(1)} →{" "}
                        <span className="font-bold text-ink">
                          {m.after_avg.toFixed(1)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex-none whitespace-nowrap rounded-chip px-2 py-[2px] text-[11px] font-bold",
                          improved
                            ? "bg-band-good-bg text-band-good"
                            : "bg-bg-app text-ink-soft",
                        )}
                      >
                        {improved
                          ? `▲ +${Math.abs(m.delta).toFixed(1)}`
                          : `▼ −${m.delta.toFixed(1)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
