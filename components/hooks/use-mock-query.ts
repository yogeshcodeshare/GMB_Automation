"use client";

import { useCallback, useEffect, useState } from "react";

export type MockQueryStatus = "loading" | "error" | "ready";

export interface MockQueryResult<T> {
  status: MockQueryStatus;
  data: T | null;
  /** Human message for the error card. */
  error: string | null;
  retry: () => void;
}

/**
 * Mock-phase stand-in for the Day-5 React-Query wiring. Resolves the given
 * fixture after a short delay so skeletons are real, and honors a `?mock=`
 * URL param to force each state (definition of done: all states reachable):
 *   ?mock=loading — stays on the skeleton
 *   ?mock=error   — error card with retry
 *   ?mock=empty   — resolves [] for array fixtures
 */
export function useMockQuery<T>(
  fixture: T,
  { delayMs = 500 }: { delayMs?: number } = {},
): MockQueryResult<T> {
  const [state, setState] = useState<{
    status: MockQueryStatus;
    data: T | null;
    error: string | null;
  }>({ status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState({ status: "loading", data: null, error: null });
    const mock =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("mock");
    if (mock === "loading") return;
    const t = setTimeout(() => {
      if (mock === "error" && attempt === 0) {
        setState({
          status: "error",
          data: null,
          error: "Could not reach the server — check the connection and retry.",
        });
      } else if (mock === "empty" && Array.isArray(fixture)) {
        setState({ status: "ready", data: [] as T, error: null });
      } else {
        setState({ status: "ready", data: fixture, error: null });
      }
    }, delayMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, delayMs]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { ...state, retry };
}
