"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * CR-1 — DataForSEO "live data off" blocked state. Deliberately NOT the
 * cap-hit red: a neutral slate/ink treatment with a "DEMO DATA" cue, so the
 * founder can tell "paid data is switched off" apart from "budget cap hit".
 */

/** Small chip for screen headers while running on demo data. */
export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] whitespace-nowrap rounded-chip border border-[rgba(27,35,33,0.14)] bg-[#EEF1F4] px-[9px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.5px] text-[#4A5A6A]",
        className,
      )}
    >
      <span className="h-[6px] w-[6px] rounded-full bg-[#6B7C8C]" />
      Demo data
    </span>
  );
}

/** Inline "Live data off — enable in Settings" note (slate, not red). */
export function LiveDataOffNote({
  className,
  align = "left",
}: {
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "text-[11.5px] font-medium text-[#4A5A6A]",
        align === "right" && "text-right",
        className,
      )}
    >
      Live data off —{" "}
      <Link
        href="/settings"
        className="font-semibold text-[#33566E] underline underline-offset-2 hover:text-[#1F3A4D]"
      >
        enable in Settings
      </Link>
    </div>
  );
}

/**
 * A paid DataForSEO action button that is disabled because live data is off.
 * Slate disabled fill (distinct from cap-hit's #E5E1D8 grey) + the off note.
 * `align` positions the note relative to the button (right for the P2/P5
 * cost-preview cards where the button is right-aligned).
 */
export function LiveDataBlockedButton({
  label,
  size = "md",
  align = "left",
  className,
}: {
  label: React.ReactNode;
  /** md = card CTA (matches Run audit) · sm = header/refresh buttons */
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  className?: string;
}) {
  const sizing =
    size === "lg"
      ? "rounded-[10px] px-[26px] py-[13px] text-[15px] font-bold"
      : size === "md"
        ? "rounded-[9px] px-5 py-[11px] text-[13.5px] font-bold"
        : "rounded-lg px-[14px] py-[7px] text-[12.5px] font-semibold";
  return (
    <div className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        disabled
        title="DataForSEO live data is off — enable it in Settings"
        className={cn(
          "cursor-not-allowed border border-[#C9D2DB] bg-[#EEF1F4] text-[#8697A6]",
          sizing,
        )}
      >
        {label}
      </button>
      <LiveDataOffNote className="mt-[5px]" align={align} />
    </div>
  );
}
