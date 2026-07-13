"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ServiceCycle } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import {
  opsCountersMock,
  serviceCyclesJuneMock,
  serviceCyclesMock,
  todaysWorkMock,
  workLogMock,
} from "@/components/mocks/ops";
import { ConnChip } from "@/components/ui/conn";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const MONTHS = ["July 2026", "June 2026"] as const;
const CAPTION =
  "text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft";

/** Quota bar — green on target-pace, red when behind (posts 3/8 pattern). */
function QuotaBar({
  label,
  done,
  target,
  pct,
}: {
  label: string;
  done?: number;
  target?: number;
  /** Percentage metric (replies) instead of done/target. */
  pct?: number;
}) {
  const ratio = pct !== undefined ? pct / 100 : target ? (done ?? 0) / target : 0;
  const behind = ratio < 0.5;
  return (
    <div className="min-w-[150px] flex-1">
      <div className="mb-1 flex justify-between gap-2 text-[12px]">
        <span className="font-semibold">{label}</span>
        <span
          className={cn(
            "font-mono font-bold",
            behind ? "text-band-crit" : "text-ink",
          )}
        >
          {pct !== undefined ? `${pct}%` : `${done}/${target}`}
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-[3px] bg-[#EDEAE3]">
        <div
          className={cn(
            "h-full rounded-[3px]",
            behind ? "bg-band-crit" : "bg-band-good",
          )}
          style={{ width: `${Math.min(100, ratio * 100).toFixed(0)}%` }}
        />
      </div>
    </div>
  );
}

/** P9 Client Ops — read views (month/client selectors, deliverables,
 * today's work, work log, monthly counters). Interactive publishing lands
 * with M9. */
export default function ClientOpsPage() {
  const toast = useToast();
  const { businesses } = useAppState();
  const clients = useMemo(
    () => businesses.filter((b) => b.is_client),
    [businesses],
  );
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [month, setMonth] = useState<(typeof MONTHS)[number]>(MONTHS[0]);

  const client = clients.find((b) => b.id === clientId) ?? clients[0];
  const cycles = month === "July 2026" ? serviceCyclesMock : serviceCyclesJuneMock;
  const cycle: ServiceCycle | undefined = cycles[clientId];
  const checklist = (cycle?.checklist ?? {}) as Record<string, number>;

  if (!client) {
    return (
      <div className="max-w-[560px] rounded-[10px] border border-dashed border-[rgba(27,35,33,0.22)] p-[18px] text-center">
        <div className="mb-1 text-[13.5px] font-bold">No clients yet</div>
        <div className="text-[12.5px] leading-relaxed text-ink-soft">
          Mark a business as Client from its audit report — service delivery
          starts here.
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-[14px]">
      {/* Header — client + month selectors, plan chips */}
      <Card className="flex flex-wrap items-center gap-3 px-5 py-[14px]">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="max-w-[260px] rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[9px] font-sans text-[13px] font-semibold text-ink"
        >
          {clients.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value as (typeof MONTHS)[number])}
          className="rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[9px] font-sans text-[13px] text-ink"
        >
          {MONTHS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <ConnChip status={client.connection_status} size="sm" />
        <span className="rounded-chip bg-bg-nav px-[10px] py-1 text-[11px] font-semibold text-white">
          GMB Boost ₹2,999
        </span>
        {client.plan?.addons.map((a) => (
          <span
            key={a}
            className="rounded-chip border-[1.5px] border-[rgba(27,35,33,0.2)] px-[10px] py-[3px] text-[11px] font-semibold capitalize text-ink-soft"
          >
            {a === "content" ? "Content Pack" : a === "whatsapp" ? "WhatsApp" : a}
          </span>
        ))}
        <div className="flex-1" />
        <span className="whitespace-nowrap rounded-chip bg-bg-app px-[10px] py-1 font-mono text-[11.5px] font-semibold text-ink-soft">
          {cycle?.report_sent
            ? "Report: Sent ✓"
            : "Report: Scheduled → 1 Aug 09:00"}
        </span>
      </Card>

      {/* Today's work strip — one-tap pending actions across clients */}
      <Card className="px-5 py-4">
        <div className="mb-[2px] text-[14.5px] font-bold">
          Today&apos;s work
        </div>
        <div className="mb-3 text-[11.5px] text-ink-faint">
          one-tap pending actions across every client
        </div>
        {todaysWorkMock.map((w, i) => (
          <div
            key={`${w.business_id}-${w.kind}`}
            className={cn(
              "flex flex-wrap items-center gap-3 py-[9px]",
              i > 0 && "border-t border-[rgba(27,35,33,0.07)]",
            )}
          >
            <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-band-warn-bg font-mono text-[11px] font-bold text-band-warn">
              {w.count}
            </span>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">
              <span className="font-semibold">{w.business_name}</span> —{" "}
              {w.label}
            </span>
            <button
              type="button"
              onClick={() =>
                toast("Publishing actions arrive with M9 — read view today")
              }
              className="flex-none rounded-lg border-[1.5px] border-brand bg-bg-surface px-[13px] py-[6px] text-[12px] font-semibold text-brand hover:bg-[#F0F5F2]"
            >
              Open →
            </button>
          </div>
        ))}
      </Card>

      <div className="flex flex-wrap items-start gap-[14px]">
        {/* Deliverables — quotas render only for purchased services */}
        <Card className="min-w-[300px] flex-[1.4] px-5 py-4">
          <div className="mb-3 text-[14.5px] font-bold">
            Deliverables — {month}
          </div>
          {cycle ? (
            <>
              <div className="flex flex-wrap gap-5">
                <QuotaBar
                  label="Posts"
                  done={cycle.posts_done}
                  target={cycle.posts_target}
                />
                <QuotaBar
                  label="Photos"
                  done={cycle.photos_done}
                  target={cycle.photos_target}
                />
                <QuotaBar label="Replies" pct={cycle.replies_pct ?? 0} />
                {checklist.content_articles_target !== undefined && (
                  <QuotaBar
                    label="Content articles"
                    done={checklist.content_articles_done}
                    target={checklist.content_articles_target}
                  />
                )}
                {checklist.whatsapp_replies_target !== undefined && (
                  <QuotaBar
                    label="WhatsApp replies"
                    done={checklist.whatsapp_replies_done}
                    target={checklist.whatsapp_replies_target}
                  />
                )}
              </div>
              {client.connection_status === "manager" && (
                <div className="mt-3 rounded-lg bg-band-warn-bg px-3 py-2 text-[12px] font-medium text-band-warn">
                  Manager access — copy/paste mode; publishes are logged
                  manually.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[10px] border border-dashed border-[rgba(27,35,33,0.22)] p-4 text-center text-[12.5px] text-ink-soft">
              No service cycle for this month.
            </div>
          )}
        </Card>

        {/* Monthly counters (review-request machine) */}
        <Card className="min-w-[260px] flex-1 px-5 py-4">
          <div className="mb-3 text-[14.5px] font-bold">
            Review-request machine
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={CAPTION}>Sent</div>
              <div className="font-mono text-[23px] font-semibold">
                {opsCountersMock.requests_sent}
              </div>
            </div>
            <div>
              <div className={CAPTION}>Reminders</div>
              <div className="font-mono text-[23px] font-semibold">
                {opsCountersMock.reminders}
              </div>
            </div>
            <div>
              <div className={CAPTION}>New reviews</div>
              <div className="font-mono text-[23px] font-semibold">
                {opsCountersMock.new_reviews}
              </div>
            </div>
            <div>
              <div className={CAPTION}>Conversion</div>
              <div className="inline-block rounded-chip bg-band-good-bg px-2 py-[2px] font-mono text-[20px] font-semibold text-band-good">
                {opsCountersMock.conversion_pct}%
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] leading-normal text-ink-faint">
            3-day reminder is automatic — one per customer, then it stops.
          </div>
        </Card>
      </div>

      {/* Work log */}
      <Card className="px-5 py-4">
        <div className="mb-[6px] text-[14.5px] font-bold">Work log</div>
        {workLogMock.map((l, i) => (
          <div
            key={i}
            className="flex flex-wrap items-baseline gap-3 border-t border-[rgba(27,35,33,0.07)] py-[9px]"
          >
            <span className="w-[52px] flex-none font-mono text-[12px] text-ink-soft">
              {l.date}
            </span>
            <span className="min-w-[140px] flex-none text-[12.5px] font-semibold">
              {l.business}
            </span>
            <span className="min-w-0 flex-1 text-[13px] text-ink">
              {l.action}
            </span>
          </div>
        ))}
      </Card>
    </section>
  );
}
