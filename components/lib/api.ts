import type { ApiResponse } from "@/types";

/**
 * Endpoint go-live registry (Day-5 integration switchboard).
 *
 * Every entry stays `false` until MAIN/backend posts in HANDOFF that the
 * route is merged and live — then flipping it to `true` is the entire swap
 * for that endpoint (pages already call through this layer with typed mock
 * fallbacks). Client data policy: mocks remain the fallback so the UI never
 * breaks regardless of which data is behind it.
 */
export const LIVE_ENDPOINTS: Record<string, boolean> = {
  "/api/dashboard/stats": false,
  "/api/businesses/resolve": false,
  "/api/businesses": false,
  "/api/spend/today": false,
  "/api/reviews": false,
  "/api/posts-audit": false,
  "/api/ai/generate": false,
};

function liveKey(path: string): string {
  const base = path.split("?")[0];
  return (
    Object.keys(LIVE_ENDPOINTS).find(
      (k) => base === k || base.startsWith(`${k}/`),
    ) ?? base
  );
}

export function isLive(path: string): boolean {
  return LIVE_ENDPOINTS[liveKey(path)] === true;
}

/**
 * Typed fetch over the ApiResponse envelope. Returns null on ANY failure
 * (endpoint off, HTTP error, error envelope, network) — callers fall back
 * to their typed mock so screens keep working error-free.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  if (!isLive(path)) return null;
  try {
    const res = await fetch(path, init);
    const body = (await res.json()) as ApiResponse<T>;
    if (!body.ok) {
      console.warn(`[api] ${path} → ${body.error.code}: ${body.error.message}`);
      return null;
    }
    return body.data;
  } catch (err) {
    console.warn(`[api] ${path} failed — using mock fallback.`, err);
    return null;
  }
}

export function apiGet<T>(path: string): Promise<T | null> {
  return apiFetch<T>(path);
}

/** POST helper (EP-013 posts-audit, EP-005 ai/generate, …). */
export function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
