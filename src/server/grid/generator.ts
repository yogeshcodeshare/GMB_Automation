import type { GridSize } from "@/types";

/** MS2-T01 — grid point generator. An n×n lattice centred on the business,
 * outermost ring at `radius_m` (same math as the seed: 5×5 @ 1500 m →
 * 750 m steps). Row-major from the north-west corner. */

const M_PER_DEG_LAT = 111_320;

export interface LatLng {
  lat: number;
  lng: number;
}

export function metersToDegrees(
  meters: number,
  atLatDeg: number
): { dLat: number; dLng: number } {
  return {
    dLat: meters / M_PER_DEG_LAT,
    dLng: meters / (M_PER_DEG_LAT * Math.cos((atLatDeg * Math.PI) / 180)),
  };
}

export function gridPoints(center: LatLng, size: GridSize, radiusM: number): LatLng[] {
  if (size === 1) return [{ ...center }];
  const half = (size - 1) / 2;
  const stepM = radiusM / half;
  const { dLat, dLng } = metersToDegrees(stepM, center.lat);
  const points: LatLng[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      points.push({
        lat: center.lat + (half - row) * dLat, // north first
        lng: center.lng + (col - half) * dLng, // west first
      });
    }
  }
  return points;
}
