"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { AppStateProvider } from "@/components/shell/app-state";
import { ToastProvider } from "@/components/ui/toast";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import NewAuditPage from "@/app/(dashboard)/audits/new/page";
import ReportPage from "@/app/(dashboard)/report/page";
import CompetitorsPage from "@/app/(dashboard)/competitors/page";
import WebsiteAuditPage from "@/app/(dashboard)/website/page";
import ReviewInboxPage from "@/app/(dashboard)/reviews/page";
import GridPage from "@/app/(dashboard)/grid/page";
import PostAuditPage from "@/app/(dashboard)/posts/page";
import AiToolsPage from "@/app/(dashboard)/ai-tools/page";

const SCREENS: Record<string, { path: string; render: () => JSX.Element }> = {
  p1: { path: "/dashboard", render: () => <DashboardPage /> },
  p2: { path: "/audits/new", render: () => <NewAuditPage /> },
  p3: { path: "/report", render: () => <ReportPage /> },
  p4: { path: "/competitors", render: () => <CompetitorsPage /> },
  p3b: { path: "/website", render: () => <WebsiteAuditPage /> },
  p6: { path: "/reviews", render: () => <ReviewInboxPage /> },
  p5: { path: "/grid", render: () => <GridPage /> },
  p7: { path: "/posts", render: () => <PostAuditPage /> },
  p8: { path: "/ai-tools", render: () => <AiToolsPage /> },
};

/**
 * Mounts the shell + a mock-driven screen for visual verification.
 * Pick the screen with ?screen=p1|p2 (default p1).
 */
export function DevPreview() {
  const [screen, setScreen] = useState("p1");
  const [cap, setCap] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("screen");
    if (s && SCREENS[s]) setScreen(s);
    setCap(params.get("cap") === "1");
  }, []);
  const { path, render } = SCREENS[screen];

  return (
    <AppStateProvider key={String(cap)} initialCapPreview={cap}>
      <ToastProvider>
        <AppShell pathnameOverride={path}>{render()}</AppShell>
        {/* Dev-only in-place screen switcher — keeps AppState alive so
            cross-screen flows (Category Finder → P3) are verifiable. */}
        <select
          value={screen}
          onChange={(e) => setScreen(e.target.value)}
          aria-label="Dev preview screen"
          className="fixed bottom-3 right-3 z-[700] rounded-lg border border-line bg-bg-surface px-2 py-1 font-mono text-[11px] shadow-toast"
        >
          {Object.keys(SCREENS).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </ToastProvider>
    </AppStateProvider>
  );
}
