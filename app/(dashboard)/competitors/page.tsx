"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CompetitorCompareRow } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import { auditReportMock } from "@/components/mocks/audit-report";
import {
  compareDiscoveryNoteMock,
  compareSummaryMock,
  competitorSuggestionsMock,
} from "@/components/mocks/competitors";
import { businessShortNames } from "@/components/mocks/businesses";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";

const MAX_COMPETITORS = 4;

/** One metric row of the compare table. */
interface MetricRow {
  label: string;
  value: (c: CompetitorCompareRow) => number | null;
  format: (c: CompetitorCompareRow) => string;
  /** Highlight the best value across columns (winner = good tint). */
  winner?: boolean;
  /** Flag the TARGET cell as critical (crit tint). */
  flagTarget?: (c: CompetitorCompareRow) => boolean;
}

const ROWS: MetricRow[] = [
  {
    label: "Primary category",
    value: () => null,
    format: (c) =>
      c.is_target && auditReportMock.categories.primary_flagged
        ? `${c.primary_category} ✕`
        : (c.primary_category ?? "—"),
    flagTarget: () => auditReportMock.categories.primary_flagged,
  },
  {
    label: "Rating",
    value: (c) => c.rating,
    format: (c) => (c.rating !== null ? `${c.rating.toFixed(1)}★` : "—"),
    winner: true,
  },
  {
    label: "Reviews",
    value: (c) => c.reviews_total,
    format: (c) => `${c.reviews_total ?? "—"}`,
    winner: true,
  },
  {
    label: "Velocity (6 mo)",
    value: (c) => c.velocity_6m,
    format: (c) =>
      c.velocity_6m !== null ? `${c.velocity_6m.toFixed(1)}/mo` : "—",
    winner: true,
  },
  {
    label: "Owner reply rate",
    value: (c) => c.reply_rate_pct,
    format: (c) =>
      c.reply_rate_pct !== null ? `${Math.round(c.reply_rate_pct)}%` : "—",
    winner: true,
    flagTarget: (c) => (c.reply_rate_pct ?? 100) < 10,
  },
  {
    label: "Photos",
    value: (c) => c.photos,
    format: (c) => `${c.photos ?? "—"}`,
    winner: true,
  },
  {
    label: "Services listed",
    value: (c) => c.services_count,
    format: (c) => `${c.services_count ?? "—"}`,
    winner: true,
    flagTarget: (c) => c.services_count === 0,
  },
  {
    label: "Distance",
    value: () => null,
    format: (c) =>
      c.distance_km !== null ? `${c.distance_km.toFixed(1)} km` : "—",
  },
];

