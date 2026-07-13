import { cn } from "@/lib/utils";

/** 13px spinner — 2px ring, brand top (handoff: spin 0.8s linear). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-[13px] w-[13px] flex-none animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-[#EDEAE3] border-t-brand",
        className,
      )}
    />
  );
}
