"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BusinessListItem } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import { useApiGet } from "@/components/hooks/use-api-get";
import { dashboardStatsMock } from "@/components/mocks/dashboard-stats";
import {
  mediumDate,
  shortDate,
  spendLabel,
  spendPct,
} from "@/components/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConnGlyph } from "@/components/ui/conn";
import { ScorePill } from "@/components/ui/score-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { TypeTag } from "@/components/ui/type-tag";

type Filter = "all" | "clients" | "prospects";

const TABLE_GRID =
  "grid grid-cols-[2.4fr_0.8fr_0.7fr_0.9fr_0.9fr_0.7fr] gap-[10px] px-4";

/** P1 Dashboard — KPI cards + businesses table (prototype-faithful). */
export default function DashboardPage() {
  const router = useRouter();
  const {
    spend,
    capHit,
    setBizSelId,
    // UAT-3: consume the provider's businesses read — the page fetching
    // /api/businesses itself doubled the request on every dashboard mount.
    businesses: providerBusinesses,
    businessesStatus: status,
    businessesError: error,
    retryBusinesses: retry,
  } = useAppState();
  const stats =
    useApiGet("/api/dashboard/stats", dashboardStatsMock).data ??
    dashboardStatsMock;
  const [filter, setFilter] = useState<Filter>("all");

  const businesses = status === "ready" ? providerBusinesses : [];
  const clients = businesses.filter((b) => b.is_client);
  const prospects = businesses.filter((b) => !b.is_client);
  const rows =
    filter === "clients" ? clients : filter === "prospects" ? prospects : businesses;

  const openReport = (b: BusinessListItem) => {
    setBizSelId(b.id);
    router.push("/report");
  };

  const pct = spendPct(spend);

  return (
    <section className="flex flex-col gap-4">
      {/* Mobile page header + primary action */}
      <div className="flex flex-col gap-[10px] min-[920px]:hidden">
        <div className="flex items-baseline justify-between gap-[10px]">
          <div className="text-[17px] font-bold">Dashboard</div>
          <div
            className="text-[11.5px] text-ink-soft"
            suppressHydrationWarning
          >
            {mediumDate(new Date())}
          </div>
        </div>
        {capHit ? (
          <Button size="full" disabled>
            + New Audit — cap reached
          </Button>
        ) : (
          <Button size="full" onClick={() => router.push("/audits/new")}>
            + New Audit
          </Button>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(175px,1fr))] gap-3">
        <Card className="px-4 py-[14px]">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
            Audits this week
          </div>
          <div className="mb-[2px] mt-[6px] font-mono text-[26px] font-semibold">
            {stats.audits_this_week}
          </div>
          <div
            className={cn(
              "text-[12px] font-medium",
              stats.audits_delta >= 0 ? "text-band-good" : "text-band-crit",
            )}
          >
            {stats.audits_delta >= 0 ? "+" : ""}
            {stats.audits_delta} vs last week
          </div>
        </Card>
        <Card className="px-4 py-[14px]">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
            Leads from checker
          </div>
          <div className="mb-[2px] mt-[6px] font-mono text-[26px] font-semibold">
            {stats.leads_total}
          </div>
          <div className="text-[12px] text-ink-soft">
            {stats.leads_new_today} new today ·{" "}
            <Link
              href="/public-checker"
              className="font-semibold text-brand hover:text-brand-hover"
            >
              view page
            </Link>
          </div>
        </Card>
        <Card className="px-4 py-[14px]">
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
              "text-[12px] font-medium",
              capHit ? "text-band-crit" : "text-ink-soft",
            )}
          >
            {capHit
              ? "Cap hit — paused until tomorrow"
              : `${pct.toFixed(0)}% of daily cap`}
          </div>
        </Card>
        <Card className="px-4 py-[14px]">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
            Clients on-track
          </div>
          <div className="mb-[6px] mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-[5px] rounded-chip bg-band-good-bg px-[10px] py-[3px] font-mono text-[14px] font-bold text-band-good">
              ✓ {stats.clients_on_track}
            </span>
            <span className="inline-flex items-center gap-[5px] rounded-chip bg-band-warn-bg px-[10px] py-[3px] font-mono text-[14px] font-bold text-band-warn">
              ! {stats.clients_behind}
            </span>
          </div>
          <div className="text-[12px] text-ink-soft">{stats.behind_note}</div>
        </Card>
      </div>

      {/* Businesses table */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[rgba(27,35,33,0.08)] px-4 py-[14px]">
          <div className="text-[14.5px] font-bold">Businesses</div>
          <div className="font-mono text-[12px] text-ink-soft">
            {status === "ready" ? `${rows.length} of ${businesses.length}` : "…"}
          </div>
          <div className="flex-1" />
          <div className="flex gap-[6px]">
            {(
              [
                ["all", `All ${businesses.length}`],
                ["clients", `Clients ${clients.length}`],
                ["prospects", `Prospects ${prospects.length}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-chip border-[1.5px] px-3 py-[5px] text-[12px] font-semibold",
                  filter === key
                    ? "border-brand bg-brand text-white"
                    : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink-soft hover:border-brand",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {status === "loading" && (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[38px] w-full" />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="text-[13.5px] font-bold text-band-crit">
              Couldn&apos;t load businesses
            </div>
            <div className="text-[12.5px] text-ink-soft">{error}</div>
            <Button variant="ghost" size="xs" onClick={retry}>
              Retry
            </Button>
          </div>
        )}

        {status === "ready" && rows.length === 0 && (
          <div className="m-4 rounded-[10px] border border-dashed border-[rgba(27,35,33,0.22)] p-[18px] text-center">
            <div className="mb-1 text-[13.5px] font-bold">
              No businesses yet
            </div>
            <div className="mb-[10px] text-[12.5px] leading-relaxed text-ink-soft">
              Run your first audit — the business lands here automatically.
            </div>
            <Button onClick={() => router.push("/audits/new")} disabled={capHit}>
              + New Audit
            </Button>
          </div>
        )}

        {status === "ready" && rows.length > 0 && (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div
                className={cn(
                  TABLE_GRID,
                  "bg-[#FAF8F4] py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft",
                )}
              >
                <div>Business</div>
                <div>City</div>
                <div>Score</div>
                <div>Last audit</div>
                <div>Type</div>
                <div />
              </div>
              {rows.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    TABLE_GRID,
                    "items-center border-t border-[rgba(27,35,33,0.07)] py-3 text-[13.5px] hover:bg-[#FAF8F4]",
                  )}
                >
                  <div
                    title={b.name}
                    className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                  >
                    {b.name}
                  </div>
                  <div className="text-[13px] text-ink-soft">{b.city}</div>
                  <div className="flex items-center gap-[5px]">
                    {b.latest_score !== null ? (
                      <ScorePill score={b.latest_score} />
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </div>
                  <div className="font-mono text-[12px] text-ink-soft">
                    {b.latest_audit_at ? shortDate(b.latest_audit_at) : "—"}
                  </div>
                  <div className="flex min-w-0 items-center gap-[7px]">
                    <TypeTag isClient={b.is_client} />
                    <ConnGlyph status={b.connection_status} />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => openReport(b)}
                      className="whitespace-nowrap text-[13px] font-semibold text-brand hover:text-brand-hover"
                    >
                      Open →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
