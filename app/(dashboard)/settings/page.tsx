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
  const {
    spend,
    capHit,
    capPreview,
    setCapPreview,
    liveDataEnabled,
    setLiveDataEnabled,
  } = useAppState();
  const pct = spendPct(spend);

  return (
    <section className="flex flex-col gap-4">
      {/* CR-1 — DataForSEO live-data master switch (default OFF) */}
      <Card className="px-5 py-4">
        <div className="mb-1 text-[14.5px] font-bold">Data sources</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[520px]">
            <div className="text-[13px] font-semibold">
              DataForSEO live data
            </div>
            <div className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Paid live calls (₹1–5 per action). Enable only after
              funding/verifying DataForSEO. Audits, grids and refreshes run on
              demo data while off.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={liveDataEnabled}
            aria-label="DataForSEO live data"
            onClick={() => setLiveDataEnabled(!liveDataEnabled)}
            className={cn(
              "relative h-[26px] w-[46px] flex-none rounded-full transition-colors",
              liveDataEnabled ? "bg-brand" : "bg-[#C9D2DB]",
            )}
          >
            <span
              className={cn(
                "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,20,18,0.35)] transition-transform",
                liveDataEnabled ? "translate-x-[23px]" : "translate-x-[3px]",
              )}
            />
          </button>
        </div>
        <div className="mt-3 text-[11.5px] font-medium text-[#4A5A6A]">
          {liveDataEnabled
            ? "Live data ON — paid actions will call DataForSEO and charge the ledger."
            : "Demo data — paid actions are blocked; screens show the seeded Manovedh demo."}
        </div>
      </Card>

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
