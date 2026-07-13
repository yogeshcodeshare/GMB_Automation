"use client";

import { cn } from "@/lib/utils";

/**
 * Segmented control — pill group, 1.5px border, active = green solid
 * (handoff recipe; P2 options, P3 fixes language, P5 grid size…).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  /** Optional display override per option value. */
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-chip border-[1.5px] border-[rgba(27,35,33,0.14)]",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "border-none px-[14px] py-[6px] text-[12.5px] font-semibold",
            opt === value
              ? "bg-brand text-white"
              : "bg-bg-surface text-ink-soft hover:bg-[#FAF8F4]",
          )}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}
