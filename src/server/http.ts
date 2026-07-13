import { NextResponse } from "next/server";
import type { ApiResponse, ErrorCode } from "@/types";
import { SpendCapError } from "@/server/spend";
import { FeatureDisabledError, LiveDataDisabledError } from "@/server/errors";
import {
  DfsConfigError,
  DfsTimeoutError,
  DfsUpstreamError,
} from "@/server/dataforseo/client";

/** ApiResponse envelope helpers — every route returns exactly this shape
 * with the HTTP status mirroring the error code (API_CONTRACT.md §1). */

export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  SPEND_CAP_REACHED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  FEATURE_DISABLED: 503,
  LIVE_DATA_DISABLED: 503,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500,
};

export function ok<T>(data: T, status = 200): NextResponse {
  const body: ApiResponse<T> = { ok: true, data };
  return NextResponse.json(body, { status });
}

export function err(
  code: ErrorCode,
  message: string,
  details?: unknown
): NextResponse {
  const body: ApiResponse<never> = {
    ok: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return NextResponse.json(body, { status: STATUS_BY_CODE[code] });
}

/** Map thrown service errors to the envelope (spend cap, vendor, config). */
export function errFrom(e: unknown): NextResponse {
  if (e instanceof SpendCapError) return err(e.code, e.message);
  if (e instanceof FeatureDisabledError) return err(e.code, e.message);
  if (e instanceof LiveDataDisabledError) return err(e.code, e.message);
  if (e instanceof DfsConfigError) return err(e.code, e.message);
  if (e instanceof DfsTimeoutError) return err(e.code, e.message);
  if (e instanceof DfsUpstreamError) return err(e.code, e.message);
  return err("INTERNAL", e instanceof Error ? e.message : "Unexpected error");
}

/** Body parse that never throws — undefined means invalid/absent JSON. */
export async function readJson(req: Request): Promise<unknown | undefined> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
