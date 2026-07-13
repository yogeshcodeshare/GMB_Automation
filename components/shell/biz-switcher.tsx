"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { bandFor } from "@/types";
import { BAND_STROKE } from "@/components/ui/band";
import { ConnChip, CONN_META } from "@/components/ui/conn";
import { ScorePill } from "@/components/ui/score-pill";
import { useAppState } from "./app-state";

/**
 * Business-context switcher (workspace screens): band-dot + truncated name
 * pill → 320px dropdown of all 6 businesses (conn glyph · name · score pill),
 * plus the selected business's connection chip beside it.
 */
export function BizSwitcher() {
  const { businesses, bizSel, setBizSelId } = useAppState();
  const [open, setOpen] = useState(false);

  const dot =
    bizSel.latest_score === null
      ? "#8A928D"
      : BAND_STROKE[bandFor(bizSel.latest_score)];

  return (
    <>
      <div className="relative min-w-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title={`${bizSel.name} — ${bizSel.city ?? ""}`}
          className="flex max-w-[280px] items-center gap-2 rounded-chip border border-[rgba(27,35,33,0.14)] bg-bg-app px-3 py-[6px] text-[12.5px] font-semibold text-ink hover:border-brand"
        >
          <span
            className="h-[7px] w-[7px] flex-none rounded-full"
            style={{ background: dot }}
          />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {bizSel.name} · {bizSel.city}
          </span>
          <span className="text-[10px] text-ink-soft">▾</span>
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-[190]"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-[calc(100%+6px)] z-[200] max-h-[340px] w-[320px] overflow-y-auto rounded-card border border-[rgba(27,35,33,0.12)] bg-bg-surface p-[6px] shadow-[0_10px_30px_rgba(15,20,18,0.18)]">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBizSelId(b.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-[9px] rounded-lg px-[10px] py-[9px] text-left hover:bg-bg-app",
                    b.id === bizSel.id && "bg-[#F0F5F2]",
                  )}
                >
                  <span
                    className={cn(
                      "w-[14px] flex-none text-center text-[12px] font-bold",
                      CONN_META[b.connection_status].glyphClass,
                    )}
                  >
                    {CONN_META[b.connection_status].glyph}
                  </span>
                  <span
                    title={b.name}
                    className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold"
                  >
                    {b.name}
                  </span>
                  {b.latest_score !== null && (
                    <ScorePill score={b.latest_score} size="sm" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <ConnChip status={bizSel.connection_status} size="sm" />
    </>
  );
}
