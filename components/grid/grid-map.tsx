"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GridPoint } from "@/types";
import {
  pointDirection,
  pointDistanceKm,
  top5AtPoint,
} from "@/components/mocks/grid";

/** Band color by rank — 1–3 good · 4–10 amber · 11–19 red · 20+ (null) grey. */
function pinColor(rank: number | null): string {
  if (rank === null) return "#8A928D";
  if (rank <= 3) return "#177B4B";
  if (rank <= 10) return "#C77D00";
  if (rank <= 19) return "#B3372B";
  return "#8A928D";
}

/**
 * Real Leaflet + OSM rank map (ADR-003 — never Google Maps JS).
 * Rendered client-only via next/dynamic (Leaflet touches `window`).
 */
export default function GridMap({
  points,
  center,
  gridN,
  targetName,
}: {
  points: GridPoint[];
  center: { lat: number; lng: number };
  /** Grid dimension (5 for 5×5) — used for popover distance/direction. */
  gridN: number;
  /** The audited business — highlighted in the top-5 popup (sweep fix:
   *  was a hardcoded name literal inside the component). */
  targetName: string;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom={false}
      className="z-0 h-[420px] w-full rounded-[10px] border border-[rgba(27,35,33,0.08)]"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
      />
      {points.map((p, idx) => {
        const ri = Math.floor(idx / gridN);
        const ci = idx % gridN;
        const isTarget = ri === (gridN - 1) / 2 && ci === (gridN - 1) / 2;
        const rankLabel = p.rank === null ? "20+" : `#${p.rank}`;
        const dist = pointDistanceKm(ri, ci);
        const dir = pointDirection(ri, ci);
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={isTarget ? 12 : 9}
            pathOptions={{
              color: isTarget ? "#14201C" : "#FFFFFF",
              weight: isTarget ? 3 : 2,
              fillColor: pinColor(p.rank),
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="min-w-[190px] font-sans">
                <div className="text-[12.5px] font-bold">
                  Rank {rankLabel} at this point
                </div>
                <div className="mb-[7px] text-[10.5px] text-ink-soft">
                  {isTarget
                    ? "At the business pin"
                    : `${dist.toFixed(1)} km ${dir} of the business`}
                </div>
                <div className="mb-[2px] text-[9.5px] font-bold uppercase tracking-[0.7px] text-ink-soft">
                  Top 5 here
                </div>
                {top5AtPoint(p.rank ?? 21).map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-[6px] border-t border-[rgba(27,35,33,0.06)] py-1"
                  >
                    <span className="w-[15px] flex-none font-mono text-[10.5px] font-bold text-ink-soft">
                      {i + 1}.
                    </span>
                    <span
                      className={
                        name === targetName
                          ? "min-w-0 flex-1 truncate text-[11.5px] font-bold text-brand"
                          : "min-w-0 flex-1 truncate text-[11.5px]"
                      }
                    >
                      {name === targetName ? "★ " : ""}
                      {name}
                    </span>
                  </div>
                ))}
                {(p.rank ?? 21) > 5 && (
                  <div className="mt-[6px] text-[10.5px] font-semibold text-band-warn">
                    We rank {p.rank === null ? "#20+" : `#${p.rank}`} here —
                    outside the top 5
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
