"use client";

import { StubPage } from "@/components/shell/stub-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/components/shell/app-state";
import { spendLabel, spendPct } from "@/components/lib/format";
import { cn } from "@/lib/utils";

/**
 * P11 Settings & Spend ships Day 6 — but the spend card + "Preview cap-hit
 * state" toggle exist from Day 2 so the global cap-hit state is demoable
 * (handoff: previewable via Settings).
 */
export default function SettingsPage() {
  const { spend, capHit, capPreview, setCapPreview } = useAppState();
  const pct = spendPct(spend);

  return (
    <section className="flex flex-col gap-4">
      <Card className="px-5 py-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
          Spend today
        </div>
        <div className="my-2 font-mono text-[20px] font-semibold">
          {spendLabel(spend)}
        </div>
        <div className="mb-[6px] h-[5px] overflow-hidden rounded-[3px] bg-[#EDEAE3]">
          <div
            className={cn(
              "h-full rounded-[3px]",
              capHit
                ? "bg-[#E06B5D]"
                : pct > 75
                  ? "bg-band-warn-strong"
                  : "bg-brand-accent",
            )}
            style={{ width: `${pct.toFixed(1)}%` }}
          />
        </div>
        <div
          className={cn(
            "mb-3 text-[12px] font-medium",
            capHit ? "text-band-crit" : "text-ink-soft",
          )}
        >
          {capHit
            ? "Cap hit — paused until tomorrow"
            : `${pct.toFixed(0)}% of daily cap`}
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setCapPreview(!capPreview)}
        >
          {capPreview ? "Exit cap-hit preview" : "Preview cap-hit state"}
        </Button>
      </Card>
      <StubPage title="Settings & Spend (P11)" day="Day 6" />
    </section>
  );
}
