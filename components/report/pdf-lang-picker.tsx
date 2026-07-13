"use client";

import { cn } from "@/lib/utils";
import type { PdfLang } from "@/components/shell/app-state";

export const PDF_LANGS: Array<{ value: PdfLang; label: string }> = [
  { value: "mr", label: "मराठी" },
  { value: "en", label: "English" },
  { value: "hinglish", label: "Hinglish" },
];

export const PDF_LANG_LABEL: Record<PdfLang, string> = {
  mr: "मराठी",
  en: "English",
  hinglish: "Hinglish",
};

/**
 * CR-3 — PDF language chooser. Shown before generating the P3 PDF and in the
 * WhatsApp modal's PDF step. मराठी is the default (Devanagari-first product).
 */
export function PdfLangPicker({
  value,
  onChange,
  className,
}: {
  value: PdfLang;
  onChange: (lang: PdfLang) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-[6px] text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft">
        PDF language
      </div>
      <div className="inline-flex overflow-hidden rounded-chip border-[1.5px] border-[rgba(27,35,33,0.14)]">
        {PDF_LANGS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            className={cn(
              "border-none px-[14px] py-[6px] text-[12.5px] font-semibold",
              l.value === value
                ? "bg-brand text-white"
                : "bg-bg-surface text-ink-soft hover:bg-[#FAF8F4]",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
