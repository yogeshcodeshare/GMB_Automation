"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/components/shell/app-state";
import { auditReportMock } from "@/components/mocks/audit-report";
import { FixesCard } from "@/components/report/fixes-card";
import { RubricCard } from "@/components/report/rubric-card";
import { BandLabel, ScoreGauge } from "@/components/report/score-gauge";
import { WaModal } from "@/components/report/wa-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConnChip } from "@/components/ui/conn";
import { useToast } from "@/components/ui/toast";

const CAPTION =
  "text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft";

const PDF_NAME = "मनोवेध_GMB_Audit_41.pdf";

/** P3 Audit Report — the sales weapon (Manovedh fixture until Day 5). */
export default function ReportPage() {
  const router = useRouter();
  const toast = useToast();
  const { bizSel, setBizSelId, capHit } = useAppState();
  const report = auditReportMock;

  const [isClient, setIsClient] = useState(report.business.is_client);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waSentAt, setWaSentAt] = useState<string | null>(null);

  // Workspace pages carry full data for the fixture business only (mock phase).
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
          This demo carries the full workspace for मनोवेध हिप्नोक्लिनिक only.
          Run a fresh audit for this business, or switch back.
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

  const snap = report.audit.raw_snapshot as {
    kg_id?: string;
    address?: string;
  };

  const genPdf = () => {
    setPdfBusy(true);
    setTimeout(() => {
      setPdfBusy(false);
      toast(`PDF ready — ${PDF_NAME}`);
    }, 1300);
  };

  const sendWa = () => {
    setWaOpen(false);
    setWaSentAt(
      new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }),
    );
    toast("Report sent on WhatsApp ✓");
  };

  return (
    <section className="flex flex-col gap-[14px]">
      {/* Header card */}
      <Card className="flex flex-col gap-3 px-5 py-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-[14px]">
          <div className="min-w-0">
            <h1 className="m-0 text-[clamp(17px,2.4vw,21px)] font-bold leading-[1.35]">
              {report.business.name}
            </h1>
            <div className="mt-1 text-[13px] text-ink-soft">
              {snap.address}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isClient ? (
              <span className="rounded-chip bg-bg-nav px-[10px] py-1 text-[11.5px] font-semibold text-white">
                Client
              </span>
            ) : (
              <span className="rounded-chip border-[1.5px] border-[rgba(27,35,33,0.2)] px-[10px] py-1 text-[11.5px] font-semibold text-ink-soft">
                Prospect
              </span>
            )}
            <ConnChip status={report.business.connection_status} />
            <span className="rounded-chip bg-band-good-bg px-[10px] py-1 text-[11.5px] font-semibold text-band-good">
              Claimed ✓
            </span>
            <span className="rounded-chip bg-bg-app px-[10px] py-1 font-mono text-[11.5px] font-semibold text-ink-soft">
              4.9★ · 30 reviews
            </span>
            <span className="rounded-chip bg-bg-app px-[10px] py-1 font-mono text-[11.5px] font-semibold text-ink-soft">
              Audited 08 Jul 2026 09:12
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={genPdf} loading={pdfBusy}>
            {pdfBusy ? "Generating PDF…" : "Generate PDF (मराठी)"}
          </Button>
          <Button variant="secondary" onClick={() => setWaOpen(true)}>
            Send on WhatsApp
          </Button>
          {waSentAt && (
            <span className="self-center whitespace-nowrap text-[11.5px] font-semibold text-band-good">
              ✓ sent {waSentAt}
            </span>
          )}
          {capHit ? (
            <button
              disabled
              title="Daily cap reached"
              className="cursor-not-allowed rounded-lg border-[1.5px] border-[rgba(27,35,33,0.10)] bg-bg-app px-4 py-[9px] text-[13px] font-semibold text-ink-faint"
            >
              Re-audit paused
            </button>
          ) : (
            <Button
              variant="ghost"
              cost="₹1.9"
              onClick={() => router.push("/audits/new?rerun=1")}
            >
              Re-audit
            </Button>
          )}
          {isClient ? (
            <>
              <button
                type="button"
                title="Tap to undo"
                onClick={() => setIsClient(false)}
                className="rounded-lg border-[1.5px] border-band-good bg-band-good-bg px-4 py-[9px] text-[13px] font-semibold text-band-good"
              >
                ✓ Client — undo
              </button>
              <Button variant="accent" onClick={() => router.push("/sprint")}>
                Start Optimization Sprint →
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setIsClient(true)}>
              Mark as Client
            </Button>
          )}
        </div>
      </Card>

      {/* Score row: gauge + rubric */}
      <div className="flex flex-wrap items-stretch gap-[14px]">
        <Card className="flex min-w-[250px] flex-1 flex-col items-center justify-center gap-[10px] p-5">
          <ScoreGauge score={report.scores.total} />
          <BandLabel score={report.scores.total} />
        </Card>
        <RubricCard rubric={report.rubric} total={report.scores.total} />
      </div>

      {/* Top 5 fixes */}
      <FixesCard topFixes={report.top_fixes} />

      {/* Business data + hours */}
      <div className="flex flex-wrap items-stretch gap-[14px]">
        <Card className="min-w-[280px] flex-[1.2] px-5 py-4">
          <div className="mb-3 text-[14.5px] font-bold">Business data</div>
          <div className="flex flex-col gap-[9px]">
            {(
              [
                ["Place ID", report.business.place_id],
                ["CID", report.business.cid],
                ["KG ID", snap.kg_id],
                [
                  "Coordinates",
                  `${report.business.lat?.toFixed(4)}, ${report.business.lng?.toFixed(4)}`,
                ],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-[10px]"
              >
                <span className={CAPTION}>{label}</span>
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px]">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className={cn(CAPTION, "mb-2")}>Categories</div>
            <div className="flex flex-wrap gap-[6px]">
              <span
                title='Generic — competitors use "Mental health clinic"'
                className="rounded-chip border border-[rgba(179,55,43,0.25)] bg-band-crit-bg px-[10px] py-1 text-[12px] font-semibold text-band-crit"
              >
                {report.categories.primary} · primary ✕
              </span>
              {report.categories.secondary.map((c) => (
                <span
                  key={c}
                  className="rounded-chip bg-bg-app px-[10px] py-1 text-[12px] font-medium text-ink"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-[14px]">
            <div className={cn(CAPTION, "mb-2")}>Attributes</div>
            <div className="flex flex-wrap gap-[6px]">
              {Object.values(report.attributes)
                .flat()
                .map((a) => (
                  <span
                    key={a}
                    className="rounded-chip bg-bg-app px-[10px] py-1 text-[12px] font-medium text-ink"
                  >
                    {a}
                  </span>
                ))}
            </div>
          </div>
        </Card>

        <Card className="min-w-[260px] flex-1 px-5 py-4">
          <div className="mb-3 text-[14.5px] font-bold">
            Hours{" "}
            <span className="ml-[6px] rounded-chip bg-band-warn-bg px-2 py-[2px] text-[11.5px] font-semibold text-band-warn">
              {report.hours.filter((h) => h.anomaly).length} anomalies
            </span>
          </div>
          <div className="flex flex-col">
            {report.hours.map((h, i) => (
              <div
                key={h.day}
                title={
                  h.anomaly
                    ? "Overnight block — looks like an entry error"
                    : undefined
                }
                className={cn(
                  "flex items-center justify-between gap-[10px] py-[6px] text-[13px]",
                  i > 0 && "border-t border-[rgba(27,35,33,0.06)]",
                )}
              >
                <span className="w-11 text-ink-soft">{h.day}</span>
                {h.anomaly ? (
                  <span className="flex items-center gap-[6px]">
                    <span className="font-mono text-[12.5px] font-semibold text-band-warn">
                      {h.text}
                    </span>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-band-warn-bg text-[10px] font-bold text-band-warn">
                      !
                    </span>
                  </span>
                ) : (
                  <span
                    className={cn(
                      "font-mono text-[12.5px]",
                      h.text === "Closed" && "text-ink-soft",
                    )}
                  >
                    {h.text}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-[10px] rounded-lg bg-band-warn-bg px-[10px] py-2 text-[12px] leading-normal text-band-warn">
            Two overnight blocks look like entry errors — confirm real hours
            with the owner.
          </div>
        </Card>
      </div>

      {/* Link pack */}
      <Card className="px-5 py-4">
        <div className="mb-[2px] text-[14.5px] font-bold">Link pack</div>
        <div className="mb-[14px] text-[12px] text-ink-soft">
          {report.links_pack.reduce((n, g) => n + g.links.length, 0)}{" "}
          auto-generated links · zero API cost · open in new tab
        </div>
        {report.links_pack.map((group) => (
          <div key={group.group} className="mb-[14px] last:mb-0">
            <div className={cn(CAPTION, "mb-2 tracking-[0.8px]")}>
              {group.group}
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {group.links.map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-chip border border-[rgba(27,35,33,0.14)] bg-bg-surface px-[11px] py-[5px] text-[12.5px] font-medium text-brand no-underline hover:border-brand hover:bg-[#F0F5F2]"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </Card>

      {/* Website audit teaser */}
      <Card className="flex flex-wrap items-center gap-[10px] px-5 py-[14px]">
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold">Website audit detail</div>
          <div className="text-[12px] text-ink-soft">
            NAP · title/meta · local keywords · hours match · content depth ·
            headings — feeds the &quot;Website 6/10&quot; row
          </div>
        </div>
        <span className="whitespace-nowrap rounded-chip bg-band-warn-bg px-[11px] py-1 font-mono text-[11.5px] font-bold text-band-warn">
          PageSpeed mobile · {report.website?.psi_score}
        </span>
        <Link
          href="/website"
          className="whitespace-nowrap rounded-lg border-[1.5px] border-brand bg-bg-surface px-[15px] py-2 text-[12.5px] font-semibold text-brand hover:bg-[#F0F5F2]"
        >
          Open website audit
        </Link>
      </Card>

      {/* Mobile sticky action bar — the shop-counter flow */}
      <div className="sticky bottom-0 z-[60] flex gap-2 rounded-card border border-[rgba(27,35,33,0.12)] bg-bg-surface p-[10px] shadow-[0_-6px_20px_rgba(27,35,33,0.12)] min-[920px]:hidden">
        <button
          type="button"
          onClick={genPdf}
          className="flex-1 rounded-[9px] bg-brand px-2 py-3 text-[13px] font-bold text-white"
        >
          Generate PDF (मराठी)
        </button>
        <button
          type="button"
          onClick={() => setWaOpen(true)}
          className="flex-1 rounded-[9px] border-[1.5px] border-brand bg-bg-surface px-2 py-3 text-[13px] font-bold text-brand"
        >
          Send on WhatsApp
        </button>
      </div>

      {waOpen && (
        <WaModal
          pdfName={PDF_NAME}
          onClose={() => setWaOpen(false)}
          onSend={sendWa}
        />
      )}
    </section>
  );
}
