import { cn } from "@/lib/utils";
import type { RubricRowStatus } from "@/types";

const GLYPH: Record<RubricRowStatus, string> = {
  pass: "✓",
  warn: "!",
  fail: "✕",
};

const COLORS: Record<RubricRowStatus, string> = {
  pass: "bg-band-good-bg text-band-good",
  warn: "bg-band-warn-bg text-band-warn",
  fail: "bg-band-crit-bg text-band-crit",
};

/** 20px status circle — ✓ / ! / ✕ in band colors (rubric rows, checklists). */
export function StatusChip({
  status,
  className,
}: {
  status: RubricRowStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mt-[1px] flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold",
        COLORS[status],
        className,
      )}
    >
      {GLYPH[status]}
    </span>
  );
}
