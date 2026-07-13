"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { longDate } from "@/components/lib/format";
import { useAppState } from "./app-state";
import { BizSwitcher } from "./biz-switcher";
import { isWorkspaceRoute, titleFor } from "./nav-config";
import { AccountFooter, BrandHeader, SidebarNav } from "./sidebar-nav";
import { SpendPill } from "./spend-pill";
import "./shell.css";

/**
 * App chrome for every internal screen: cap-hit banner, 230px dark sidebar
 * (≥920px), mobile header + drawer (<920px), 58px top bar, scroll container.
 */
export function AppShell({
  children,
  pathnameOverride,
}: {
  children: React.ReactNode;
  /** Dev-preview only (/public/dev): title + switcher follow this path. */
  pathnameOverride?: string;
}) {
  const { capHit, capPreview, setCapPreview, userName, userEmail } =
    useAppState();
  const realPathname = usePathname();
  const pathname = pathnameOverride ?? realPathname;
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {capHit && (
        <div className="flex flex-none flex-wrap items-center justify-center gap-2 bg-band-crit px-4 py-[9px] text-center text-[13px] text-white">
          <span className="font-bold">Daily spend cap reached.</span>
          <span>
            External data calls are paused until tomorrow — saved reports
            remain available.
          </span>
          <Link href="/settings" className="font-semibold text-white underline">
            Adjust cap
          </Link>
          {capPreview && (
            <button
              type="button"
              onClick={() => setCapPreview(false)}
              className="font-semibold underline opacity-85"
            >
              Exit preview
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar (≥920px) */}
        <aside className="hidden w-[230px] flex-none flex-col bg-bg-nav text-[#E8ECE9] min-[920px]:flex">
          <BrandHeader />
          <SidebarNav />
          <AccountFooter userName={userName} userEmail={userEmail} />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Mobile header (<920px) */}
          <header className="flex h-[54px] flex-none items-center gap-3 bg-bg-nav px-[14px] text-white min-[920px]:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setNavOpen(true)}
              className="flex h-9 w-9 flex-col justify-center gap-1 p-2"
            >
              <span className="h-[2px] rounded-[1px] bg-[#E8ECE9]" />
              <span className="h-[2px] rounded-[1px] bg-[#E8ECE9]" />
              <span className="h-[2px] rounded-[1px] bg-[#E8ECE9]" />
            </button>
            <div className="text-[15px] font-bold">GMB सारथी</div>
            <div className="flex-1" />
            <SpendPill on="dark" />
          </header>

          {/* Mobile drawer */}
          {navOpen && (
            <div className="fixed inset-0 z-[300] flex min-[920px]:hidden">
              <div className="flex w-[270px] min-w-0 flex-col bg-bg-nav text-[#E8ECE9] animate-in fade-in slide-in-from-left-2 duration-150">
                <BrandHeader
                  size="sm"
                  trailing={
                    <button
                      type="button"
                      aria-label="Close menu"
                      onClick={closeNav}
                      className="px-2 py-1 text-[18px] text-[#9FAFA7]"
                    >
                      ✕
                    </button>
                  }
                />
                <SidebarNav onNavigate={closeNav} />
                <AccountFooter
                  userName={userName}
                  userEmail={userEmail}
                  onNavigate={closeNav}
                />
              </div>
              <div
                className="flex-1 bg-[rgba(15,20,18,0.55)]"
                onClick={closeNav}
              />
            </div>
          )}

          {/* Desktop top bar (≥920px) */}
          <header className="hidden h-[58px] flex-none items-center gap-[14px] border-b border-line bg-bg-surface px-6 min-[920px]:flex">
            <div className="text-[16px] font-bold">{titleFor(pathname)}</div>
            {isWorkspaceRoute(pathname) && <BizSwitcher />}
            <div className="flex-1" />
            <SpendPill />
            <div
              className="text-[12px] text-ink-soft"
              suppressHydrationWarning
            >
              {longDate(new Date())}
            </div>
            {capHit ? (
              <Button
                disabled
                title="Daily cap reached — new audits resume tomorrow"
              >
                + New Audit
              </Button>
            ) : (
              <Button onClick={() => router.push("/audits/new")}>
                + New Audit
              </Button>
            )}
          </header>

          <div id="main-scroll" className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-content flex-col gap-4 p-[clamp(14px,3vw,28px)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
