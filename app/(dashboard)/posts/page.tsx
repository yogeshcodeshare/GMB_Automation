"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PostAuditStats, PostItem, PostTimelineBucket } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import { useApiGet } from "@/components/hooks/use-api-get";
import { auditReportMock } from "@/components/mocks/audit-report";
import {
  postCompareMock,
  postStatsMock,
  postTimelineMock,
  postsMock,
} from "@/components/mocks/posts";
import { businessShortNames } from "@/components/mocks/businesses";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_CAPTION =
  "text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft";

interface PostsAuditData {
  stats: PostAuditStats;
  posts: PostItem[];
  timeline: PostTimelineBucket[];
}

const POSTS_FIXTURE: PostsAuditData = {
  stats: postStatsMock,
  posts: postsMock,
  timeline: postTimelineMock,
};

/** Every ~4th quarter gets a mono label (prototype: Q4'20 … Q4'24). */
function quarterLabel(bucket: PostTimelineBucket, i: number): string {
  return i % 4 === 0 ? bucket.quarter : "";
}

/** P7 Post Audit — the "inactive business" sales evidence. */
export default function PostAuditPage() {
  const { bizSel, setBizSelId } = useAppState();
  const postBody = useMemo(() => ({ business_id: bizSel.id }), [bizSel.id]);
  // EP-013 via the api layer — LIVE_ENDPOINTS flag OFF until Day 5.
  const { status, data, error, retry } = useApiGet(
    "/api/posts-audit",
    POSTS_FIXTURE,
    {
      post: postBody,
      emptyValue: {
        stats: { ...postStatsMock, total: 0 },
        posts: [],
        timeline: [],
      },
    },
  );
  const [compare, setCompare] = useState(false);

  if (bizSel.id !== auditReportMock.business.id) {
    return (
      <div className="flex max-w-[560px] flex-col items-start gap-2 rounded-card border-[1.5px] border-dashed border-[rgba(27,35,33,0.22)] bg-bg-surface px-6 py-7">
        <div
          title={bizSel.name}
          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold"
        >
          {bizSel.name}
        </div>
        <div className="text-[12.5px] leading-relaxed text-ink-soft">
          Post audit for this business isn&apos;t mocked — full post data
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

  if (status === "loading") {
    return (
      <section className="flex flex-col gap-[14px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))}
        </div>
        <Skeleton className="h-[52px]" />
        <Skeleton className="h-[180px]" />
        <Skeleton className="h-[280px]" />
      </section>
    );
  }

  if (status === "error" || !data) {
    return (
      <Card className="flex max-w-[560px] flex-col items-start gap-3 px-6 py-7">
        <div className="text-[13.5px] font-bold text-band-crit">
          Couldn&apos;t load the post audit
        </div>
        <div className="text-[12.5px] text-ink-soft">{error}</div>
        <Button variant="ghost" size="xs" onClick={retry}>
          Retry
        </Button>
      </Card>
    );
  }

  const { stats, posts, timeline } = data;
  const shortName =
    businessShortNames[auditReportMock.business.id] ??
    auditReportMock.business.name;

  if (posts.length === 0) {
    return (
      <div className="max-w-[560px] rounded-[10px] border border-dashed border-[rgba(27,35,33,0.22)] p-[18px] text-center">
        <div className="mb-1 text-[13.5px] font-bold">
          No posts on this profile yet
        </div>
        <div className="text-[12.5px] leading-relaxed text-ink-soft">
          Google reads zero posts as an inactive business — weekly posting is
          the single easiest fix (₹2,999 plan covers it).
        </div>
      </div>
    );
  }

  const imagePct = Math.round((stats.with_image / stats.total) * 100);
  const postsMultiple = stats.days_per_post
    ? Math.floor(stats.days_per_post / postCompareMock.competitor_days_per_post)
    : null;
  const maxCum = Math.max(...timeline.map((b) => b.cumulative), 1);
  const linePoints = timeline
    .map((b, i) => {
      const x = 5 + i * (200 / (timeline.length - 1));
      const y = 95 - (b.cumulative / maxCum) * 85;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <section className="flex flex-col gap-[14px]">
      {/* Metric cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Card className="px-4 py-[13px]">
          <div className={KPI_CAPTION}>Posts analyzed</div>
          <div className="mt-1 font-mono text-[23px] font-semibold">
            {stats.total}
          </div>
        </Card>
        <Card className="px-4 py-[13px]">
          <div className="flex items-center justify-between gap-2">
            <span className={KPI_CAPTION}>Frequency</span>
            {(stats.days_per_post ?? 0) > 30 && (
              <span className="flex-none rounded-chip bg-band-crit-bg px-[7px] py-[2px] text-[10.5px] font-bold text-band-crit">
                inactive
              </span>
            )}
          </div>
          <div className="mt-[6px] flex items-baseline gap-[5px] whitespace-nowrap">
            <span className="font-mono text-[21px] font-semibold text-band-crit">
              1
            </span>
            <span className="text-[12px] text-ink-soft">post /</span>
            <span className="font-mono text-[21px] font-semibold text-band-crit">
              {stats.days_per_post}
            </span>
            <span className="text-[12px] text-ink-soft">days</span>
          </div>
        </Card>
        <Card className="px-4 py-[13px]">
          <div className={KPI_CAPTION}>Avg length</div>
          <div className="mt-[6px] flex gap-[18px]">
            <div className="whitespace-nowrap">
              <span className="font-mono text-[21px] font-semibold">
                {stats.avg_chars}
              </span>{" "}
              <span className="text-[12px] text-ink-soft">chars</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-mono text-[21px] font-semibold">
                {stats.avg_words}
              </span>{" "}
              <span className="text-[12px] text-ink-soft">words</span>
            </div>
          </div>
        </Card>
        <Card className="px-4 py-[13px]">
          <div className={KPI_CAPTION}>With media</div>
          <div className="mt-[6px] flex gap-[18px]">
            {(
              [
                [stats.with_image, "img"],
                [stats.with_link, "link"],
                [stats.with_video, "video"],
              ] as const
            ).map(([n, label]) => (
              <div key={label} className="whitespace-nowrap">
                <span className="font-mono text-[21px] font-semibold">{n}</span>{" "}
                <span className="text-[12px] text-ink-soft">{label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sales callout */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-band-crit-bg px-[18px] py-[14px]">
        <div className="text-[14px] leading-[1.55]">
          <span className="font-bold text-band-crit">
            &quot;{stats.total} posts in 5 years — Google sees an inactive
            business.&quot;
          </span>{" "}
          <span className="text-[12.5px] text-ink-soft">
            Show this line to the owner.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCompare((c) => !c)}
          className="flex-none rounded-lg border-[1.5px] border-band-crit bg-bg-surface px-[15px] py-2 text-[12.5px] font-semibold text-band-crit hover:bg-[#FCF3F2]"
        >
          {compare ? "Hide comparison" : "Compare vs competitor"}
        </button>
      </div>

      {compare && (
        <Card className="px-5 py-4">
          <div className="mb-3 text-[13px] font-bold">
            vs {postCompareMock.competitor}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[220px] flex-1 rounded-[10px] border border-line px-[14px] py-3">
              <div className="mb-[6px] text-[12px] font-semibold text-ink-soft">
                {shortName}
              </div>
              <div className="font-mono text-[17px] font-semibold text-band-crit">
                {stats.total} posts · 1 / {stats.days_per_post} days
              </div>
              <div className="mt-[3px] text-[12px] text-ink-soft">
                {imagePct}% with images
              </div>
            </div>
            <div className="min-w-[220px] flex-1 rounded-[10px] border-[1.5px] border-band-good bg-[#F2F8F4] px-[14px] py-3">
              <div className="mb-[6px] text-[12px] font-semibold text-ink-soft">
                {postCompareMock.competitor}
              </div>
              <div className="font-mono text-[17px] font-semibold text-band-good">
                {postCompareMock.competitor_total} posts · 1 /{" "}
                {postCompareMock.competitor_days_per_post} days
              </div>
              <div className="mt-[3px] text-[12px] text-ink-soft">
                {postCompareMock.competitor_image_pct}% with images
              </div>
            </div>
          </div>
          <div className="mt-3 text-[13px] leading-relaxed">
            Your competitor posts{" "}
            <span className="font-bold">{postsMultiple}× more often</span> —
            this is the single easiest gap to close with the ₹2,999 plan.
          </div>
        </Card>
      )}

      {/* Timeline */}
      <Card className="px-5 py-4">
        <div className="mb-[14px] text-[14.5px] font-bold">
          Posts per quarter{" "}
          <span className="text-[11px] font-medium text-ink-faint">
            · Dec &apos;20 → Sep &apos;25 · line = cumulative
          </span>
        </div>
        <div className="relative h-[130px]">
          <div className="absolute inset-0 flex items-end gap-[3px]">
            {timeline.map((b) => (
              <div
                key={b.quarter}
                className="flex h-full min-w-0 flex-1 flex-col justify-end"
                title={`${b.quarter}: ${b.count} post${b.count === 1 ? "" : "s"}`}
              >
                <div
                  className="rounded-t-[3px]"
                  style={{
                    height: b.count ? "76%" : "4%",
                    background: b.count ? "#177B4B" : "#E5E1D8",
                  }}
                />
              </div>
            ))}
          </div>
          <svg
            viewBox="0 0 210 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <polyline
              points={linePoints}
              fill="none"
              stroke="#E39A2D"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="mt-[6px] flex gap-[3px]">
          {timeline.map((b, i) => (
            <div
              key={b.quarter}
              className="flex-1 overflow-visible whitespace-nowrap text-center font-mono text-[8.5px] text-ink-faint"
            >
              {quarterLabel(b, i)}
            </div>
          ))}
        </div>
      </Card>

      {/* Post list */}
      <Card className="px-5 py-4">
        <div className="mb-[6px] text-[14.5px] font-bold">All posts</div>
        {posts.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 border-t border-[rgba(27,35,33,0.07)] py-[9px]"
          >
            <span className="w-[92px] flex-none font-mono text-[12px] text-ink-soft">
              {p.post_ts
                ? new Date(p.post_ts).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
            <span
              title={p.text ?? undefined}
              className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px]"
            >
              {p.text}
            </span>
            {p.has_media && (
              <span className="flex-none rounded-chip bg-bg-app px-2 py-[2px] text-[10.5px] font-bold text-ink-soft">
                IMAGE
              </span>
            )}
            {p.links > 0 && (
              <span className="flex-none rounded-chip bg-bg-app px-2 py-[2px] text-[10.5px] font-bold text-ink-soft">
                LINK
              </span>
            )}
          </div>
        ))}
      </Card>
    </section>
  );
}
