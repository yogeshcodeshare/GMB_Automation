"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AuditRequest, AuditStage, BusinessCandidate } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import {
  candidatesMock,
  searchCandidatesMock,
} from "@/components/mocks/candidates";
import { apiGet } from "@/components/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";

/** Search results state: hidden until first search. */
type SearchState = "idle" | "searching" | "results" | "none";

const STAGES: Array<{ key: AuditStage; label: string; caption: string }> = [
  {
    key: "profile",
    label: "Profile",
    caption: "Fetching profile, categories, attributes via Place ID",
  },
  {
    key: "reviews",
    label: "Reviews",
    caption: "Pulling the latest 30 reviews + reply history",
  },
  { key: "posts", label: "Posts", caption: "my_business_updates — 7 posts found" },
  {
    key: "competitors",
    label: "Competitors",
    caption: "Comparing 3 nearby competitors",
  },
  {
    key: "website",
    label: "Website",
    caption: "PageSpeed + on-page checks (grexa.site)",
  },
  { key: "scoring", label: "Scoring", caption: "Applying the /100 rubric" },
];

const CAPTION_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft";

export default function NewAuditPage() {
  const router = useRouter();
  const { capHit } = useAppState();

  // Card 1 — find the business
  const [name, setName] = useState("");
  const [city, setCity] = useState("Karad");
  const [search, setSearch] = useState<SearchState>("idle");
  const [candidates, setCandidates] = useState<BusinessCandidate[]>([]);
  const [sel, setSel] = useState(0);
  const [manual, setManual] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const [cid, setCid] = useState("");

  // Card 2 — options
  const [comp, setComp] = useState<"Top 3" | "Top 5">("Top 3");
  const [web, setWeb] = useState<"Yes" | "No">("Yes");
  const [post, setPost] = useState<"Yes" | "No">("Yes");

  // Run state
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // "Re-audit · ₹1.9" from P3 lands here with ?rerun=1 → prefill + auto-run.
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("rerun") === "1" &&
      !running
    ) {
      setName(candidatesMock[0].name);
      setCandidates(candidatesMock);
      setSearch("results");
      setSel(0);
      runAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estCost = (
    0.9 +
    (comp === "Top 3" ? 0.6 : 1.0) +
    (web === "Yes" ? 0.3 : 0) +
    (post === "Yes" ? 0.1 : 0)
  ).toFixed(1);

  const doSearch = () => {
    setSearch("searching");
    setSel(0);
    // GET /api/businesses/resolve once flipped live (LIVE_ENDPOINTS);
    // typed mock resolver until then.
    void (async () => {
      const live = await apiGet<BusinessCandidate[]>(
        `/api/businesses/resolve?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`,
      );
      const settle = () => {
        const found = live ?? searchCandidatesMock(name);
        setCandidates(found);
        setSearch(found.length ? "results" : "none");
      };
      timers.current.push(setTimeout(settle, live !== null ? 0 : 350));
    })();
  };

  const runAudit = () => {
    // Typed exactly like the Day-5 EP-001 call so the swap is mechanical.
    // Manual mode prefers CID — EP-001 rejects a bare place_id (backend FYI 13 Jul).
    const request: AuditRequest = {
      name: candidates[sel]?.name ?? name,
      city,
      cid: manual && cid ? cid : (candidates[sel]?.cid ?? undefined),
      place_id:
        manual && placeId ? placeId : candidates[sel]?.place_id,
      options: {
        competitors: comp === "Top 3" ? 3 : 5,
        website_audit: web === "Yes",
        post_audit: post === "Yes",
      },
    };
    void request; // handed to POST /api/audit on Day 5
    setRunning(true);
    setStage(0);
    for (let i = 1; i <= 5; i++)
      timers.current.push(setTimeout(() => setStage(i), i * 950));
    timers.current.push(setTimeout(() => router.push("/report"), 5850));
  };

  const cancelAudit = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    setStage(0);
  };

  const runTargetName = candidates[sel]?.name ?? name.trim() ?? "";
  const pct = ((Math.min(6, stage + 0.6) / 6) * 100).toFixed(0);

  if (running) {
    return (
      <section className="flex max-w-[780px] flex-col gap-[14px]">
        <Card className="max-w-[560px] px-[22px] py-5">
          <div className="mb-[2px] text-[15.5px] font-bold">
            Auditing &quot;{runTargetName}&quot;…
          </div>
          <div className="mb-[14px] text-[12.5px] text-ink-soft">
            ~2–4 min · the report saves automatically when done
          </div>
          <div className="mb-[14px] h-[6px] overflow-hidden rounded-[3px] bg-[#EDEAE3]">
            <div
              className="h-full rounded-[3px] bg-brand transition-[width] ease-out [transition-duration:600ms]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex flex-col">
            {STAGES.map((st, i) => {
              const done = stage > i;
              const current = stage === i;
              return (
                <div
                  key={st.key}
                  className={cn(
                    "flex items-start gap-[10px] py-[7px]",
                    !done && !current && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold",
                      done
                        ? "bg-band-good-bg text-band-good"
                        : "bg-[#EDEAE3] text-ink-faint",
                    )}
                  >
                    {current ? (
                      <span className="inline-block h-[11px] w-[11px] animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-[#EDEAE3] border-t-brand" />
                    ) : done ? (
                      "✓"
                    ) : (
                      "·"
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold">{st.label}</div>
                    {current && (
                      <div className="text-[12px] text-ink-soft">
                        {st.caption}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="mt-3"
            onClick={cancelAudit}
          >
            Cancel
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex max-w-[780px] flex-col gap-[14px]">
      {/* Card 1 — find the business */}
      <Card className="px-5 py-4">
        <div className="mb-[2px] text-[14.5px] font-bold">
          Find the business
        </div>
        <div className="mb-[14px] text-[12px] text-ink-soft">
          Start an audit in under 30 seconds — before you walk in.
        </div>
        <div className="flex flex-wrap gap-[10px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Business name"
            className="min-w-[200px] flex-[2] rounded-[10px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-[14px] py-3 text-[14.5px] outline-brand"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="City"
            className="min-w-[110px] flex-1 rounded-[10px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-[14px] py-3 text-[14.5px] outline-brand"
          />
          <Button
            variant="dark"
            size="md"
            onClick={doSearch}
            loading={search === "searching"}
          >
            Search
          </Button>
        </div>

        {search === "results" && (
          <div className="mt-4 flex flex-col gap-2">
            <div className={cn(CAPTION_CLASS, "tracking-[0.8px]")}>
              {candidates.length} matches on Google — pick one
            </div>
            {candidates.map((c, i) => {
              const selected = sel === i;
              return (
                <button
                  key={c.place_id}
                  type="button"
                  onClick={() => setSel(i)}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] border-[1.5px] px-[14px] py-3 text-left",
                    selected
                      ? "border-brand bg-[#F0F5F2]"
                      : "border-[rgba(27,35,33,0.12)] bg-bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 flex-none rounded-full bg-bg-surface",
                      selected
                        ? "border-[5px] border-brand"
                        : "border-2 border-[rgba(27,35,33,0.3)]",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      title={c.name}
                      className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold"
                    >
                      {c.name}
                    </span>
                    <span className="block text-[12px] text-ink-soft">
                      {c.address}
                    </span>
                  </span>
                  {c.rating !== null && (
                    <span className="flex-none font-mono text-[12px] text-ink-soft">
                      {c.rating.toFixed(1)}★ · {c.reviews_total ?? 0} reviews
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {search === "none" && (
          <div className="mt-4 rounded-[10px] border border-dashed border-[rgba(27,35,33,0.22)] p-[18px] text-center">
            <div className="mb-1 text-[13.5px] font-bold">
              No matching business found
            </div>
            <div className="mb-[10px] text-[12.5px] leading-relaxed text-ink-soft">
              Check the spelling or add the area name — or go direct with an
              ID:
            </div>
            <Button variant="dark" size="xs" onClick={() => setManual(true)}>
              Enter Place ID / CID
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setManual((m) => !m)}
          className="mt-3 inline-block text-[12.5px] font-semibold text-brand hover:text-brand-hover"
        >
          Enter Place ID / CID manually
        </button>
        {manual && (
          <>
            <div className="mt-[10px] flex flex-wrap gap-[10px]">
              <input
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                placeholder="CID — 1129…"
                className="min-w-[200px] flex-[1.4] rounded-[10px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-[13px] py-[11px] font-mono text-[12.5px] outline-brand"
              />
              <input
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="Place ID — ChIJ… (optional)"
                className="min-w-[150px] flex-1 rounded-[10px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-[13px] py-[11px] font-mono text-[12.5px] outline-brand"
              />
            </div>
            <div className="mt-[6px] text-[11.5px] text-ink-soft">
              CID starts the audit directly — a Place ID alone can&apos;t.
            </div>
          </>
        )}
      </Card>

      {/* Card 2 — options */}
      <Card className="px-5 py-4">
        <div className="mb-3 text-[14.5px] font-bold">Options</div>
        <div className="flex flex-wrap gap-5">
          <div>
            <div className={cn(CAPTION_CLASS, "mb-[6px]")}>Competitors</div>
            <Segmented
              options={["Top 3", "Top 5"] as const}
              value={comp}
              onChange={setComp}
            />
          </div>
          <div>
            <div className={cn(CAPTION_CLASS, "mb-[6px]")}>Website audit</div>
            <Segmented
              options={["Yes", "No"] as const}
              value={web}
              onChange={setWeb}
            />
          </div>
          <div>
            <div className={cn(CAPTION_CLASS, "mb-[6px]")}>Post audit</div>
            <Segmented
              options={["Yes", "No"] as const}
              value={post}
              onChange={setPost}
            />
          </div>
        </div>
      </Card>

      {/* Card 3 — live cost preview */}
      <Card className="flex flex-wrap items-center justify-between gap-[14px] px-5 py-4">
        <div>
          <div className={cn(CAPTION_CLASS, "mb-[2px]")}>Estimated cost</div>
          <div className="font-mono text-[22px] font-semibold">₹{estCost}</div>
          <div className="text-[12px] text-ink-soft">
            ~2–4 min · charged only when the audit runs
          </div>
        </div>
        {capHit ? (
          <div className="text-right">
            <Button size="lg" disabled>
              Run audit →
            </Button>
            <div className="mt-[5px] text-[11.5px] font-semibold text-band-crit">
              Daily cap reached — resumes tomorrow
            </div>
          </div>
        ) : (
          <Button
            size="lg"
            onClick={runAudit}
            disabled={search !== "results" && !(manual && cid.trim())}
            title={
              search !== "results" && !(manual && cid.trim())
                ? "Search and pick a business (or enter a CID) first"
                : undefined
            }
          >
            Run audit →
          </Button>
        )}
      </Card>
    </section>
  );
}
