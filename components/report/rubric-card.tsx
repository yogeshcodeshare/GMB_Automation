"use client";

import Link from "next/link";
import type { RubricRow } from "@/types";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";

const PTS_COLOR = {
  pass: "text-band-good",
  warn: "text-band-warn",
  fail: "text-band-crit",
};

/**
 * P3 score rubric — 10 rows (chip · name · reason · points). Desktop = open
 * rows; mobile <920px = tap-to-expand accordions. The Website row links to
 * the website-audit detail.
 */
export function RubricCard({
  rubric,
  total,
}: {
  rubric: RubricRow[];
  total: number;
}) {
  return (
    <Card className="min-w-[300px] flex-[2.2] px-5 py-4">
      <div className="mb-1 flex items-baseline justify-between gap-[10px]">
        <div className="text-[14.5px] font-bold">Score rubric</div>
        <div className="font-mono text-[12.5px] text-ink-soft">
          {total} / 100
        </div>
      </div>

      {/* Desktop rows */}
      <div className="hidden min-[920px]:block">
        {rubric.map((r) => {
          const row = (
            <div
              className={cn(
                "flex items-start gap-[10px] border-t border-[rgba(27,35,33,0.07)] py-[9px]",
                r.key === "website" && "cursor-pointer hover:bg-[#FAF8F4]",
              )}
            >
              <StatusChip status={r.status} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-[10px]">
                  <span className="text-[13.5px] font-semibold">{r.label}</span>
                  <span className="flex items-baseline gap-2">
                    {r.key === "website" && (
                      <span className="text-[11px] font-semibold text-brand">
                        detail →
                      </span>
                    )}
                    <span
                      className={cn(
                        "font-mono text-[12.5px] font-semibold",
                        PTS_COLOR[r.status],
                      )}
                    >
                      {r.points}/{r.max}
                    </span>
                  </span>
                </div>
                <div className="text-[12.5px] text-ink-soft">{r.reason}</div>
              </div>
            </div>
          );
          return r.key === "website" ? (
            <Link
              key={r.key}
              href="/website"
              title="Open website audit detail"
              className="block"
            >
              {row}
            </Link>
          ) : (
            <div key={r.key}>{row}</div>
          );
        })}
      </div>

      {/* Mobile accordions */}
      <div className="min-[920px]:hidden">
        {rubric.map((r) => (
          <details
            key={r.key}
            className="border-t border-[rgba(27,35,33,0.07)]"
          >
            <summary className="flex cursor-pointer list-none items-center gap-[10px] py-[10px] [&::-webkit-details-marker]:hidden">
              <StatusChip status={r.status} />
              <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold">
                {r.label}
              </span>
              <span
                className={cn(
                  "font-mono text-[12.5px] font-semibold",
                  PTS_COLOR[r.status],
                )}
              >
                {r.points}/{r.max}
              </span>
              <span className="flex-none text-[10px] text-ink-faint">▾</span>
            </summary>
            <div className="pb-[11px] pl-[30px] text-[12.5px] leading-relaxed text-ink-soft">
              {r.reason}
              {r.key === "website" && (
                <Link
                  href="/website"
                  className="mt-[5px] block font-semibold text-brand"
                >
                  Full website audit →
                </Link>
              )}
            </div>
          </details>
        ))}
      </div>
    </Card>
  );
}
