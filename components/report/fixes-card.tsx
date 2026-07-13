"use client";

import { useState } from "react";
import type { TopFixes } from "@/types";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";

type Lang = "mr" | "en";

/**
 * Top 5 fixes — मराठी/English toggle, numbered marigold circles, per-row
 * inline Edit → textarea + Save/Cancel. Edits persist per language (they
 * carry into the PDF).
 */
export function FixesCard({ topFixes }: { topFixes: TopFixes[] }) {
  const [lang, setLang] = useState<Lang>("mr");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [overrides, setOverrides] = useState<
    Record<Lang, Record<number, string>>
  >({ mr: {}, en: {} });

  const base = topFixes.find((f) => f.lang === lang)?.items ?? [];
  const items = base.map((t, i) => overrides[lang][i] ?? t);

  const startEdit = (i: number) => {
    setEditIdx(i);
    setDraft(items[i]);
  };
  const save = () => {
    if (editIdx === null) return;
    setOverrides((o) => ({
      ...o,
      [lang]: { ...o[lang], [editIdx]: draft },
    }));
    setEditIdx(null);
  };

  return (
    <Card className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-[10px]">
        <div>
          <div className="text-[14.5px] font-bold">Top 5 fixes</div>
          <div className="text-[12px] text-ink-soft">
            AI-drafted · editable before PDF
          </div>
        </div>
        <Segmented
          options={["mr", "en"] as const}
          value={lang}
          onChange={(l) => {
            setLang(l);
            setEditIdx(null);
          }}
          labels={{ mr: "मराठी", en: "English" }}
        />
      </div>
      <div className="flex flex-col">
        {items.map((text, i) => (
          <div
            key={`${lang}-${i}`}
            className="flex items-start gap-3 border-t border-[rgba(27,35,33,0.07)] py-[10px]"
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-accent font-mono text-[12.5px] font-bold text-bg-nav">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              {editIdx === i ? (
                <>
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full resize-y rounded-lg border-[1.5px] border-brand bg-bg-surface px-[11px] py-[9px] text-[13.5px] leading-relaxed outline-brand"
                  />
                  <div className="mt-2 flex gap-[6px]">
                    <button
                      type="button"
                      onClick={save}
                      className="rounded-[7px] bg-brand px-[14px] py-[6px] text-[12px] font-semibold text-white hover:bg-brand-hover"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIdx(null)}
                      className="rounded-[7px] border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[14px] py-[6px] text-[12px] font-semibold hover:border-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-[14px] leading-[1.55]">{text}</div>
              )}
            </div>
            {editIdx !== i && (
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="flex-none rounded-md border border-[rgba(27,35,33,0.14)] bg-bg-surface px-[10px] py-1 text-[11.5px] font-semibold text-ink-soft hover:border-ink hover:text-ink"
              >
                Edit
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
