import { cn } from "@/lib/utils";

/** Loading shimmer block (handoff: shimmer 1.4s). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[#EDEAE3]",
        className,
      )}
    />
  );
}
