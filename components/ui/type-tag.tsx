import { cn } from "@/lib/utils";

/** Type tag — Client = solid ink pill · Prospect = 1.5px outline grey pill. */
export function TypeTag({
  isClient,
  size = "sm",
  className,
}: {
  isClient: boolean;
  /** sm = table rows (11px) · md = P3 header (11.5px) */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center rounded-chip font-semibold",
        size === "sm" ? "px-[9px] py-[3px] text-[11px]" : "px-[10px] py-1 text-[11.5px]",
        isClient
          ? "bg-bg-nav text-white"
          : "border-[1.5px] border-[rgba(27,35,33,0.2)] text-ink-soft",
        className,
      )}
    >
      {isClient ? "Client" : "Prospect"}
    </span>
  );
}
