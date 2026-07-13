"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/components/shell/app-state";
import {
  categoryDrillMock,
  categoryIntelMock,
  categoryServicesMock,
  formatVolume,
} from "@/components/mocks/ai-tools";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const CAPTION =
  "text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft mb-[6px]";

/**
 * 7th AI Tools tab — Category Finder (EP-015 CategoryIntel). Current chips
 * with remove, related-categories grid with volume badges + drill-in,
 * related services + copy-all, from-URL / AI-chat suggesters, and
 * "Apply to audit" which updates P3's chips + fix #1 (app state).
 */
export function CategoryFinder({
  onUsage,
}: {
  /** Bumps the shared usage meter (AI suggesters count as requests). */
  onUsage: () => void;
}) {
  const toast = useToast();
  const { catApplied, setCatApplied } = useAppState();
  const [current, setCurrent] = useState(categoryIntelMock.current);
  const [drill, setDrill] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");

  const related =
    drill && categoryDrillMock[drill]
      ? categoryDrillMock[drill]
      : categoryIntelMock.related;
  const recCat = drill ?? "Mental health clinic";
  const services =
    categoryServicesMock[recCat] ?? categoryIntelMock.related_services;

  return (
    <div className="flex flex-wrap items-stretch gap-[14px]">
      {/* Left — current + suggesters */}
      <Card className="flex min-w-[280px] flex-1 flex-col gap-[14px] px-5 py-4">
        <div>
          <div className="mb-[2px] text-[13px] font-bold">
            Current categories — मनोवेध
          </div>
          <div className="mb-[10px] text-[11.5px] text-ink-faint">
            From the profile · ✗ = flagged generic
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {current.map((c, i) => (
              <span
                key={c}
                className={cn(
                  "inline-flex items-center gap-[6px] rounded-chip py-1 pl-[10px] pr-[6px] text-[12px] font-semibold",
                  c.includes("✗")
                    ? "border border-[rgba(179,55,43,0.25)] bg-band-crit-bg text-band-crit"
                    : "bg-bg-app text-ink",
                )}
              >
                {c}
                <button
                  type="button"
                  title="Remove category"
                  onClick={() =>
                    setCurrent((cur) => cur.filter((_, j) => j !== i))
                  }
                  className="inline-flex h-[15px] w-[15px] items-center justify-center rounded-full bg-[rgba(27,35,33,0.10)] text-[9px] font-bold hover:bg-band-crit hover:text-white"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className={CAPTION}>Search categories</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. counselling, therapy…"
            className="w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] text-[13px] outline-brand"
          />
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onUsage();
              toast("Reading grexa.site for category hints… (demo)");
            }}
            className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[14px] py-[9px] text-left text-[12.5px] font-semibold hover:border-ink"
          >
            Categories from website URL
          </button>
          <button
            type="button"
            onClick={() => setChatOpen((o) => !o)}
            className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[14px] py-[9px] text-left text-[12.5px] font-semibold hover:border-ink"
          >
            Categories from AI chat
          </button>
          {chatOpen && (
            <div className="rounded-[10px] border-[1.5px] border-brand p-[10px]">
              <textarea
                rows={2}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Describe the business… e.g. 'hypnosis clinic treating anxiety and habits'"
                className="w-full resize-y rounded-[7px] border border-[rgba(27,35,33,0.14)] bg-bg-surface px-[10px] py-2 text-[12.5px] leading-normal outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  onUsage();
                  setDrill("Mental health clinic");
                  toast("AI suggests: Mental health clinic (see related →)");
                }}
                className="mt-2 rounded-[7px] bg-brand px-[15px] py-[7px] text-[12px] font-semibold text-white hover:bg-brand-hover"
              >
                Suggest
              </button>
            </div>
          )}
          <a
            href={categoryIntelMock.trends_compare_url}
            target="_blank"
            rel="noreferrer"
            className="self-start rounded-chip border border-[rgba(27,35,33,0.14)] px-[13px] py-[6px] text-[12px] font-semibold text-brand no-underline hover:border-brand hover:bg-[#F0F5F2]"
          >
            Compare on Google Trends ↗
          </a>
        </div>
      </Card>

      {/* Right — related grid + services + recommendation */}
      <Card className="min-w-[300px] flex-[1.6] px-5 py-4">
        <div className="mb-[10px] flex flex-wrap items-baseline justify-between gap-[10px]">
          <div className="text-[13px] font-bold">
            Related categories{" "}
            <span className="text-[11px] font-medium text-ink-faint">
              · tap to explore · volume = searches/mo
            </span>
          </div>
          {drill && (
            <span className="text-[11.5px] text-ink-soft">
              related to <span className="font-bold">{drill}</span> ·{" "}
              <button
                type="button"
                onClick={() => setDrill(null)}
                className="font-semibold text-brand"
              >
                reset
              </button>
            </span>
          )}
        </div>
        <div className="mb-[18px] flex flex-wrap gap-[7px]">
          {related.map((r) => {
            const vol = formatVolume(r.monthly_volume);
            return (
              <button
                key={r.category}
                type="button"
                onClick={() => setDrill(r.category)}
                className={cn(
                  "inline-flex items-center rounded-chip border-[1.5px] px-3 py-[6px] text-[12.5px] font-semibold",
                  drill === r.category
                    ? "border-brand bg-[#F0F5F2] text-brand"
                    : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink hover:border-brand",
                )}
              >
                {r.category}
                {vol && (
                  <span className="ml-[6px] rounded-chip bg-band-warn-bg px-[6px] py-[1px] font-mono text-[10px] font-bold text-band-warn">
                    {vol}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-[10px]">
          <div className="text-[13px] font-bold">
            Related services — {recCat}
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(services.join(", "));
              toast("Services copied — paste into the GBP editor");
            }}
            className="text-[11.5px] font-semibold text-brand"
          >
            Copy all
          </button>
        </div>
        <div className="mb-[18px] flex flex-wrap gap-[6px]">
          {services.map((s) => (
            <span
              key={s}
              className="rounded-chip bg-bg-app px-[11px] py-1 text-[12px] font-medium text-ink"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[rgba(15,92,72,0.18)] bg-[#F0F5F2] px-[14px] py-3">
          <div className="min-w-0 text-[12.5px] leading-relaxed">
            <span className="font-bold">Recommended primary: {recCat}</span>
            <br />
            <span className="text-ink-soft">
              Higher intent + volume vs &quot;Hospital&quot; — generic and
              mismatched.
            </span>
          </div>
          {catApplied ? (
            <span className="rounded-chip bg-band-good px-[14px] py-[6px] text-[12px] font-bold text-white">
              ✓ Applied — see Audit Report
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCatApplied(true);
                toast("Applied — Audit Report categories + fix #1 updated");
              }}
              className="rounded-lg bg-brand px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-brand-hover"
            >
              Apply suggestion to audit
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