/** P4 Competitor Compare — target vs nearby competitors, cell flags, AI summary. */
export default function CompetitorsPage() {
  const router = useRouter();
  const toast = useToast();
  const { bizSel, setBizSelId, capHit } = useAppState();
  const report = auditReportMock;

  const [columns, setColumns] = useState<CompetitorCompareRow[]>(
    report.competitors,
  );
  const [inPdf, setInPdf] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("mind care");

  const shortName =
    businessShortNames[report.business.id] ?? report.business.name;
  const competitorCount = columns.length - 1;
  const atMax = competitorCount >= MAX_COMPETITORS;

  if (bizSel.id !== report.business.id) {
    return (
      <div className="flex max-w-[560px] flex-col items-start gap-2 rounded-card border-[1.5px] border-dashed border-[rgba(27,35,33,0.22)] bg-bg-surface px-6 py-7">
        <div
          title={bizSel.name}
          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold"
        >
          {bizSel.name}
        </div>
        <div className="text-[12.5px] leading-relaxed text-ink-soft">
          Competitor compare needs an audit first. This demo carries full data
          for मनोवेध हिप्नोक्लिनिक only.
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {!capHit && (
            <Button
              size="xs"
              cost="₹1.9"
              onClick={() => router.push("/audits/new")}
            >
              Run audit
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setBizSelId(report.business.id)}
          >
            ← मनोवेध हिप्नोक्लिनिक
          </Button>
        </div>
      </div>
    );
  }

  const addCompetitor = (name: string) => {
    const pick = competitorSuggestionsMock.find((s) => s.row.name === name);
    if (!pick || atMax) return;
    setColumns((c) => [...c, pick.row]);
    setAddOpen(false);
    toast(`${pick.row.name} added · ₹0.2`);
  };

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast("Competitor data refreshed ✓");
    }, 1200);
  };

  const gridCols = {
    gridTemplateColumns: `1.1fr repeat(${columns.length},1fr)`,
  };
  const minWidth = columns.length > 4 ? 980 : 840;

  return (
    <section className="flex flex-col gap-[14px]">
      {/* Header card */}
      <Card className="flex flex-wrap items-center gap-[10px] px-5 py-[14px]">
        <div>
          <div className="text-[14.5px] font-bold">
            {shortName} vs {competitorCount} nearby competitors
          </div>
          <div className="text-[12px] text-ink-soft">
            {compareDiscoveryNoteMock}
          </div>
        </div>
        <div className="flex-1" />
        {atMax ? (
          <span className="whitespace-nowrap rounded-chip bg-bg-app px-3 py-[5px] text-[11.5px] font-semibold text-ink-soft">
            {competitorCount} competitors · max
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="whitespace-nowrap rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[14px] py-[7px] text-[12.5px] font-semibold hover:border-ink"
          >
            + Add competitor
          </button>
        )}
        {capHit ? (
          <button
            disabled
            title="Daily cap reached"
            className="cursor-not-allowed whitespace-nowrap rounded-lg border-[1.5px] border-[rgba(27,35,33,0.10)] bg-bg-app px-[14px] py-[7px] text-[12.5px] font-semibold text-ink-faint"
          >
            Refresh paused
          </button>
        ) : refreshing ? (
          <button
            disabled
            className="inline-flex cursor-wait items-center gap-[7px] whitespace-nowrap rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[14px] py-[7px] text-[12.5px] font-semibold"
          >
            <Spinner className="h-3 w-3" />
            Refreshing…
          </button>
        ) : (
          <button
            type="button"
            onClick={refresh}
            className="whitespace-nowrap rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[14px] py-[7px] text-[12.5px] font-semibold hover:border-ink"
          >
            Refresh · <span className="font-mono">₹0.6</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setInPdf((v) => !v)}
          className={cn(
            "whitespace-nowrap rounded-lg border-[1.5px] px-[14px] py-[7px] text-[12.5px] font-semibold",
            inPdf
              ? "border-brand bg-[#F0F5F2] text-brand"
              : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink-soft hover:border-ink",
          )}
        >
          {inPdf ? "✓ In PDF" : "Include in PDF"}
        </button>
      </Card>

      {/* Compare table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth }}>
            <div
              className="grid border-b border-[rgba(27,35,33,0.08)] bg-[#FAF8F4]"
              style={gridCols}
            >
              <div className="p-3 text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
                Metric
              </div>
              {columns.map((c) => (
                <div
                  key={c.name}
                  className="border-l border-[rgba(27,35,33,0.06)] p-3"
                >
                  <div
                    title={c.name}
                    className={cn(
                      "overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px]",
                      c.is_target ? "font-bold" : "font-semibold",
                    )}
                  >
                    {c.is_target ? shortName : c.name.replace(" Ngr", "")}
                  </div>
                  {c.is_target ? (
                    <span className="mt-1 inline-block rounded bg-bg-nav px-[7px] py-[2px] text-[9.5px] font-bold tracking-[0.8px] text-white">
                      TARGET
                    </span>
                  ) : (
                    <div className="mt-1 font-mono text-[11px] text-ink-soft">
                      {c.distance_km?.toFixed(1)} km
                    </div>
                  )}
                </div>
              ))}
            </div>
            {ROWS.map((row) => {
              const values = columns.map((c) => row.value(c));
              const best = row.winner
                ? Math.max(...values.map((v) => (v === null ? -Infinity : v)))
                : null;
              return (
                <div
                  key={row.label}
                  className="grid items-stretch border-t border-[rgba(27,35,33,0.07)]"
                  style={gridCols}
                >
                  <div className="px-3 py-[10px] text-[12.5px] font-semibold text-ink-soft">
                    {row.label}
                  </div>
                  {columns.map((c, i) => {
                    const flagged = c.is_target && row.flagTarget?.(c);
                    const winner =
                      best !== null && values[i] !== null && values[i] === best;
                    return (
                      <div
                        key={c.name}
                        className={cn(
                          "border-l border-[rgba(27,35,33,0.06)] px-3 py-[10px] text-[13px]",
                          flagged && "bg-[#FCF3F2] font-bold text-band-crit",
                          !flagged &&
                            winner &&
                            "bg-[#F2F8F4] font-bold text-band-good",
                        )}
                      >
                        {row.format(c)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* AI summary */}
      <Card className="px-5 py-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-[10px]">
          <div className="flex items-baseline gap-2">
            <div className="text-[14.5px] font-bold">AI summary</div>
            <span className="rounded-chip bg-bg-app px-2 py-[2px] text-[10px] font-bold tracking-[0.6px] text-ink-soft">
              AI DRAFT
            </span>
          </div>
          <div className="text-[11px] text-ink-faint">
            OpenRouter free model · regenerate anytime
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[220px] flex-1 rounded-[10px] bg-[#F2F8F4] px-[14px] py-3">
            <div className="mb-[6px] text-[11px] font-bold uppercase tracking-[0.8px] text-band-good">
              Strengths
            </div>
            <div className="text-[13px] leading-relaxed">
              {compareSummaryMock.strengths}
            </div>
          </div>
          <div className="min-w-[220px] flex-1 rounded-[10px] bg-[#FCF3F2] px-[14px] py-3">
            <div className="mb-[6px] text-[11px] font-bold uppercase tracking-[0.8px] text-band-crit">
              Weaknesses
            </div>
            <div className="text-[13px] leading-relaxed">
              {compareSummaryMock.weaknesses}
            </div>
          </div>
          <div className="min-w-[220px] flex-1 rounded-[10px] bg-band-warn-bg px-[14px] py-3">
            <div className="mb-[6px] text-[11px] font-bold uppercase tracking-[0.8px] text-band-warn">
              Fix first
            </div>
            <div className="text-[13px] leading-relaxed">
              {compareSummaryMock.fix_first}
            </div>
          </div>
        </div>
      </Card>

      {/* Add-competitor modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[rgba(15,20,18,0.55)]"
            onClick={() => setAddOpen(false)}
          />
          <div className="relative w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-1 rounded-modal bg-bg-surface px-6 py-[22px] shadow-modal duration-200">
            <div className="mb-1 flex items-start justify-between gap-[10px]">
              <div className="text-[16px] font-bold">Add competitor</div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAddOpen(false)}
                className="px-[6px] py-[2px] text-[16px] text-ink-faint"
              >
                ✕
              </button>
            </div>
            <div className="mb-3 text-[12.5px] text-ink-soft">
              Pick from nearby results — pulling one profile costs{" "}
              <span className="font-mono font-semibold">₹0.2</span>.
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or paste Place ID"
              className="mb-[10px] w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-[13px] py-[11px] text-[13.5px] outline-brand"
            />
            <div className="mb-[14px] flex flex-col gap-[7px]">
              {competitorSuggestionsMock
                .filter((s) => !columns.some((c) => c.name === s.row.name))
                .map((s) => (
                  <button
                    key={s.row.name}
                    type="button"
                    onClick={() => addCompetitor(s.row.name)}
                    className="flex items-center justify-between gap-[10px] rounded-[10px] border-[1.5px] border-[rgba(27,35,33,0.12)] bg-bg-surface px-[13px] py-[11px] text-left hover:border-brand hover:bg-[#F0F5F2]"
                  >
                    <span className="min-w-0">
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold">
                        {s.row.name}
                      </span>
                      <span className="block text-[11.5px] text-ink-soft">
                        {s.area}
                      </span>
                    </span>
                    <span className="flex-none font-mono text-[12px] text-ink-soft">
                      {s.row.rating?.toFixed(1)}★ · {s.row.reviews_total}
                    </span>
                  </button>
                ))}
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface p-[10px] text-[13px] font-semibold hover:border-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
