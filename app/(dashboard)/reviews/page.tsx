"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ReviewItem } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import {
  anubhavReviewIds,
  draftReplyMock,
  initialDraftsMock,
  keywordCloudMock,
  reviewFiltersMock,
  reviewQualityStripMock,
  reviewStatsMock,
  reviewTrendMock,
  reviewsMock,
  type ReviewFilterKey,
} from "@/components/mocks/reviews";
import { auditReportMock } from "@/components/mocks/audit-report";
import { relativeDate } from "@/components/lib/format";
import { useApiGet } from "@/components/hooks/use-api-get";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

/** Contract bundle for `GET /api/reviews/:businessId` (mock = fixture). */
const REVIEWS_FIXTURE = {
  stats: reviewStatsMock,
  reviews: reviewsMock,
  cloud: keywordCloudMock,
  trend: reviewTrendMock,
};

type Lang = "mr" | "en";
type Tone = "Warm" | "Professional";

interface DraftState {
  lang: Lang;
  tone: Tone;
  /** Regenerate alternates variants. */
  alt: boolean;
  /** Manual edit override (survives until lang/tone change). */
  override: string | null;
  visible: boolean;
}

const KPI_CAPTION =
  "text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft";
const ACTION_BTN =
  "rounded-[7px] border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[13px] py-[7px] text-[12px] font-semibold hover:border-ink";

