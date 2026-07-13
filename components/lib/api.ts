import type { ApiResponse } from "@/types";

/**
 * Endpoint go-live registry (Day-5 integration switchboard).
 *
 * `true` = the screen fetches the real route (mock fallback on any failure —
 * a flip is never fatal; rollback = flip back to false). Flip one at a time
 * per docs/agents/DAY5_INTEGRATION.md. Paid DataForSEO routes additionally
 * sit behind the CR-1 "live data" toggle server-side (LIVE_DATA_DISABLED).
 */
export const LIVE_ENDPOINTS: Record<string, boolean> = {
  // ₹0 / DB-only + Groq — Day-5 flips (LIVE, mock fallback on any failure):
  "/api/dashboard/stats": true, // (a) P1 KPIs
  "/api/businesses": true, //      (b) P1 table + switcher (seed rows)
  "/api/spend/today": true, //     (c) spend pill + cap banner
  "/api/reviews": true, //         (d) P6 inbox (DB reviews_cache)
  "/api/ai/generate": true, //     (e) P8 generate (Groq-only)
  "/api/audit": true, //           (f) P3 report read (seeded audit)
  // Paid / gated on DataForSEO verification (CR-1 deferred — stay OFF):
  "/api/businesses/resolve": false,
  "/api/posts-audit": false,
  // Wired (B3) but OFF until MAIN confirms: settings needs the
  // dataforseo_live_enabled migration; report/wa flips are MAIN's call
  // (FEATURE_PDF / WA keys). Flipping is the entire swap — callers are live.
  "/api/settings": false,
  "/api/report": false,
  "/api/wa/send": false,
  // EP-021/022 — backend lands them Day 6; P12 is wired, flip when merged:
  "/api/sprint": false,
};

function liveKey(path: string): string {
  const base = path.split("?")[0];
  // Most-specific (longest) key wins, so "/api/businesses" can't shadow the
  // deferred paid "/api/businesses/resolve" (both are registry keys).
  return (
    Object.keys(LIVE_ENDPOINTS)
      .filter((k) => base === k || base.startsWith(`${k}/`))
      .sort((a, b) => b.length - a.length)[0] ?? base
  );
}

export function isLive(path: string): boolean {
  return LIVE_ENDPOINTS[liveKey(path)] === true;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

/** CR-1: routes answering LIVE_DATA_DISABLED notify the app shell. */
type LiveDataDisabledHandler = (message: string) => void;
let onLiveDataDisabled: LiveDataDisabledHandler | null = null;
export function setLiveDataDisabledHandler(fn: LiveDataDisabledHandler | null) {
  onLiveDataDisabled = fn;
}

/**
 * Typed fetch over the ApiResponse envelope, exposing the error code
 * (CR-1 needs LIVE_DATA_DISABLED distinguishable from other failures).
 */
export async function apiFetchResult<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  if (!isLive(path)) {
    return { ok: false, code: "ENDPOINT_OFF", message: "Mock mode (registry)." };
  }
  try {
    const res = await fetch(path, init);
    const body = (await res.json()) as ApiResponse<T>;
    if (!body.ok) {
      console.warn(`[api] ${path} → ${body.error.code}: ${body.error.message}`);
      if ((body.error.code as string) === "LIVE_DATA_DISABLED") {
        onLiveDataDisabled?.(body.error.message);
      }
      return { ok: false, code: body.error.code, message: body.error.message };
    }
    return { ok: true, data: body.data };
  } catch (err) {
    console.warn(`[api] ${path} failed — using mock fallback.`, err);
    return { ok: false, code: "NETWORK", message: String(err) };
  }
}

/**
 * Returns null on ANY failure — callers fall back to their typed mock so
 * screens keep working error-free.
 */
export async function apiGet<T>(path: string): Promise<T | null> {
  const r = await apiFetchResult<T>(path);
  return r.ok ? r.data : null;
}

/** POST helper (EP-013 posts-audit, EP-005 ai/generate, EP-006 report…). */
export async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  const r = await apiPostResult<T>(path, body);
  return r.ok ? r.data : null;
}

/**
 * POST that keeps the error code — for flows that branch on the envelope
 * (EP-007 wa/send renders FEATURE_DISABLED as "WhatsApp arriving soon").
 */
export function apiPostResult<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return apiFetchResult<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
