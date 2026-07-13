import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types";

export const CONN_META: Record<
  ConnectionStatus,
  { glyph: string; label: string; glyphClass: string; chipClass: string }
> = {
  oauth: {
    glyph: "●",
    label: "Connected",
    glyphClass: "text-band-good",
    chipClass: "bg-band-good-bg text-band-good",
  },
  manager: {
    glyph: "○",
    label: "Manager access",
    glyphClass: "text-band-warn",
    chipClass: "bg-band-warn-bg text-band-warn",
  },
  none: {
    glyph: "–",
    label: "Not connected",
    glyphClass: "text-ink-faint",
    chipClass: "bg-[#EDEAE3] text-ink-soft",
  },
};

const TITLE: Record<ConnectionStatus, string> = {
  oauth: "Connected (OAuth)",
  manager: "Manager access",
  none: "Not connected",
};

/** Bare ● / ○ / – connection glyph (P1 table, switcher dropdown). */
export function ConnGlyph({
  status,
  className,
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  const m = CONN_META[status];
  return (
    <span
      title={TITLE[status]}
      className={cn(
        "flex-none text-[11px] font-bold",
        m.glyphClass,
        className,
      )}
    >
      {m.glyph}
    </span>
  );
}

/** "● Connected" chip — topbar (sm) and P3 header (md). */
export function ConnChip({
  status,
  size = "md",
  className,
}: {
  status: ConnectionStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const m = CONN_META[status];
  return (
    <span
      title={
        status === "none" ? "Publishing requires client OAuth connect" : TITLE[status]
      }
      className={cn(
        "whitespace-nowrap rounded-chip font-semibold",
        size === "md" ? "px-[10px] py-1 text-[11.5px]" : "px-2 py-[3px] text-[10.5px]",
        m.chipClass,
        className,
      )}
    >
      {m.glyph} {m.label}
    </span>
  );
}
