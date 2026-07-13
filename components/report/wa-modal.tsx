"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PdfLang } from "@/components/shell/app-state";
import {
  PDF_LANG_LABEL,
  PdfLangPicker,
} from "./pdf-lang-picker";

/**
 * WhatsApp send modal — +91 phone input, recent chips, PDF attachment
 * preview with a CR-3 language chooser, Cancel/Send (EP-007 on Day 5;
 * feature-flagged until keys arrive).
 */
export function WaModal({
  pdfNameFor,
  initialLang,
  recent,
  onClose,
  onSend,
}: {
  /** Filename for the chosen language (mirrors EP-006 naming). */
  pdfNameFor: (lang: PdfLang) => string;
  initialLang: PdfLang;
  recent: string[];
  onClose: () => void;
  onSend: (phone: string, lang: PdfLang) => void;
}) {
  const [phone, setPhone] = useState("");
  const [lang, setLang] = useState<PdfLang>(initialLang);
  const valid = phone.replace(/\D/g, "").length >= 10;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[rgba(15,20,18,0.55)]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-1 rounded-modal bg-bg-surface px-6 py-[22px] shadow-modal duration-200">
        <div className="mb-1 flex items-start justify-between gap-[10px]">
          <div className="text-[16px] font-bold">Send report on WhatsApp</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="px-[6px] py-[2px] text-[16px] text-ink-faint"
          >
            ✕
          </button>
        </div>
        <div className="mb-[14px] text-[12.5px] text-ink-soft">
          PDF + 2-line Marathi summary goes as one message.
        </div>
        <div className="mb-[10px] flex gap-2">
          <span className="flex flex-none items-center rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-app px-3 font-mono text-[14px] font-semibold">
            +91
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98XXXXXXXX"
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface p-3 font-mono text-[15px] outline-brand"
          />
        </div>
        <div className="mb-[6px] text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft">
          Recent
        </div>
        <div className="mb-3 flex flex-wrap gap-[6px]">
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setPhone(r.split("·")[0].trim())}
              className="rounded-chip border-[1.5px] border-[rgba(27,35,33,0.14)] bg-bg-surface px-[11px] py-[5px] font-mono text-[12px] font-semibold hover:border-brand"
            >
              {r}
            </button>
          ))}
        </div>
        <PdfLangPicker
          value={lang}
          onChange={setLang}
          className="mb-3"
        />
        <div className="mb-[14px] flex items-center gap-[9px] rounded-[9px] bg-bg-app px-3 py-[9px]">
          <span className="flex h-9 w-[30px] flex-none items-center justify-center rounded-[5px] bg-band-crit text-[8.5px] font-bold text-white">
            PDF
          </span>
          <div className="min-w-0">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold">
              {pdfNameFor(lang)}
            </div>
            <div className="text-[11px] text-ink-faint">
              {lang === "en" ? "+ 2-line English summary" : "+ 2-line Marathi summary"}
            </div>
          </div>
          <span className="ml-auto flex-none rounded-chip bg-bg-surface px-2 py-[2px] text-[10.5px] font-bold text-ink-soft">
            {PDF_LANG_LABEL[lang]}
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[13px] font-semibold hover:border-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onSend(phone, lang)}
            className={cn(
              "rounded-lg px-5 py-[9px] text-[13px] font-semibold",
              valid
                ? "bg-brand text-white hover:bg-brand-hover"
                : "cursor-not-allowed bg-[#E5E1D8] text-ink-faint",
            )}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
