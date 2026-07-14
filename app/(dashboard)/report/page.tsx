"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/components/shell/app-state";
import { auditReportMock } from "@/components/mocks/audit-report";
import { recommendedPrimaryCategoryMock } from "@/components/mocks/ai-tools";
import { SEEDED_AUDIT_ID } from "@/components/mocks/businesses";
import { useApiGet } from "@/components/hooks/use-api-get";
import { Skeleton } from "@/components/ui/skeleton";
import { FixesCard } from "@/components/report/fixes-card";
import { RubricCard } from "@/components/report/rubric-card";
import { BandLabel, ScoreGauge } from "@/components/report/score-gauge";
import { WaModal, type WaContact } from "@/components/report/wa-modal";
import {
  PDF_LANG_LABEL,
  PdfLangPicker,
} from "@/components/report/pdf-lang-picker";
import type { PdfLang } from "@/components/shell/app-state";
import { apiPostResult, isLive } from "@/components/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConnChip } from "@/components/ui/conn";
import { useToast } from "@/components/ui/toast";

/** EP-006 response (`POST /api/report/:auditId`). */
interface PdfResponse {
  pdf_path: string;
  storage_url: string;
}

/** Generated-PDF state: live carries the signed URL; mock carries neither. */
interface PdfDone {
  lang: PdfLang;
  url: string | null;
  pdfPath: string | null;
}

const CAPTION =
  "text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft";

