"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { spendLabel } from "@/components/lib/format";
import { useAppState } from "./app-state";

/**
 * Spend pill (EP-012) — mono "₹6.20 / ₹95", red at cap, click → Settings.
 * `on="dark"` renders the mobile-header variant.
 */
export function SpendPill({ on = "light" }: { on?: "light" | "dark" }) {
  const { spend, capHit } = useAppState();
  return (
    <Link
      href="/settings"
      title="Data spend today vs daily cap — open Settings"
      className={cn(
        "whitespace-nowrap rounded-chip border px-[10px] py-1 font-mono text-[11.5px] font-semibold",
        on === "light"
          ? cn(
              "border-[rgba(27,35,33,0.12)] bg-bg-app hover:border-brand",
              capHit ? "text-band-crit" : "text-ink",
            )
          : cn(
              "border-white/[0.14] bg-white/10",
              capHit ? "text-[#F0B9B2]" : "text-white",
            ),
      )}
    >
      {spendLabel(spend)}
    </Link>
  );
}
