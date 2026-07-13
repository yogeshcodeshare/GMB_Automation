"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { AppStateProvider } from "@/components/shell/app-state";
import { ToastProvider } from "@/components/ui/toast";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import NewAuditPage from "@/app/(dashboard)/audits/new/page";

const SCREENS: Record<string, { path: string; render: () => JSX.Element }> = {
  p1: { path: "/dashboard", render: () => <DashboardPage /> },
  p2: { path: "/audits/new", render: () => <NewAuditPage /> },
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
      </ToastProvider>
    </AppStateProvider>
  );
}
