"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/components/lib/api";
import type { MockQueryResult, MockQueryStatus } from "./use-mock-query";

/**
 * Day-5 swap target: `useMockQuery(fixture)` becomes
 * `useApiGet(path, fixture)` — same result shape, live data when the
 * endpoint is flipped on in LIVE_ENDPOINTS, typed mock fallback otherwise
 * (including `?mock=` state forcing, which keeps working after the swap).
 * Pass `post` for POST-shaped reads (EP-013 posts-audit).
 */
export function useApiGet<T>(
  path: string,
  fallback: T,
  {
    // UAT-3: keep the mock-fallback skeleton flash short — 100ms reads as
    // instant while still avoiding a hard content pop.
    delayMs = 100,
    post,
    emptyValue,
    allowEmptyLive = false,
  }: {
    delayMs?: number;
    post?: Record<string, unknown>;
    /** What `?mock=empty` resolves to for non-array fixtures. */
    emptyValue?: T;
    /**
     * By default a successful-but-EMPTY live array falls back to the mock
     * (white-screen protection for every array endpoint — demo phase).
     * Set true for endpoints where a real empty list is a legitimate state
     * (post-flush go-live flips this per screen).
     */
    allowEmptyLive?: boolean;
  } = {},
): MockQueryResult<T> & { source: "live" | "mock" } {
  const [state, setState] = useState<{
    status: MockQueryStatus;
    data: T | null;
    error: string | null;
    source: "live" | "mock";
  }>({ status: "loading", data: null, error: null, source: "mock" });
  const [attempt, setAttempt] = useState(0);
  // Stable key for the POST body so the effect refetches when it changes.
  const postKey = post ? JSON.stringify(post) : "";

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading", data: null, error: null }));
    const mock =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("mock");
    if (mock === "loading") return;

    void (async () => {
      const fetched = post
        ? await apiPost<T>(path, post)
        : await apiGet<T>(path);
      // Empty live array → mock fallback unless opted out (MAIN's Day-6 ask:
      // generalize the businesses guard so every array endpoint is protected).
      const live =
        !allowEmptyLive && Array.isArray(fetched) && fetched.length === 0
          ? null
          : fetched;
      const settle = () => {
        if (cancelled) return;
        if (live !== null) {
          setState({ status: "ready", data: live, error: null, source: "live" });
        } else if (mock === "error" && attempt === 0) {
          setState({
            status: "error",
            data: null,
            error:
              "Could not reach the server — check the connection and retry.",
            source: "mock",
          });
        } else if (mock === "empty" && (emptyValue !== undefined || Array.isArray(fallback))) {
          setState({
            status: "ready",
            data: emptyValue ?? ([] as T),
            error: null,
            source: "mock",
          });
        } else {
          setState({ status: "ready", data: fallback, error: null, source: "mock" });
        }
      };
      // Keep the skeleton visible long enough to be real (mock phase).
      setTimeout(settle, live !== null ? 0 : delayMs);
    })();

    return () => {
      cancelled = true;
    };
    // `postKey` (below) tracks the request body so POST-shaped reads refetch
    // when it changes (the body carries business_id, not the path).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, path, delayMs, postKey]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { ...state, retry };
}
