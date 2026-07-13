import { cn } from "@/lib/utils";
import { bandClasses } from "./band";

/**
 * Score pill — mono 700, pill radius, band bg/fg by score
 * (>70 green · 40–70 amber · <40 red).
 */
export function ScorePill({
  score,
  size = "md",
  className,
}: {
  score: number;
  /** md = table rows (12.5px) · sm = switcher dropdown (11.5px) */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center rounded-chip font-mono font-bold",
        size === "md" ? "px-[10px] py-[3px] text-[12.5px]" : "px-2 py-[2px] text-[11.5px]",
        bandClasses(score),
        className,
      )}
    >
      {score}
    </span>
  );
}