/** P3 Audit Report — the sales weapon (live EP-002 read, mock fallback). */
export default function ReportPage() {
  const router = useRouter();
  const toast = useToast();
  const {
    bizSel,
    setBizSelId,
    bizSelIsFixture,
    capHit,
    catApplied,
    liveDataEnabled,
    pdfLangFor,
    setPdfLang,
  } = useAppState();
  // Seeded fixture audit (a111…) — the businesses list doesn't carry a
  // latest_audit_id yet (contract gap raised in HANDOFF).
  const reportQ = useApiGet(
    `/api/audit/${SEEDED_AUDIT_ID}`,
    auditReportMock,
  );
  const report = reportQ.data ?? auditReportMock;

  const [isClient, setIsClient] = useState(report.business.is_client);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfChooserOpen, setPdfChooserOpen] = useState(false);
  const [pdfDone, setPdfDone] = useState<PdfDone | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waSentAt, setWaSentAt] = useState<string | null>(null);
  /** EP-007 answered FEATURE_DISABLED — WA keys land next week. */
  const [waSoon, setWaSoon] = useState(false);

  // Workspace pages carry full data for the fixture business only (mock phase).
  if (!bizSelIsFixture) {
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

  if (reportQ.status === "loading") {
    return (
      <section className="flex flex-col gap-[14px]">
        <Skeleton className="h-[130px]" />
        <div className="flex flex-wrap gap-[14px]">
          <Skeleton className="h-[260px] min-w-[250px] flex-1" />
          <Skeleton className="h-[260px] min-w-[300px] flex-[2.2]" />
        </div>
        <Skeleton className="h-[280px]" />
      </section>
    );
  }

  if (reportQ.status === "error") {
    return (
      <Card className="flex max-w-[560px] flex-col items-start gap-3 px-6 py-7">
        <div className="text-[13.5px] font-bold text-band-crit">
          Couldn&apos;t load the audit report
        </div>
        <div className="text-[12.5px] text-ink-soft">{reportQ.error}</div>
        <Button variant="ghost" size="xs" onClick={reportQ.retry}>
          Retry
        </Button>
      </Card>
    );
  }

  const snap = report.audit.raw_snapshot as {
    kg_id?: string;
    address?: string;
    rating?: number;
    reviews_total?: number;
    claimed?: boolean;
    audited_at?: string;
  };

  // CR-3: Generate PDF opens the language chooser first (per-business memory).
  const pdfLang = pdfLangFor(bizSel.id);

  // EP-006 names the file server-side; the UI mirrors it from the report
  // being viewed (sweep fix: name + score were hardcoded fixture literals).
  const pdfNameFor = (lang: PdfLang) =>
    `${report.business.name}_GMB_Audit_${report.scores.total}_${lang}.pdf`;

  // UAT-5: saved contacts for THIS business only — the owner captured via
  // Mark-as-Client / the client record. No fabricated numbers; contacts on a
  // demo business are badged DEMO (per-row is_demo flag, main 4715650).
  const waContacts: WaContact[] = bizSel.owner_whatsapp
    ? [
        {
          phone: bizSel.owner_whatsapp,
          label: bizSel.owner_name ?? "owner",
          demo: bizSel.is_demo === true,
        },
      ]
    : [];

  // B3: real EP-006 — POST /api/report/:auditId { language } (LIVE).
  // UAT-1: errors surface as a visible toast (never a silent spin); success
  // auto-opens the signed URL AND leaves a persistent "Open PDF ↗" chip.
  // Returns the PdfDone it settled on, or null on a live failure.
  const genPdf = async (
    lang: PdfLang,
    { autoOpen = true }: { autoOpen?: boolean } = {},
  ): Promise<PdfDone | null> => {
    setPdfChooserOpen(false);
    setPdfLang(bizSel.id, lang);
    setPdfBusy(true);
    const r = await apiPostResult<PdfResponse>(
      `/api/report/${report.audit.id}`,
      { language: lang },
    );
    // MAIN's UAT-1 gate: "PDF ready" ONLY on ok + a real storage_url.
    if (r.ok && r.data.storage_url) {
      const done: PdfDone = {
        lang,
        url: r.data.storage_url,
        pdfPath: r.data.pdf_path,
      };
      setPdfBusy(false);
      setPdfDone(done);
      toast(`PDF ready — opening · ${PDF_LANG_LABEL[lang]}`);
      if (autoOpen && done.url) window.open(done.url, "_blank", "noopener");
      return done;
    }
    if (r.ok) {
      setPdfBusy(false);
      toast("Couldn't generate the PDF — no download link returned");
      return null;
    }
    if (r.code !== "ENDPOINT_OFF") {
      // Live EP-006 failure — clear error toast, stop the spinner, and do
      // NOT fake a done chip (messages per MAIN's Day-7 triage).
      setPdfBusy(false);
      toast(
        r.code === "FEATURE_DISABLED"
          ? "PDF generation is off — restart the server (FEATURE_PDF)"
          : `Couldn't generate the PDF — ${r.message}`,
      );
      return null;
    }
    // Registry OFF → staged demo-mode success (mock path, no URL).
    const done: PdfDone = { lang, url: null, pdfPath: null };
    await new Promise<void>((res) =>
      setTimeout(() => {
        setPdfBusy(false);
        setPdfDone(done);
        toast(`PDF ready — ${pdfNameFor(lang)} · ${PDF_LANG_LABEL[lang]}`);
        res();
      }, 700),
    );
    return done;
  };

  // UAT-1c: signed URLs expire — probe before opening; on a 4xx answer,
  // re-request EP-006 for the same language and open the fresh URL.
  const openPdf = async (done: PdfDone) => {
    if (!done.url) return;
    try {
      const probe = await fetch(done.url, { method: "HEAD" });
      if (!probe.ok) {
        toast("PDF link expired — refreshing…");
        await genPdf(done.lang);
        return;
      }
    } catch {
      // CORS/network probe failure — fall through and just try opening.
    }
    window.open(done.url, "_blank", "noopener");
  };

  /** 2-line summary that travels with the PDF (EP-007 body). */
  const waSummary = (lang: PdfLang) =>
    lang === "en"
      ? `${report.business.name} — Google score ${report.scores.total}/100. Full audit report attached.`
      : `${report.business.name} — Google स्कोअर ${report.scores.total}/100. संपूर्ण ऑडिट रिपोर्ट सोबत जोडली आहे.`;

  // B3: real EP-007 — POST /api/wa/send { phone, pdf_path, summary }.
  // FEATURE_DISABLED (keys land next week) → graceful "arriving soon" state;
  // registry OFF → demo-mode mock success (unchanged behaviour).
  const sendWa = async (phone: string, lang: PdfLang) => {
    setPdfLang(bizSel.id, lang);
    setWaOpen(false);
    // Ensure a PDF exists for this language first (live path only).
    let pdfPath = pdfDone?.lang === lang ? pdfDone.pdfPath : null;
    if (isLive("/api/wa/send") && !pdfPath) {
      pdfPath = (await genPdf(lang, { autoOpen: false }))?.pdfPath ?? null;
      // Live PDF generation failed — genPdf already toasted the error.
      if (!pdfPath) return;
    }
    const r = await apiPostResult<{ sent: true; wa_message_id: string }>(
      "/api/wa/send",
      {
        phone: `+91${phone.replace(/\D/g, "")}`,
        pdf_path: pdfPath ?? pdfNameFor(lang),
        summary: waSummary(lang),
      },
    );
    if (!r.ok && r.code === "FEATURE_DISABLED") {
      setWaSoon(true);
      toast("WhatsApp sending arrives with next week's keys — PDF saved ✓");
      return;
    }
    if (!r.ok && r.code !== "ENDPOINT_OFF") {
      // Live EP-007 failure — never fake a sent chip (MAIN's UAT-1 note).
      toast(`Couldn't send on WhatsApp — ${r.message}`);
      return;
    }
    // Live success — or demo-mode mock success while the registry is OFF.
    setWaSoon(false);
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

  const isDemoAudit = report.source === "demo" || report.is_demo === true;

  return (
    <section className="flex flex-col gap-[14px]">
      {/* UAT-2 — persistent provenance banner for demo audits */}
      {isDemoAudit && (
        <div className="flex flex-wrap items-center gap-[10px] rounded-card border border-[#C9D2DB] bg-[#EEF1F4] px-4 py-[10px]">
          <span className="rounded-chip bg-[#4A5A6A] px-[9px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.6px] text-white">
            Demo data
          </span>
          <span className="min-w-0 flex-1 text-[12px] font-medium leading-relaxed text-[#4A5A6A]">
            This report was generated from synthetic demo data (₹0, no
            DataForSEO calls). Enable live data in Settings and re-audit for
            real Google data.
          </span>
        </div>
      )}

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
            {/* UAT-4: chips never render with empty values — hide when the
                snapshot is missing the field, "—" for a partial pair. */}
            {snap.claimed !== undefined &&
              (snap.claimed ? (
                <span className="rounded-chip bg-band-good-bg px-[10px] py-1 text-[11.5px] font-semibold text-band-good">
                  Claimed ✓
                </span>
              ) : (
                <span className="rounded-chip bg-band-crit-bg px-[10px] py-1 text-[11.5px] font-semibold text-band-crit">
                  Unclaimed
                </span>
              ))}
            {(snap.rating != null || snap.reviews_total != null) && (
              <span className="rounded-chip bg-bg-app px-[10px] py-1 font-mono text-[11.5px] font-semibold text-ink-soft">
                {snap.rating != null ? snap.rating.toFixed(1) : "—"}★ ·{" "}
                {snap.reviews_total ?? "—"} reviews
              </span>
            )}
            {snap.audited_at && (
              <span className="rounded-chip bg-bg-app px-[10px] py-1 font-mono text-[11.5px] font-semibold text-ink-soft">
                Audited{" "}
                {new Date(snap.audited_at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setPdfChooserOpen(true)}
            loading={pdfBusy}
          >
            {pdfBusy
              ? "Generating PDF…"
              : `Generate PDF (${PDF_LANG_LABEL[pdfLang]})`}
          </Button>
          {pdfDone && !pdfBusy && (
            pdfDone.url ? (
              // UAT-1: persistent chip; click re-checks the signed URL and
              // re-requests EP-006 if it expired (4xx) before opening.
              <button
                type="button"
                onClick={() => void openPdf(pdfDone)}
                className="self-center whitespace-nowrap rounded-chip bg-band-good-bg px-[10px] py-1 text-[11.5px] font-bold text-band-good underline-offset-2 hover:underline"
              >
                ✓ PDF · {PDF_LANG_LABEL[pdfDone.lang]} · Open ↗
              </button>
            ) : (
              <span className="self-center whitespace-nowrap text-[11.5px] font-semibold text-band-good">
                ✓ PDF · {PDF_LANG_LABEL[pdfDone.lang]}
              </span>
            )
          )}
          <Button variant="secondary" onClick={() => setWaOpen(true)}>
            Send on WhatsApp
          </Button>
          {waSentAt && (
            <span className="self-center whitespace-nowrap text-[11.5px] font-semibold text-band-good">
              ✓ sent {waSentAt}
            </span>
          )}
          {waSoon && (
            <span className="self-center whitespace-nowrap rounded-chip bg-band-warn-bg px-[10px] py-1 text-[11.5px] font-semibold text-band-warn">
              WhatsApp arriving soon — PDF saved
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
          ) : !liveDataEnabled ? (
            <button
              disabled
              title="DataForSEO live data is off — enable it in Settings"
              className="cursor-not-allowed rounded-lg border border-[#C9D2DB] bg-[#EEF1F4] px-4 py-[9px] text-[13px] font-semibold text-[#8697A6]"
            >
              Re-audit · live data off
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
                ["Place ID", report.business.place_id ?? "—"],
                ["CID", report.business.cid ?? "—"],
                ["KG ID", snap.kg_id ?? "—"],
                [
                  "Coordinates",
                  report.business.lat != null && report.business.lng != null
                    ? `${report.business.lat.toFixed(4)}, ${report.business.lng.toFixed(4)}`
                    : "—",
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
              {catApplied ? (
                <>
                  <span
                    title="Planned via Category Finder"
                    className="rounded-chip border border-[rgba(23,123,75,0.25)] bg-band-good-bg px-[10px] py-1 text-[12px] font-semibold text-band-good"
                  >
                    {recommendedPrimaryCategoryMock} · new primary ✓
                  </span>
                  <span className="rounded-chip bg-bg-app px-[10px] py-1 text-[12px] font-medium text-ink-soft line-through">
                    {report.categories.primary}
                  </span>
                </>
              ) : (
                <span
                  title={`Generic — competitors use "${recommendedPrimaryCategoryMock}"`}
                  className="rounded-chip border border-[rgba(179,55,43,0.25)] bg-band-crit-bg px-[10px] py-1 text-[12px] font-semibold text-band-crit"
                >
                  {report.categories.primary} · primary ✕
                </span>
              )}
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
          {report.hours.some((h) => h.anomaly) && (
            <div className="mt-[10px] rounded-lg bg-band-warn-bg px-[10px] py-2 text-[12px] leading-normal text-band-warn">
              {report.hours.filter((h) => h.anomaly).length} overnight block
              {report.hours.filter((h) => h.anomaly).length > 1 ? "s" : ""}{" "}
              look like entry errors — confirm real hours with the owner.
            </div>
          )}
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
        {report.website?.psi_score != null && (
          <span className="whitespace-nowrap rounded-chip bg-band-warn-bg px-[11px] py-1 font-mono text-[11.5px] font-bold text-band-warn">
            PageSpeed mobile · {report.website.psi_score}
          </span>
        )}
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
          onClick={() => setPdfChooserOpen(true)}
          className="flex-1 rounded-[9px] bg-brand px-2 py-3 text-[13px] font-bold text-white"
        >
          Generate PDF ({PDF_LANG_LABEL[pdfLang]})
        </button>
        <button
          type="button"
          onClick={() => setWaOpen(true)}
          className="flex-1 rounded-[9px] border-[1.5px] border-brand bg-bg-surface px-2 py-3 text-[13px] font-bold text-brand"
        >
          Send on WhatsApp
        </button>
      </div>

      {/* CR-3 — PDF language chooser (opens before Generate PDF) */}
      {pdfChooserOpen && (
        <PdfLangChooser
          initial={pdfLang}
          onCancel={() => setPdfChooserOpen(false)}
          onConfirm={genPdf}
        />
      )}

      {waOpen && (
        <WaModal
          pdfNameFor={pdfNameFor}
          initialLang={pdfLang}
          contacts={waContacts}
          initialPhone={bizSel.owner_whatsapp ?? undefined}
          onClose={() => setWaOpen(false)}
          onSend={sendWa}
        />
      )}
    </section>
  );
}

/** Small modal that picks the PDF language before generating (CR-3). */
function PdfLangChooser({
  initial,
  onCancel,
  onConfirm,
}: {
  initial: PdfLang;
  onCancel: () => void;
  onConfirm: (lang: PdfLang) => void;
}) {
  const [lang, setLang] = useState<PdfLang>(initial);
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[rgba(15,20,18,0.55)]"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-1 rounded-modal bg-bg-surface px-6 py-[22px] shadow-modal duration-200">
        <div className="mb-1 text-[16px] font-bold">Generate report PDF</div>
        <div className="mb-[14px] text-[12.5px] text-ink-soft">
          Choose the language — the report renders fully in it (Devanagari
          included).
        </div>
        <PdfLangPicker value={lang} onChange={setLang} className="mb-[18px]" />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[13px] font-semibold hover:border-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(lang)}
            className="rounded-lg bg-brand px-5 py-[9px] text-[13px] font-semibold text-white hover:bg-brand-hover"
          >
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}
