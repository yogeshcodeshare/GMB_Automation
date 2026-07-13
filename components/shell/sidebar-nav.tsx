"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-config";

/** Grouped nav list — shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[10px] py-[14px]">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="px-3 pb-[6px] text-[10px] font-semibold uppercase tracking-[1.2px] text-nav-muted">
            {group.label}
          </div>
          <div className="flex flex-col gap-[2px]">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13.5px]",
                    active
                      ? "bg-white/10 font-semibold text-white"
                      : "font-medium text-nav-text hover:bg-white/[0.07]",
                  )}
                >
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.countBadge !== undefined && (
                    <span className="flex-none rounded-chip bg-brand-accent px-[7px] py-[2px] font-mono text-[10.5px] font-bold text-bg-nav">
                      {item.countBadge}
                    </span>
                  )}
                  {item.outlineBadge && (
                    <span className="flex-none rounded border border-[rgba(227,154,45,0.5)] px-[6px] py-[2px] text-[9px] font-bold tracking-[0.6px] text-[#E3A94D]">
                      {item.outlineBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Brand header (सा mark + wordmark) for sidebar + drawer. */
export function BrandHeader({
  size = "md",
  trailing,
}: {
  size?: "md" | "sm";
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[10px] border-b border-nav-line",
        size === "md" ? "px-4 pb-[14px] pt-[18px]" : "p-4",
      )}
    >
      <div
        className={cn(
          "flex flex-none items-center justify-center rounded-[9px] bg-brand-accent font-bold text-bg-nav",
          size === "md" ? "h-[34px] w-[34px] text-[16px]" : "h-8 w-8 rounded-lg text-[15px]",
        )}
      >
        सा
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-bold tracking-[0.2px] text-white">
          GMB सारथी
        </div>
        {size === "md" && (
          <div className="text-[10px] font-semibold tracking-[0.8px] text-nav-muted-2">
            AGENCY OPS · KARAD
          </div>
        )}
      </div>
      {trailing && (
        <>
          <div className="flex-1" />
          {trailing}
        </>
      )}
    </div>
  );
}

/** Account footer row — initial avatar + name/email, links to /account. */
export function AccountFooter({
  userName,
  userEmail,
  onNavigate,
}: {
  userName: string;
  userEmail: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/account"
      onClick={onNavigate}
      className="flex items-center gap-[10px] border-t border-nav-line px-4 py-3 hover:bg-white/5"
    >
      <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-white/[0.12] text-[13px] font-bold text-white">
        {userName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-semibold text-white">
          {userName}
        </div>
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10.5px] text-nav-muted-2">
          {userEmail}
        </div>
      </div>
      <span className="text-[12px] text-nav-muted">›</span>
    </Link>
  );
}
