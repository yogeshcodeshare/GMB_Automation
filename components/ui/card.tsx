import { cn } from "@/lib/utils";

/** White surface card — 1px line border, 12px radius (handoff recipe). */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-bg-surface",
        className,
      )}
      {...props}
    />
  );
}
