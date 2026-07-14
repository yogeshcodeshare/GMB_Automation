"use client";

import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { TeleportResult } from "@/types";

/** Teleport mode — one dropped pin with its rank bubble (Leaflet + OSM). */
export default function TeleportMap({ result }: { result: TeleportResult }) {
  const { point, scan } = result;
  return (
    <MapContainer
      center={[point.lat, point.lng]}
      zoom={15}
      scrollWheelZoom={false}
      className="z-0 h-[340px] w-full rounded-[10px] border border-[rgba(27,35,33,0.08)]"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
      />
      <CircleMarker
        center={[point.lat, point.lng]}
        radius={14}
        pathOptions={{
          color: "#14201C",
          weight: 3,
          fillColor: "#177B4B",
          fillOpacity: 1,
        }}
      >
        <Tooltip permanent direction="top" offset={[0, -16]}>
          <span className="font-sans text-[11.5px] font-semibold">
            Rank #{point.rank} for &quot;{scan.keyword}&quot;
          </span>
        </Tooltip>
        <Popup>
          <span className="font-sans text-[12px]">
            {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
          </span>
        </Popup>
      </CircleMarker>
    </MapContainer>
  );
}