/** P6 Review Inbox — KPIs, quality strip, filters, AI drafts, cloud, trend. */
export default function ReviewInboxPage() {
  const toast = useToast();
  const { bizSel, setBizSelId, bizSelIsFixture } = useAppState();
  // Live `/api/reviews/:businessId` when flipped in LIVE_ENDPOINTS.
  const reviewsQ = useApiGet(`/api/reviews/${bizSel.id}`, REVIEWS_FIXTURE, {
    emptyValue: { stats: reviewStatsMock, reviews: [], cloud: [], trend: [] },
  });
  const bundle = reviewsQ.data ?? REVIEWS_FIXTURE;
  const stats = bundle.stats;

  const [filter, setFilter] = useState<ReviewFilterKey>("all");
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() =>
    Object.fromEntries(
      Object.entries(initialDraftsMock).map(([id, d]) => [
        id,
        {
          lang: d.lang,
          tone: d.tone,
          alt: false,
          override: d.text,
          visible: true,
        },
      ]),
    ),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

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
          Review inbox for this business isn&apos;t mocked — the full inbox
          lives on मनोवेध हिप्नोक्लिनिक.
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setBizSelId(auditReportMock.business.id)}
          >
            ← मनोवेध हिप्नोक्लिनिक
          </Button>
        </div>
      </div>
    );
  }

  if (reviewsQ.status === "loading") {
    return (
      <section className="flex flex-col gap-[14px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px]" />
          ))}
        </div>
        <Skeleton className="h-[44px]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px]" />
        ))}
      </section>
    );
  }

  if (reviewsQ.status === "error") {
    return (
      <Card className="flex max-w-[560px] flex-col items-start gap-3 px-6 py-7">
        <div className="text-[13.5px] font-bold text-band-crit">
          Couldn&apos;t load the review inbox
        </div>
        <div className="text-[12.5px] text-ink-soft">{reviewsQ.error}</div>
        <Button variant="ghost" size="xs" onClick={reviewsQ.retry}>
          Retry
        </Button>
      </Card>
    );
  }

  const conn = bizSel.connection_status;

  const rows = bundle.reviews.filter((r) => {
    if (filter === "pending") return !r.replied;
    if (filter === "5") return r.rating === 5;
    if (filter === "low") return r.rating <= 3;
    if (filter === "replied") return r.replied;
    if (filter === "kw") return anubhavReviewIds.has(r.review_id);
    return true;
  });

  const draftFor = (r: ReviewItem): { state: DraftState; text: string } | null => {
    const st = drafts[r.review_id];
    if (!st || !st.visible || r.replied) return null;
    const text =
      st.override ??
      draftReplyMock(r.author ?? "", st.lang, st.tone, st.alt ? 1 : 0);
    return { state: st, text };
  };

  const patchDraft = (id: string, patch: Partial<DraftState>) =>
    setDrafts((d) => ({
      ...d,
      [id]: {
        ...(d[id] ?? {
          lang: "mr" as Lang,
          tone: "Warm" as Tone,
          alt: false,
          override: null,
          visible: false,
        }),
        ...patch,
      },
    }));

  const draftAi = (r: ReviewItem) => {
    setBusyId(r.review_id);
    setTimeout(() => {
      setBusyId(null);
      patchDraft(r.review_id, { visible: true, override: null });
    }, 900);
  };

  const regenerate = (r: ReviewItem) => {
    setBusyId(r.review_id);
    setTimeout(() => {
      setBusyId(null);
      patchDraft(r.review_id, {
        alt: !drafts[r.review_id]?.alt,
        override: null,
      });
    }, 800);
  };

  const trendPts = (() => {
    const W = 220;
    const H = 92;
    const max = Math.max(...bundle.trend.map((p) => p.cumulative), 1);
    const t0 = new Date(bundle.trend[0]?.date ?? 0).getTime();
    const t1 = new Date(
      bundle.trend[bundle.trend.length - 1]?.date ?? 0,
    ).getTime();
    return bundle.trend.map((p) => {
      const x = 8 + ((new Date(p.date).getTime() - t0) / (t1 - t0)) * (W - 28);
      const y = H - 8 - (p.cumulative / max) * (H - 20);
      return { x, y, ...p };
    });
  })();
  const lastPt = trendPts[trendPts.length - 1];

  return (
    <section className="flex flex-col gap-[14px]">
      {/* KPI row */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <Card className="px-4 py-[13px]">
          <div className={KPI_CAPTION}>Avg rating</div>
          <div className="mt-1 font-mono text-[23px] font-semibold">
            {stats.avg_rating.toFixed(2)}
            <span className="text-[16px] text-band-warn-strong">★</span>
          </div>
        </Card>
        <Card className="px-4 py-[13px]">
          <div className={KPI_CAPTION}>Owner reply rate</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-[23px] font-semibold text-band-crit">
              {stats.reply_rate_pct}%
            </span>
            <span className="rounded-chip bg-band-crit-bg px-[7px] py-[2px] text-[10.5px] font-bold text-band-crit">
              flagged
            </span>
          </div>
        </Card>
        <Card className="px-4 py-[13px]">
          <div className={KPI_CAPTION}>Velocity</div>
          <div className="mt-1 font-mono text-[23px] font-semibold">
            {stats.velocity_per_month_6m}
            <span className="text-[13px] text-ink-soft">/mo</span>
          </div>
        </Card>
        <Card className="px-4 py-[13px]">
          <div className={KPI_CAPTION}>With photos</div>
          <div className="mt-1 font-mono text-[23px] font-semibold text-band-warn">
            {stats.with_photos}
          </div>
        </Card>
      </div>

      {/* Review-quality strip */}
      <Card className="flex flex-wrap items-center gap-4 px-4 py-[10px]">
        <span className="flex-none text-[10px] font-bold uppercase tracking-[0.8px] text-ink-soft">
          Review quality
        </span>
        {reviewQualityStripMock.map((q) => (
          <span
            key={q.label}
            className="whitespace-nowrap text-[11.5px] text-ink-soft"
          >
            <span className="font-mono font-bold text-ink">{q.value}</span>{" "}
            {q.label}
          </span>
        ))}
        <span className="text-[10.5px] text-ink-faint">
          fake-pattern checks
        </span>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-[6px]">
        {reviewFiltersMock.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-lg border-[1.5px] px-[14px] py-[7px] text-[12.5px] font-semibold",
              filter === f.key
                ? "border-brand bg-brand text-white"
                : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink-soft hover:border-brand",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-[14px]">
        {/* Review cards */}
        <div className="flex min-w-[320px] flex-[1.7] flex-col gap-[10px]">
          {rows.map((r) => {
            const d = draftFor(r);
            const busy = busyId === r.review_id;
            const editing = editId === r.review_id;
            return (
              <Card key={r.review_id} className="px-4 py-[14px]">
                <div className="mb-[7px] flex flex-wrap justify-between gap-[10px]">
                  <div className="flex min-w-0 items-center gap-[9px]">
                    <span className="inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-brand text-[12.5px] font-bold text-white">
                      {r.author?.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold">
                        {r.author}
                      </div>
                      <div className="text-[11px] text-ink-soft">
                        {r.author_stats?.is_local_guide && "Local Guide · "}
                        {r.author_stats?.review_count} review
                        {(r.author_stats?.review_count ?? 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-[13px] tracking-[1.5px]",
                        r.rating >= 4
                          ? "text-band-warn-strong"
                          : "text-band-crit",
                      )}
                    >
                      {"★★★★★".slice(0, r.rating)}
                    </span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {r.review_ts ? relativeDate(r.review_ts) : "—"}
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-chip px-2 py-[3px] text-[10.5px] font-bold",
                        r.replied
                          ? "bg-band-good-bg text-band-good"
                          : "bg-band-crit-bg text-band-crit",
                      )}
                    >
                      {r.replied ? "Replied ✓" : "No reply"}
                    </span>
                  </div>
                </div>
                <div className="mb-[9px] text-[13.5px] leading-relaxed">
                  {r.text}
                </div>

                {r.owner_reply && (
                  <div className="rounded-lg bg-bg-app px-3 py-[9px]">
                    <div className="mb-[3px] text-[10.5px] font-semibold uppercase tracking-[0.6px] text-ink-soft">
                      Owner reply
                    </div>
                    <div className="text-[13px] leading-[1.55]">
                      {r.owner_reply}
                    </div>
                  </div>
                )}

                {busy && (
                  <div className="flex items-center gap-[9px] py-[5px]">
                    <span className="h-[14px] w-[14px] flex-none animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-[#EDEAE3] border-t-brand" />
                    <span className="text-[12.5px] text-ink-soft">
                      Drafting reply…
                    </span>
                  </div>
                )}

                {!busy && d && (
                  <div className="rounded-lg border border-[rgba(15,92,72,0.18)] bg-[#F0F5F2] px-3 py-[10px]">
                    <div className="mb-[5px] flex flex-wrap justify-between gap-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-brand">
                        AI draft · {d.state.lang === "mr" ? "मराठी" : "English"}{" "}
                        · {d.state.tone}
                      </span>
                      <span className="flex gap-[5px]">
                        <select
                          value={d.state.lang}
                          onChange={(e) =>
                            patchDraft(r.review_id, {
                              lang: e.target.value as Lang,
                              override: null,
                            })
                          }
                          className="cursor-pointer rounded-chip border border-[rgba(27,35,33,0.16)] bg-bg-surface px-[6px] py-[2px] font-sans text-[10.5px] font-semibold text-ink-soft"
                        >
                          <option value="mr">मराठी</option>
                          <option value="en">English</option>
                        </select>
                        <select
                          value={d.state.tone}
                          onChange={(e) =>
                            patchDraft(r.review_id, {
                              tone: e.target.value as Tone,
                              override: null,
                            })
                          }
                          className="cursor-pointer rounded-chip border border-[rgba(27,35,33,0.16)] bg-bg-surface px-[6px] py-[2px] font-sans text-[10.5px] font-semibold text-ink-soft"
                        >
                          <option value="Warm">Warm</option>
                          <option value="Professional">Professional</option>
                        </select>
                      </span>
                    </div>

                    {editing ? (
                      <>
                        <textarea
                          rows={3}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full resize-y rounded-lg border-[1.5px] border-brand bg-bg-surface px-[11px] py-[9px] text-[13px] leading-relaxed outline-brand"
                        />
                        <div className="mt-2 flex gap-[6px]">
                          <button
                            type="button"
                            onClick={() => {
                              patchDraft(r.review_id, { override: editText });
                              setEditId(null);
                            }}
                            className="rounded-[7px] bg-brand px-[14px] py-[6px] text-[12px] font-semibold text-white hover:bg-brand-hover"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className="rounded-[7px] border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[14px] py-[6px] text-[12px] font-semibold hover:border-ink"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-[9px] text-[13.5px] leading-relaxed">
                          {d.text}
                        </div>
                        <div className="flex flex-wrap items-center gap-[6px]">
                          {conn === "oauth" ? (
                            <button
                              type="button"
                              onClick={() =>
                                toast("Reply published to Google ✓")
                              }
                              className="rounded-[7px] bg-brand px-[13px] py-[7px] text-[12px] font-semibold text-white hover:bg-brand-hover"
                            >
                              Approve &amp; publish
                            </button>
                          ) : (
                            <button
                              disabled
                              title="Connect profile or copy manually"
                              className="cursor-not-allowed rounded-[7px] bg-[#E5E1D8] px-[13px] py-[7px] text-[12px] font-semibold text-ink-faint"
                            >
                              Approve &amp; publish
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditId(r.review_id);
                              setEditText(d.text);
                            }}
                            className={ACTION_BTN}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => regenerate(r)}
                            className={ACTION_BTN}
                          >
                            Regenerate
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard?.writeText(d.text);
                              toast("Reply copied — paste it on Google");
                            }}
                            className="rounded-[7px] border-[1.5px] border-brand bg-bg-surface px-[13px] py-[7px] text-[12px] font-semibold text-brand hover:bg-[#F0F5F2]"
                          >
                            Copy
                          </button>
                          {conn === "none" && (
                            <span className="text-[11px] text-ink-faint">
                              Prospect — connect profile or paste manually
                            </span>
                          )}
                          {conn === "manager" && (
                            <span className="text-[11px] text-ink-faint">
                              Manager access — copy &amp; paste on Google
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {!busy && !d && !r.replied && (
                  <button
                    type="button"
                    onClick={() => draftAi(r)}
                    className="rounded-[7px] border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[13px] py-[7px] text-[12px] font-semibold hover:border-brand hover:text-brand"
                  >
                    Draft AI reply
                  </button>
                )}
              </Card>
            );
          })}
          <div className="py-1 text-center text-[11.5px] text-ink-faint">
            Showing {rows.length} of {stats.total} (demo sample) — filters
            apply to the full set in production.
          </div>
        </div>

        {/* Side column */}
        <div className="flex min-w-[260px] flex-1 flex-col gap-3">
          <Card className="px-4 py-[14px]">
            <div className="mb-[10px] text-[13px] font-bold">
              Keywords{" "}
              <span className="text-[11px] font-medium text-ink-faint">
                · bilingual
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-[6px]">
              {bundle.cloud.map((k) => (
                <span
                  key={k.token}
                  className="rounded-chip bg-bg-app px-[11px] py-1 font-semibold text-ink"
                  style={{ fontSize: `${(11 + k.count * 0.45).toFixed(1)}px` }}
                >
                  {k.token} ×{k.count}
                </span>
              ))}
            </div>
          </Card>
          <Card className="px-4 py-[14px]">
            <div className="mb-[10px] text-[13px] font-bold">
              Cumulative reviews
            </div>
            {!lastPt ? (
              <div className="text-[11.5px] text-ink-faint">
                No review history yet.
              </div>
            ) : (
            <svg viewBox="0 0 220 92" className="block h-auto w-full">
              <polyline
                points={trendPts.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(" ")}
                fill="none"
                stroke="#0F5C48"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={lastPt.x.toFixed(0)}
                cy={lastPt.y.toFixed(0)}
                r="3.5"
                fill="#0F5C48"
              />
              <text
                x={lastPt.x.toFixed(0)}
                y={(lastPt.y + 14).toFixed(0)}
                textAnchor="end"
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-plex-mono), monospace"
                fill="#1B2321"
              >
                {lastPt.cumulative}
              </text>
            </svg>
            )}
            <div className="mt-[2px] flex justify-between font-mono text-[10px] text-ink-faint">
              {bundle.trend
                .filter((_, i) => i < 6)
                .map((p) => (
                  <span key={p.date}>
                    &apos;{new Date(p.date).getFullYear().toString().slice(2)}
                  </span>
                ))}
            </div>
            <div className="mt-2 text-[11px] leading-normal text-ink-faint">
              Dates older than 1 year are approximated by Google.
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
