"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { HeadingNode } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import { auditReportMock } from "@/components/mocks/audit-report";
import {
  psiDesktopMock,
  websiteAuditMock,
  websiteHoursNoteMock,
} from "@/components/mocks/website-audit";
import { ScoreGauge } from "@/components/report/score-gauge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const WARN_CHIP =
  "rounded-chip bg-band-warn-bg px-[11px] py-1 font-mono text-[11.5px] font-bold text-band-warn whitespace-nowrap";
const GOOD_TAG =
  "rounded-chip bg-band-good-bg px-[9px] py-[3px] text-[11px] font-bold text-band-good";
const CRIT_TAG =
  "rounded-chip bg-band-crit-bg px-[9px] py-[3px] text-[11px] font-bold text-band-crit";

/** PSI banding (0–49 red · 50–89 amber · 90+ green) ≠ rubric banding. */
function psiStroke(score: number): string {
  return score >= 90 ? "#177B4B" : score >= 50 ? "#C77D00" : "#B3372B";
}

/** Flatten the heading tree, deriving the "skipped Hx–Hy" warn labels. */
function flattenHeadings(
  nodes: HeadingNode[],
  depth = 0,
  parentLevel = 0,
): Array<{ node: HeadingNode; depth: number; warn: string | null }> {
  return nodes.flatMap((n) => {
    let warn: string | null = null;
    if (n.skip_flag && n.level - parentLevel > 1) {
      const from = parentLevel + 1;
      const to = n.level - 1;
      warn = from === to ? `skipped H${from}` : `skipped H${from}–H${to}`;
    }
    return [
      { node: n, depth, warn },
      ...flattenHeadings(n.children, depth + 1, n.level),
    ];
  });
}

const DEPTH_BANDS = [
  { label: "Thin 0–299", width: 30, bg: "#F9E5E2" },
  { label: "Light 300–499", width: 20, bg: "#FAEEDC" },
  { label: "Good 500–799", width: 30, bg: "#E3F2E9" },
  { label: "Strong 800+", width: 20, bg: "#CDE0D3" },
];

/** Word count → marker position on the 30/20/30/20 depth bar (caps at 1000). */
function depthMarkerPct(words: number): number {
  if (words < 300) return (words / 300) * 30;
  if (words < 500) return 30 + ((words - 300) / 200) * 20;
  if (words < 800) return 50 + ((words - 500) / 300) * 30;
  return Math.min(100, 80 + ((words - 800) / 200) * 20);
}

