"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        /** Green solid — the default action. */
        primary: "border-none bg-brand text-white hover:bg-brand-hover",
        /** Green outline. */
        secondary:
          "border-[1.5px] border-brand bg-bg-surface text-brand hover:bg-[#F0F5F2]",
        /** Grey outline. */
        ghost:
          "border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface text-ink hover:border-ink",
        /** Dark ink solid (P2 Search). */
        dark: "border-none bg-bg-nav text-white hover:bg-[#0E1714]",
        danger: "border-none bg-band-crit text-white hover:bg-[#9C2F25]",
        /** Marigold accent (public checker, festival). */
        accent:
          "border-none bg-brand-accent text-bg-nav hover:bg-brand-accent-hover",
      },
      size: {
        /** 13px — topbar, P3 action row. */
        sm: "rounded-lg px-4 py-[9px] text-[13px]",
        /** 13.5px — P2 Search. */
        md: "rounded-[10px] px-[22px] py-3 text-[13.5px]",
        /** 15px/700 — P2 "Run audit →". */
        lg: "rounded-[10px] px-[26px] py-[13px] text-[15px] font-bold",
        /** Full-width mobile primary (P1 "+ New Audit"). */
        full: "w-full rounded-[10px] p-[13px] text-[14.5px]",
        /** 12.5px compact (P2 Cancel, inline actions). */
        xs: "rounded-lg px-[15px] py-2 text-[12.5px]",
      },
    },
    defaultVariants: { variant: "primary", size: "sm" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** ₹ amount rendered in mono after the label — EVERY paid action shows it. */
  cost?: string;
  loading?: boolean;
}

/**
 * Handoff button recipe. Disabled state is always #E5E1D8 bg + #8A928D text
 * (cap-hit / gated actions) regardless of variant.
 */
export function Button({
  className,
  variant,
  size,
  cost,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size }),
        disabled &&
          "border-none bg-[#E5E1D8] text-ink-faint hover:bg-[#E5E1D8]",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="border-white/40 border-t-white" />}
      {children}
      {cost !== undefined && (
        <span className="font-mono">· {cost}</span>
      )}
    </button>
  );
}
