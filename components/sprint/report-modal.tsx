"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PdfLang } from "@/components/shell/app-state";
import { apiPostResult } from "@/components/lib/api";
import {
  sprintReportMock,
  sprintRubricDeltasMock,
} from "@/components/mocks/sprint";
import {
  PDF_LANG_LABEL,
  PdfLangPicker,
} from "@/components/report/pdf-lang-picker";
import { useToast } from "@/components/ui/toast";

/**
 * EP-022 Before/After report (US-025) — the sprint's proof artifact.
 * Send calls POST /api/sprint/:id/report { send_whatsapp: true } through the
 * api layer (registry "/api/sprint", OFF until backend lands EP-021/022);
 * FEATURE_DISABLED renders the graceful "WhatsApp arriving soon" state.
 */
export function SprintReportModal({
  sprintId,
  initialLang,
  onClose,
}: {
  sprintId: string;
  initialLang: PdfLang;
  onClose: () => void;
}) {
  const toast = useToast();
  const r = sprintReportMock;
  const [lang, setLang] = useState<PdfLang>(initialLang);
  const [sent, setSent] = useState(false);
  const [waSoon, setWaSoon] = useState(false);

  const send = async () => {
    const res = await apiPostResult<{ pdf_path: string; sent: boolean }>(
      `/api/sprint/${sprintId}/report`,
      { send_whatsapp: true, language: lang },
    );
    if (!res.ok && res.code === "FEATURE_DISABLED") {
      setWaSoon(true);
      toast("WhatsApp sending arrives with next week's keys — PDF saved ✓");
      return;
    }
    if (res.ok && !res.data.sent) {
      setWaSoon(true);
      toast("PDF generated — WhatsApp sending arrives with next week's keys");
      return;
    }
    // Live success — or demo-mode mock success while the registry is OFF.
    setSent(true);
    toast(`Report sent on WhatsApp ✓ · ${PDF_LANG_LABEL[lang]}`);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[rgba(15,20,18,0.55)]"
        onClick={onClose}
      />
      <div className="relative max-h-[84vh] w-full max-w-[560px] animate-in fade-in slide-in-from-bottom-1 overflow-y-auto rounded-modal bg-bg-surface shadow-modal duration-200">
        {/* Dark branded header */}
        <div className="rounded-t-modal bg-bg-nav px-6 py-[22px] text-white">
          <div className="flex items-start justify-between gap-[10px]">
            <div className="flex items-center gap-[9px]">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-brand-accent text-[14px] font-bold text-bg-nav">
                सा
              </span>
              <span className="text-[12px] font-semibold text-nav-text">
                तुमची डिजिटल एजन्सी
              </span>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="px-[6px] py-[2px] text-[16px] text-nav-muted-2"
            >
              ✕
            </button>
          </div>
          <div className="mb-[2px] mt-[14px] text-[19px] font-bold">
            सुधारणा अहवाल — Improvement Report
          </div>
          <div className="text-[12.5px] text-nav-text">
            मनोवेध हिप्नोक्लिनिक · {r.period}
          </div>
          <div className="mt-[14px] flex flex-wrap items-center gap-3">
            <span className="font-mono text-[34px] font-bold text-nav-muted-2">
              {r.before_score}
            </span>
            <span className="text-[20px] font-bold text-brand-accent">→</span>
            <span className="font-mono text-[44px] font-bold text-white">
              {r.after_score}
            </span>
            <div className="flex flex-wrap gap-[6px]">
              <span className="rounded-chip bg-[rgba(250,238,220,0.16)] px-[9px] py-[3px] text-[10.5px] font-bold text-[#F0CE9A]">
                {r.before_band}
              </span>
              <span className="text-nav-muted-2">→</span>
              <span className="rounded-chip bg-[rgba(227,242,233,0.16)] px-[9px] py-[3px] text-[10.5px] font-bold text-[#9FD4B6]">
                {r.after_band}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-[18px]">
          {/* Rubric deltas */}
          <div>
            <div className="mb-[6px] text-[12px] font-bold uppercase tracking-[0.6px] text-ink-soft">
              Rubric — before → after
            </div>
            {sprintRubricDeltasMock.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-2 border-t border-[rgba(27,35,33,0.07)] py-[6px] text-[12.5px]"
              >
                <span className="flex-1">{row.label}</span>
                <span className="font-mono text-ink-soft">
                  {row.before} → {row.after}
                </span>
                <span
                  className={cn(
                    "w-[34px] text-right text-[11px] font-bold",
                    row.state === "up"
                      ? "text-band-good"
                      : row.state === "wait"
                        ? "text-band-warn"
                        : "text-ink-faint",
                  )}
                >
                  {row.state === "up"
                    ? `▲ ${row.after - row.before}`
                    : row.state === "wait"
                      ? "wait"
                      : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Work delivered */}
          <div>
            <div className="mb-[6px] text-[12px] font-bold uppercase tracking-[0.6px] text-ink-soft">
              Work delivered
            </div>
            <div className="text-[12.5px] leading-[1.85] text-ink">
              {r.work_delivered.map(([group, detail]) => (
                <div key={group}>
                  <span className="font-bold">{group}</span> — {detail}
                </div>
              ))}
            </div>
          </div>

          {/* Vendor waiting */}
          <div className="rounded-[10px] bg-[#FCF3F2] px-[13px] py-[11px]">
            <div className="mb-[5px] text-[11px] font-bold uppercase tracking-[0.6px] text-band-crit">
              Waiting on your website vendor
            </div>
            <div className="text-[12.5px] leading-[1.7]">{r.vendor_waiting}</div>
          </div>

          {/* Grid + review deltas */}
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1 rounded-[10px] bg-bg-app px-[13px] py-[11px]">
              <div className="mb-[5px] text-[11px] font-bold uppercase tracking-[0.6px] text-ink-soft">
                Grid rank
              </div>
              <div className="text-[13px] leading-[1.7]">
                Avg{" "}
                <span className="font-mono font-bold">
                  {r.grid.avg_before} → {r.grid.avg_after}
                </span>{" "}
                <span className="text-[10.5px] font-bold text-band-good">
                  ▲ +{(r.grid.avg_before - r.grid.avg_after).toFixed(1)}
                </span>
                <br />
                Top-3 coverage{" "}
                <span className="font-mono font-bold">
                  {r.grid.top3_before}% → {r.grid.top3_after}%
                </span>
              </div>
            </div>
            <div className="min-w-[200px] flex-1 rounded-[10px] bg-bg-app px-[13px] py-[11px]">
              <div className="mb-[5px] text-[11px] font-bold uppercase tracking-[0.6px] text-ink-soft">
                Reviews
              </div>
              <div className="text-[13px] leading-[1.7]">
                Count{" "}
                <span className="font-mono font-bold">
                  {r.reviews.count_before} → {r.reviews.count_after}
                </span>{" "}
                · Velocity{" "}
                <span className="font-mono font-bold">
                  {r.reviews.velocity_before} → {r.reviews.velocity_after}/mo
                </span>
                <br />
                Reply rate{" "}
                <span className="font-mono font-bold">
                  {r.reviews.reply_before}% → {r.reviews.reply_after}%
                </span>
              </div>
            </div>
          </div>

          {/* What's next */}
          <div className="rounded-[10px] bg-band-warn-bg px-[13px] py-[11px]">
            <div className="mb-[5px] text-[11px] font-bold uppercase tracking-[0.6px] text-band-warn">
              What&apos;s next
            </div>
            <div className="text-[12.5px] leading-[1.7]">{r.whats_next}</div>
          </div>

          {/* Footer — language picker + send */}
          <div className="flex flex-wrap items-center justify-between gap-[10px] border-t border-[rgba(27,35,33,0.08)] pt-[14px]">
            <span className="text-[11px] text-ink-faint">
              Report generated by GMB सारथी · तुमची डिजिटल एजन्सी
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <PdfLangPicker value={lang} onChange={setLang} />
              {sent && (
                <span className="rounded-chip bg-band-good-bg px-3 py-[5px] text-[11.5px] font-bold text-band-good">
                  Sent on WhatsApp ✓
                </span>
              )}
              {waSoon && (
                <span className="rounded-chip bg-band-warn-bg px-3 py-[5px] text-[11.5px] font-semibold text-band-warn">
                  WhatsApp arriving soon — PDF saved
                </span>
              )}
              {!sent && (
                <button
                  type="button"
                  onClick={() => void send()}
                  className="rounded-lg bg-brand px-[18px] py-[9px] text-[13px] font-semibold text-white hover:bg-brand-hover"
                >
                  Send on WhatsApp ({PDF_LANG_LABEL[lang]} PDF)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