/** P3b Website Audit — every check feeds the single "Website 6/10" rubric row. */
export default function WebsiteAuditPage() {
  const toast = useToast();
  const { bizSel, setBizSelId, bizSelIsFixture } = useAppState();
  const report = auditReportMock;
  const web = websiteAuditMock;
  const [copied, setCopied] = useState<number | null>(null);

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
          Website audit needs a completed audit with website checks on. Full
          data lives on मनोवेध हिप्नोक्लिनिक.
          {bizSel.website === null && (
            <>
              {" "}
              This business has no website on its profile — the Website rubric
              weight renormalises across the other rows (§2.5), so the score
              stays fair.
            </>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
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

  const copySuggestion = (text: string, i: number) => {
    void navigator.clipboard?.writeText(text);
    setCopied(i);
    toast(i === 0 ? "Marathi description copied" : "English description copied");
    setTimeout(() => setCopied(null), 1600);
  };

  const websiteRubric = report.rubric.find((r) => r.key === "website");
  const mobilePsi = web.summary.psi_score ?? 0;

  return (
    <section className="flex flex-col gap-[14px]">
      {/* Header card */}
      <Card className="flex flex-wrap items-center gap-[10px] px-5 py-[14px]">
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold">
            Website audit — {web.summary.provider}
          </div>
          <div className="text-[12px] text-ink-soft">
            {web.summary.rented_subdomain && "Rented subdomain · "}every check
            below feeds the single &quot;Website {websiteRubric?.points}/
            {websiteRubric?.max}&quot; rubric row
          </div>
        </div>
        <span className={WARN_CHIP}>PageSpeed mobile · {mobilePsi}</span>
        <span className={WARN_CHIP}>
          Website · {websiteRubric?.points}/{websiteRubric?.max}
        </span>
      </Card>

      {/* PSI gauges */}
      <Card className="flex flex-wrap items-center justify-around gap-4 px-5 py-4">
        <div className="flex flex-col items-center gap-1">
          <ScoreGauge
            score={mobilePsi}
            size={110}
            stroke={psiStroke(mobilePsi)}
            subtitle="PSI"
          />
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft">
            PageSpeed · Mobile
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ScoreGauge
            score={psiDesktopMock}
            size={110}
            stroke={psiStroke(psiDesktopMock)}
            subtitle="PSI"
          />
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft">
            PageSpeed · Desktop
          </div>
        </div>
        <div className="max-w-[300px] text-[12px] leading-relaxed text-ink-soft">
          Mobile is what customers in Karad use — under 50 turns visitors away
          before the page opens. PSI is a free Google API (no DataForSEO
          spend).
        </div>
      </Card>

      {/* NAP + hours match */}
      <div className="flex flex-wrap items-stretch gap-[14px]">
        <Card className="min-w-[300px] flex-[1.3] px-5 py-4">
          <div className="mb-[10px] text-[13px] font-bold">
            NAP match — profile vs website
          </div>
          <div className="grid grid-cols-[0.6fr_1.2fr_1.2fr_0.9fr] gap-2 py-[6px] text-[10px] font-semibold uppercase tracking-[0.7px] text-ink-soft">
            <div>Field</div>
            <div>Google profile</div>
            <div>Website</div>
            <div>Status</div>
          </div>
          {web.nap.map((row) => (
            <div
              key={row.field}
              className="grid grid-cols-[0.6fr_1.2fr_1.2fr_0.9fr] items-center gap-2 border-t border-[rgba(27,35,33,0.07)] py-2 text-[12.5px]"
            >
              <div className="font-semibold capitalize">{row.field}</div>
              <div
                title={row.gbp_value ?? undefined}
                className="overflow-hidden text-ellipsis whitespace-nowrap text-ink-soft"
              >
                {row.gbp_value ?? "—"}
              </div>
              <div
                title={row.website_value ?? undefined}
                className="overflow-hidden text-ellipsis whitespace-nowrap text-ink-soft"
              >
                {row.website_value ?? "—"}
              </div>
              <div>
                <span
                  className={cn(
                    "whitespace-nowrap rounded-chip px-[9px] py-[3px] text-[10.5px] font-bold",
                    row.match
                      ? "bg-band-good-bg text-band-good"
                      : "bg-band-crit-bg text-band-crit",
                  )}
                >
                  {row.match
                    ? "✓ Match"
                    : row.gbp_value === null && row.website_value === null
                      ? "✕ Missing on both"
                      : "✕ Mismatch"}
                </span>
              </div>
            </div>
          ))}
          <div className="mt-[10px] text-[11.5px] font-medium text-band-crit">
            Phone is missing on BOTH — fixing it lifts NAP and click-to-call
            together (Fix #2).
          </div>
        </Card>

        <Card className="min-w-[260px] flex-1 px-5 py-4">
          <div className="mb-[10px] text-[13px] font-bold">
            Operating-hours match{" "}
            <span className="ml-[6px] rounded-chip bg-band-good-bg px-2 py-[2px] text-[10.5px] font-bold text-band-good">
              {web.hours_match.filter((h) => h.match).length}/
              {web.hours_match.length} match
            </span>
          </div>
          {web.hours_match.map((h) => (
            <div
              key={h.day}
              className="flex items-center justify-between gap-[10px] border-t border-[rgba(27,35,33,0.06)] py-[5px] text-[12.5px]"
            >
              <span className="w-[38px] text-ink-soft">{h.day}</span>
              <span className="font-mono text-[11.5px]">{h.website}</span>
              <span
                className={cn(
                  "inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[10px] font-bold",
                  h.match
                    ? "bg-band-good-bg text-band-good"
                    : "bg-band-crit-bg text-band-crit",
                )}
              >
                {h.match ? "✓" : "✕"}
              </span>
            </div>
          ))}
          <div className="mt-[10px] text-[11px] text-ink-faint">
            {websiteHoursNoteMock}
          </div>
        </Card>
      </div>

      {/* Title/meta + local keywords */}
      <div className="flex flex-wrap items-stretch gap-[14px]">
        <Card className="min-w-[310px] flex-[1.4] px-5 py-4">
          <div className="mb-2 text-[13px] font-bold">Title tag</div>
          <div className="rounded-[9px] bg-bg-app px-3 py-[10px] text-[12.5px] leading-relaxed">
            {web.title.value}
          </div>
          <div className="mb-4 mt-2 flex flex-wrap gap-[6px]">
            <span className={web.title.has_category ? GOOD_TAG : CRIT_TAG}>
              {web.title.has_category
                ? `✓ category found — "${report.categories.primary}"`
                : "✕ category missing"}
            </span>
            <span className={web.title.has_city ? GOOD_TAG : CRIT_TAG}>
              {web.title.has_city
                ? `✓ city found — "${report.business.city}"`
                : "✕ city missing"}
            </span>
          </div>
          <div className="mb-2 text-[13px] font-bold">Meta description</div>
          <div className="rounded-[9px] bg-bg-app px-3 py-[10px] text-[12.5px] leading-relaxed">
            {web.meta.value}
          </div>
          <div className="mb-[10px] mt-2 flex flex-wrap gap-[6px]">
            <span className={web.meta.has_category ? GOOD_TAG : CRIT_TAG}>
              {web.meta.has_category ? "✓ category found" : "✕ category missing"}
            </span>
            <span className={web.meta.has_locality ? GOOD_TAG : CRIT_TAG}>
              {web.meta.has_locality ? "✓ locality found" : "✕ locality missing"}
            </span>
          </div>
          <div className="mb-[6px] text-[10.5px] font-semibold uppercase tracking-[0.7px] text-ink-soft">
            AI-suggested replacements
          </div>
          {web.meta.ai_suggestions.map((s, i) => (
            <div
              key={i}
              className={cn(
                "rounded-[9px] border border-[rgba(15,92,72,0.18)] bg-[#F0F5F2] px-3 py-[10px]",
                i === 0 && "mb-2",
              )}
            >
              <div className="mb-[7px] text-[12.5px] leading-[1.65]">{s}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] text-ink-soft">
                  {s.length} / 160
                </span>
                <button
                  type="button"
                  onClick={() => copySuggestion(s, i)}
                  className="rounded-md border-[1.5px] border-brand bg-bg-surface px-[13px] py-[5px] text-[11.5px] font-semibold text-brand"
                >
                  {copied === i ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </Card>

        <Card className="min-w-[280px] flex-1 px-5 py-4">
          <div className="mb-[10px] text-[13px] font-bold">Local keywords</div>
          {web.local_keywords.map((kw) => (
            <div key={kw.keyword}>
              <div className="mb-[5px] flex items-center gap-2">
                <span className="text-[12.5px] font-bold">
                  &quot;{kw.keyword}&quot;
                </span>
                <span className={kw.found ? GOOD_TAG : CRIT_TAG}>
                  {kw.found
                    ? kw.snippets.length > 1
                      ? "✓ content + headings"
                      : "✓ found"
                    : "✕ not found"}
                </span>
              </div>
              {kw.snippets.length > 0 && (
                <div className="mb-[10px] rounded-[7px] bg-bg-app px-[10px] py-[7px] font-mono text-[11px] leading-[1.7] text-ink-soft">
                  {kw.snippets.map((s, i) => (
                    <div key={i}>{s}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="mb-1 mt-4 text-[13px] font-bold">Category pages</div>
          {web.category_pages.map((cp) => (
            <div
              key={cp.category}
              className="flex items-center justify-between gap-[10px] border-t border-[rgba(27,35,33,0.07)] py-2"
            >
              <span className="text-[12.5px] font-semibold">{cp.category}</span>
              <span className={cp.matched_page ? GOOD_TAG : CRIT_TAG}>
                {cp.matched_page ? `✓ ${cp.matched_page}` : "✕ no matching page"}
              </span>
            </div>
          ))}
          <div className="mt-2 text-[11px] leading-normal text-ink-faint">
            Add one service page per category — it helps Google connect the
            website to the profile.
          </div>
        </Card>
      </div>

      {/* Content depth + spelling · heading tree + click-to-call */}
      <div className="flex flex-wrap items-stretch gap-[14px]">
        <Card className="min-w-[300px] flex-[1.2] px-5 py-4">
          <div className="mb-[10px] text-[13px] font-bold">
            Content depth{" "}
            <span className="ml-[6px] rounded-chip bg-band-good-bg px-[9px] py-[2px] font-mono text-[11.5px] font-bold text-band-good">
              {web.content_depth.word_count} words ·{" "}
              {web.content_depth.band.charAt(0).toUpperCase() +
                web.content_depth.band.slice(1)}
            </span>
          </div>
          <div className="relative mb-1">
            <div className="flex h-[14px] overflow-hidden rounded-[7px]">
              {DEPTH_BANDS.map((b) => (
                <div
                  key={b.label}
                  style={{ width: `${b.width}%`, background: b.bg }}
                />
              ))}
            </div>
            <div
              className="absolute -bottom-1 -top-1 w-[3px] rounded-[2px] bg-bg-nav"
              style={{
                left: `${depthMarkerPct(web.content_depth.word_count).toFixed(1)}%`,
              }}
            />
          </div>
          <div className="mb-[18px] flex font-mono text-[9.5px] text-ink-faint">
            {DEPTH_BANDS.map((b) => (
              <div key={b.label} style={{ width: `${b.width}%` }}>
                {b.label}
              </div>
            ))}
          </div>
          <div className="mb-2 text-[13px] font-bold">
            Spelling issues{" "}
            <span className="ml-[6px] rounded-chip bg-band-warn-bg px-2 py-[2px] text-[10.5px] font-bold text-band-warn">
              {web.spelling_issues.length} found
            </span>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2 py-[6px] text-[10px] font-semibold uppercase tracking-[0.7px] text-ink-soft">
            <div>Found</div>
            <div>Suggested</div>
            <div>Where</div>
          </div>
          {web.spelling_issues.map((s) => (
            <div
              key={s.found}
              className="grid grid-cols-[1fr_1fr_1.2fr] items-center gap-2 border-t border-[rgba(27,35,33,0.07)] py-2 text-[12.5px]"
            >
              <span className="font-mono font-bold text-band-crit">
                &quot;{s.found}&quot;
              </span>
              <span className="font-mono font-bold text-band-good">
                &quot;{s.suggested}&quot;
              </span>
              <span className="text-ink-soft">{s.location}</span>
            </div>
          ))}
        </Card>

        <Card className="min-w-[280px] flex-1 px-5 py-4">
          <div className="mb-[6px] text-[13px] font-bold">
            Heading structure{" "}
            <span className="ml-[6px] rounded-chip bg-band-warn-bg px-2 py-[2px] text-[10.5px] font-bold text-band-warn">
              {web.heading_skips.length} skips
            </span>
          </div>
          {flattenHeadings(web.headings).map(({ node, depth, warn }, i) => (
            <div
              key={`${node.text}-${i}`}
              className="flex items-center gap-2 border-t border-[rgba(27,35,33,0.06)] py-[5px]"
              style={{ paddingLeft: depth * 18 }}
            >
              <span
                className={cn(
                  "flex-none rounded px-[7px] py-[2px] font-mono text-[10.5px] font-bold",
                  warn
                    ? "bg-band-warn-bg text-band-warn"
                    : "bg-bg-app text-ink-soft",
                )}
              >
                H{node.level}
              </span>
              <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px]">
                {node.text}
              </span>
              {warn && (
                <span className="flex-none rounded-chip bg-band-warn-bg px-[7px] py-[2px] text-[10px] font-bold text-band-warn">
                  ⚠ {warn}
                </span>
              )}
            </div>
          ))}
          <div className="mt-[14px] rounded-[9px] border border-dashed border-[rgba(27,35,33,0.22)] px-[13px] py-[11px] text-[12px] leading-relaxed text-ink-soft">
            <span className="font-bold text-ink">Mobile click-to-call:</span>{" "}
            {web.click_to_call === "ok"
              ? "working — the phone number is tappable on mobile."
              : web.click_to_call === "missing"
                ? "missing — the number renders as plain text."
                : "not applicable — no phone number on profile or website. Add the phone first (Fix #2), then this check re-runs."}
          </div>
        </Card>
      </div>
    </section>
  );
}
