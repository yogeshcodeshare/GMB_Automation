"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { AiGenerateRequest, AiGenerateResponse, Language } from "@/types";
import { apiPost } from "@/components/lib/api";
import { useAppState } from "@/components/shell/app-state";
import {
  aiHistoryMock,
  aiQaPairsMock,
  aiTextOutputsMock,
  aiUsageMock,
  creativeTemplatesMock,
  descriptionBeforeMock,
  descriptionKeywordsMock,
  festivalGreetingsMock,
  mediaInboxMock,
} from "@/components/mocks/ai-tools";
import { reviewsMock } from "@/components/mocks/reviews";
import { CategoryFinder } from "@/components/ai-tools/category-finder";
import { CONN_META } from "@/components/ui/conn";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";

type Tab = "post" | "reply" | "desc" | "qa" | "fb" | "creative" | "cat";
type ToneUi = "Warm" | "Professional" | "Festive";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "post", label: "GBP Post" },
  { key: "reply", label: "Review Reply" },
  { key: "desc", label: "Description" },
  { key: "qa", label: "Q&A draft" },
  { key: "fb", label: "Facebook Post" },
  { key: "creative", label: "Festival Creative" },
  { key: "cat", label: "Category Finder" },
];

const GEN_LABEL: Record<Exclude<Tab, "cat">, string> = {
  post: "Generate post",
  reply: "Draft reply",
  desc: "Rewrite description",
  qa: "Suggest 5 Q&A",
  fb: "Generate post",
  creative: "Generate creative",
};

const LANG_LABEL: Record<Language, string> = {
  mr: "मराठी",
  en: "English",
  hinglish: "Hinglish",
};

const CTAS = ["Call now", "Book", "Learn more", "Offer"] as const;

const CAPTION =
  "text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft mb-[6px]";
const ACTION_BTN =
  "rounded-[7px] border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[13px] py-[7px] text-[12px] font-semibold hover:border-ink";

/** First sentence only (Short reply length) — '.', '!' or '।' delimited. */
function firstSentence(text: string): string {
  const idx = [".", "!", "।"]
    .map((ch) => text.indexOf(ch))
    .filter((i) => i > -1)
    .sort((a, b) => a - b)[0];
  return idx === undefined ? text : text.slice(0, idx + 1);
}

/** P8 AI Tools — 7 mini-tools over the EP-005 free-model chain. */
export default function AiToolsPage() {
  const toast = useToast();
  const { businesses, bizSel } = useAppState();

  // Clients first (prototype order); default = first connected client.
  const toolBusinesses = useMemo(
    () =>
      [...businesses].sort((a, b) => {
        const rank = (c: string) => (c === "oauth" ? 0 : c === "manager" ? 1 : 2);
        return rank(a.connection_status) - rank(b.connection_status);
      }),
    [businesses],
  );
  const [toolBizId, setToolBizId] = useState(
    () =>
      toolBusinesses.find((b) => b.connection_status === "oauth")?.id ??
      bizSel.id,
  );
  const toolBiz =
    toolBusinesses.find((b) => b.id === toolBizId) ?? toolBusinesses[0];
  const queueOk = toolBiz.connection_status === "oauth";
  const media = mediaInboxMock[toolBizId] ?? [];

  const [tab, setTab] = useState<Tab>("post");
  const [lang, setLang] = useState<Language>("mr");
  const [tone, setTone] = useState<ToneUi>("Warm");
  const [usage, setUsage] = useState(aiUsageMock.used);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Record<string, 0 | 1>>({});
  /** Real EP-005 output per tab when the endpoint is live (else mock). */
  const [liveOutputs, setLiveOutputs] = useState<Record<string, string>>({});
  const clearLiveOutput = (t: Tab) =>
    setLiveOutputs((o) => {
      const next = { ...o };
      delete next[t];
      return next;
    });

  // Per-tab inputs
  const [topic, setTopic] = useState("Exam-season offer for students");
  const [cta, setCta] = useState<(typeof CTAS)[number]>("Offer");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [len, setLen] = useState<"Short" | "Standard">("Standard");
  const [kwSel, setKwSel] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
  });
  const [question, setQuestion] = useState("");
  const [qaSel, setQaSel] = useState<Record<number, boolean>>({});
  const [emoji, setEmoji] = useState<"None" | "Some" | "Festive">("Some");
  const [gbpLink, setGbpLink] = useState<"Yes" | "No">("Yes");
  const [audience, setAudience] = useState<"Customers" | "Local community">(
    "Customers",
  );
  const [festival, setFestival] = useState("Ganesh Chaturthi");
  const [tplIdx, setTplIdx] = useState(0);
  const [offer, setOffer] = useState("10% off this week");

  const [history, setHistory] = useState(
    aiHistoryMock.map((h) => ({ ...h, isNew: false })),
  );

  const variant = variants[tab] ?? 0;
  const pendingReviews = reviewsMock.filter((r) => !r.replied).slice(0, 3);
  const picked = pendingReviews[reviewIdx] ?? pendingReviews[0];

  // Outputs — real EP-005 text when live, else mock variants.
  const postText = liveOutputs.post ?? aiTextOutputsMock.post[lang][variant];
  const replyFull = liveOutputs.reply ?? aiTextOutputsMock.reply[lang][variant];
  const replyText = len === "Short" ? firstSentence(replyFull) : replyFull;
  const descAfter = liveOutputs.desc ?? aiTextOutputsMock.desc[lang][variant];
  const fbBase = liveOutputs.fb ?? aiTextOutputsMock.fb[lang][variant];
  const fbText =
    emoji === "None" ? fbBase : emoji === "Some" ? `${fbBase} 📞` : `✨ ${fbBase} 🎉`;
  const qaPairs = aiQaPairsMock[lang === "mr" ? "mr" : "en"];
  const festText = festivalGreetingsMock[festival] ?? "";
  const tpl = creativeTemplatesMock[tplIdx];
  const qaSelCount = Object.values(qaSel).filter(Boolean).length;

  const copyTextByTab: Record<Exclude<Tab, "cat">, string> = {
    post: postText,
    reply: replyText,
    desc: descAfter,
    qa: qaPairs.map((p) => `Q: ${p.q}\nA: ${p.a}`).join("\n\n"),
    fb: fbText,
    creative: `${festText.replace("\n", " ")} — ${offer}`,
  };

  const bumpUsage = () => {
    setUsage((u) => {
      toast(`Draft ready — ${u + 1}/${aiUsageMock.limit} free requests today`);
      return u + 1;
    });
  };

  const generate = () => {
    if (tab === "cat" || loading) return;
    // Typed exactly like the Day-5 EP-005 call (LIVE_ENDPOINTS flag stays
    // OFF — Groq quota is shared; flip is a Day-5 decision with MAIN).
    // UI offers "Festive" (prototype); contract Tone is warm|professional.
    const request: AiGenerateRequest =
      tab === "post"
        ? { tool: "post", business_id: toolBiz.id, lang, tone: tone === "Professional" ? "professional" : tone === "Festive" ? "festive" : "warm", topic, cta: cta === "Call now" ? "call_now" : cta === "Book" ? "book" : cta === "Learn more" ? "learn_more" : "offer" }
        : tab === "reply"
          ? { tool: "reply", business_id: toolBiz.id, lang, tone: tone === "Professional" ? "professional" : tone === "Festive" ? "festive" : "warm", review_id: picked.review_id, length: len === "Short" ? "short" : "standard" }
          : tab === "desc"
            ? { tool: "description", business_id: toolBiz.id, lang, tone: tone === "Professional" ? "professional" : tone === "Festive" ? "festive" : "warm", current_description: descriptionBeforeMock, include_keywords: descriptionKeywordsMock.filter((_, i) => kwSel[i]) }
            : tab === "qa"
              ? { tool: "qa", business_id: toolBiz.id, lang, tone: tone === "Professional" ? "professional" : tone === "Festive" ? "festive" : "warm", question: question || undefined, suggest_five: !question }
              : tab === "fb"
                ? { tool: "fb_post", business_id: toolBiz.id, lang, tone: tone === "Professional" ? "professional" : tone === "Festive" ? "festive" : "warm", topic, emoji_level: emoji === "None" ? "none" : emoji === "Some" ? "some" : "festive", include_gbp_link: gbpLink === "Yes" }
                : { tool: "festival", business_id: toolBiz.id, lang, festival, template: (tplIdx + 1) as 1 | 2 | 3, offer_line: offer };
    setLoading(true);
    void (async () => {
      // Live EP-005 when flipped in LIVE_ENDPOINTS; mock variants otherwise.
      // Live output applied to the text tools; qa/creative keep structured
      // mocks until their output parsing lands (noted in HANDOFF).
      const live =
        tab === "qa" || tab === "creative"
          ? null
          : await apiPost<AiGenerateResponse>("/api/ai/generate", request);
      setTimeout(
        () => {
          setLoading(false);
          if (live) {
            setLiveOutputs((o) => ({ ...o, [tab]: live.output }));
            setUsage(live.usage_today.used);
            toast(
              `Draft ready (${live.model_used}) — ${live.usage_today.used}/${live.usage_today.limit} requests today`,
            );
          } else {
            setVariants((v) => ({ ...v, [tab]: v[tab] === 0 ? 1 : 0 }));
            bumpUsage();
          }
        },
        live ? 0 : 400,
      );
    })();
  };

  const saveToHistory = () => {
    if (tab === "cat") return;
    const typeLabel = {
      post: "GBP POST",
      reply: "REPLY",
      desc: "DESCRIPTION",
      qa: "Q&A",
      fb: "FB POST",
      creative: "CREATIVE",
    }[tab];
    setHistory((h) => [
      {
        id: `hist-new-${Date.now()}`,
        type: typeLabel,
        text: copyTextByTab[tab].replace(/\n+/g, " ").slice(0, 80),
        date: "just now",
        lang,
        approved: false,
        isNew: true,
      },
      ...h,
    ]);
    toast("Saved to history — pending approval");
  };

  const tabLabel = TABS.find((t) => t.key === tab)?.label ?? "";

  return (
    <section className="flex flex-col gap-[14px]">
      {/* Tab chips + usage pill */}
      <div className="flex flex-wrap items-center gap-[6px]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg border-[1.5px] px-[14px] py-[7px] text-[12.5px] font-semibold",
              tab === t.key
                ? "border-brand bg-brand text-white"
                : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink-soft hover:border-brand",
            )}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="whitespace-nowrap rounded-chip border border-[rgba(27,35,33,0.12)] bg-bg-surface px-[10px] py-1 font-mono text-[11.5px] font-semibold text-ink-soft">
          {usage}/{aiUsageMock.limit} free requests today
        </span>
      </div>

      {tab === "cat" ? (
        <CategoryFinder onUsage={bumpUsage} />
      ) : (
        <div className="flex flex-wrap items-stretch gap-[14px]">
          {/* Left — shared form */}
          <Card className="flex min-w-[270px] flex-1 flex-col gap-[13px] px-5 py-4">
            <div>
              <div className={CAPTION}>Business (context prefilled)</div>
              <select
                value={toolBizId}
                onChange={(e) => {
                  setToolBizId(e.target.value);
                  setPhotoIdx(0);
                }}
                className="w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] font-sans text-[13px] text-ink"
              >
                {toolBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} —{" "}
                    {b.connection_status === "none"
                      ? "Not connected"
                      : `${CONN_META[b.connection_status].glyph} ${CONN_META[b.connection_status].label}`}
                  </option>
                ))}
              </select>
            </div>

            {(tab === "post" || tab === "fb") && (
              <div>
                <div className={CAPTION}>Topic / offer</div>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] text-[13px] outline-brand"
                />
              </div>
            )}

            {tab === "post" && (
              <>
                <div>
                  <div className={CAPTION}>CTA button</div>
                  <div className="flex flex-wrap gap-[6px]">
                    {CTAS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCta(c)}
                        className={cn(
                          "rounded-lg border-[1.5px] px-3 py-[6px] text-[12px] font-semibold",
                          cta === c
                            ? "border-brand bg-[#F0F5F2] text-brand"
                            : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink-soft",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={CAPTION}>Photo — from media inbox</div>
                  {media.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {media.map((m, i) => (
                        <button
                          key={m.file}
                          type="button"
                          title={m.file}
                          onClick={() => setPhotoIdx(i)}
                          className="h-[50px] w-[66px] flex-none rounded-lg"
                          style={{
                            background: m.bg,
                            border: `2.5px solid ${photoIdx === i ? "#0F5C48" : "rgba(27,35,33,0.10)"}`,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11.5px] leading-normal text-ink-faint">
                      No media inbox for this business — photos arrive after
                      connecting the client.
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "reply" && (
              <>
                <div>
                  <div className={CAPTION}>Pick a pending review · 28</div>
                  <div className="flex flex-col gap-[6px]">
                    {pendingReviews.map((r, i) => (
                      <button
                        key={r.review_id}
                        type="button"
                        onClick={() => setReviewIdx(i)}
                        className={cn(
                          "block w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border-[1.5px] px-[11px] py-2 text-left text-[12px] font-medium",
                          reviewIdx === i
                            ? "border-brand bg-[#F0F5F2]"
                            : "border-[rgba(27,35,33,0.12)] bg-bg-surface",
                        )}
                      >
                        {"★".repeat(r.rating)} {r.author} —{" "}
                        {(r.text ?? "").slice(0, 30)}…
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={CAPTION}>Length</div>
                  <Segmented
                    options={["Short", "Standard"] as const}
                    value={len}
                    onChange={setLen}
                  />
                </div>
              </>
            )}

            {tab === "desc" && (
              <>
                <div>
                  <div className={CAPTION}>
                    Current description — from profile
                  </div>
                  <div className="rounded-[9px] bg-bg-app px-3 py-[10px] text-[12.5px] leading-relaxed text-ink-soft">
                    {descriptionBeforeMock}
                  </div>
                </div>
                <div>
                  <div className={CAPTION}>
                    Keywords to include · from category + city
                  </div>
                  <div className="flex flex-wrap gap-[6px]">
                    {descriptionKeywordsMock.map((k, i) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setKwSel((s) => ({ ...s, [i]: !s[i] }))
                        }
                        className={cn(
                          "rounded-lg border-[1.5px] px-3 py-[6px] text-[12px] font-semibold",
                          kwSel[i]
                            ? "border-brand bg-[#F0F5F2] text-brand"
                            : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink-soft",
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "qa" && (
              <div>
                <div className={CAPTION}>Question</div>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. सत्र किती वेळ चालते?"
                  className="w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] text-[13px] outline-brand"
                />
              </div>
            )}

            {tab === "fb" && (
              <>
                <div>
                  <div className={CAPTION}>Emoji level</div>
                  <Segmented
                    options={["None", "Some", "Festive"] as const}
                    value={emoji}
                    onChange={setEmoji}
                  />
                </div>
                <div className="flex flex-wrap gap-[18px]">
                  <div>
                    <div className={CAPTION}>Include GBP link</div>
                    <Segmented
                      options={["Yes", "No"] as const}
                      value={gbpLink}
                      onChange={setGbpLink}
                    />
                  </div>
                  <div>
                    <div className={CAPTION}>Audience</div>
                    <Segmented
                      options={["Customers", "Local community"] as const}
                      value={audience}
                      onChange={setAudience}
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "creative" && (
              <>
                <div>
                  <div className={CAPTION}>Festival</div>
                  <select
                    value={festival}
                    onChange={(e) => setFestival(e.target.value)}
                    className="w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] font-sans text-[13px] text-ink"
                  >
                    {Object.keys(festivalGreetingsMock).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className={CAPTION}>Template</div>
                  <div className="flex gap-2">
                    {creativeTemplatesMock.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTplIdx(i)}
                        className="h-[50px] w-[50px] flex-none rounded-[9px]"
                        style={{
                          background: t.outer,
                          boxShadow: `inset 0 0 0 5px ${t.outer}, inset 0 0 0 6.5px ${t.accent}`,
                          border: `2.5px solid ${tplIdx === i ? "#0F5C48" : "rgba(27,35,33,0.12)"}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className={CAPTION}>Offer line</div>
                  <input
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    className="w-full rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] text-[13px] outline-brand"
                  />
                </div>
                <div className="text-[11.5px] font-medium text-band-good">
                  ✓ Phone + logo auto-pulled from the profile
                </div>
              </>
            )}

            <div>
              <div className={CAPTION}>Language</div>
              <Segmented
                options={["mr", "en", "hinglish"] as const}
                value={lang}
                onChange={setLang}
                labels={LANG_LABEL}
              />
            </div>
            <div>
              <div className={CAPTION}>Tone</div>
              <Segmented
                options={["Warm", "Professional", "Festive"] as const}
                value={tone}
                onChange={setTone}
              />
            </div>
            <button
              type="button"
              onClick={generate}
              className="mt-auto flex items-center justify-center gap-2 rounded-[9px] bg-brand p-3 text-[14px] font-bold text-white hover:bg-brand-hover"
            >
              {loading && (
                <span className="inline-block h-[13px] w-[13px] animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-white/35 border-t-white" />
              )}
              {GEN_LABEL[tab]}
            </button>
          </Card>

          {/* Right — output */}
          <Card className="flex min-w-[300px] flex-[1.35] flex-col gap-3 px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
              <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-brand">
                {tabLabel} · {LANG_LABEL[lang]} · {tone}
              </div>
              <span className="text-[11px] text-ink-faint">
                draft — approve before publish
              </span>
            </div>

            {tab === "post" && (
              <>
                <div className="max-w-[400px] overflow-hidden rounded-card border border-[rgba(27,35,33,0.14)] bg-bg-surface">
                  {media.length > 0 && (
                    <div
                      className="flex h-[120px] items-end"
                      style={{ background: media[photoIdx]?.bg }}
                    >
                      <span className="px-[10px] py-[6px] font-mono text-[10px] text-[rgba(20,32,28,0.55)]">
                        {media[photoIdx]?.file}
                      </span>
                    </div>
                  )}
                  <div className="px-[14px] py-3">
                    <div className="whitespace-pre-line text-[13px] leading-[1.65]">
                      {postText}
                    </div>
                    <button className="mt-[10px] rounded-chip border-[1.5px] border-brand bg-bg-surface px-4 py-[7px] text-[12px] font-semibold text-brand">
                      {cta}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between gap-[10px] text-[11px] text-ink-faint">
                  <span>Preview — as it appears on Google</span>
                  <span className="font-mono">{postText.length} / 1,500</span>
                </div>
              </>
            )}

            {tab === "reply" && (
              <>
                <div className="rounded-card border border-[rgba(27,35,33,0.14)] bg-bg-surface px-[15px] py-[13px]">
                  <div className="mb-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-[12px] tracking-[1px] text-band-warn-strong">
                      {"★".repeat(picked.rating)}
                    </span>
                    <span className="text-[12.5px] font-bold">
                      {picked.author}
                    </span>
                    <span className="text-[11px] text-ink-faint">
                      {picked.author_stats?.is_local_guide
                        ? `Local Guide · ${picked.author_stats.review_count} reviews`
                        : `${picked.author_stats?.review_count} review${(picked.author_stats?.review_count ?? 0) === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <div className="text-[13px] leading-relaxed text-ink-soft">
                    {picked.text}
                  </div>
                  <div className="mt-[10px] flex gap-2">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-bg-nav text-[10px] font-bold text-brand-accent">
                      सा
                    </span>
                    <div className="min-w-0 flex-1 rounded-[10px] bg-[#F0F5F2] px-3 py-[9px]">
                      <div className="mb-[3px] text-[10px] font-bold uppercase tracking-[0.6px] text-brand">
                        Owner reply · draft
                      </div>
                      <div className="text-[13px] leading-relaxed">
                        {replyText}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-ink-faint">
                  Threaded exactly as it will appear on Google once approved.
                </div>
              </>
            )}

            {tab === "desc" && (
              <div className="flex flex-wrap gap-[10px]">
                <div className="min-w-[190px] flex-1 rounded-[10px] bg-bg-app px-[13px] py-[11px]">
                  <div className="mb-[5px] text-[10px] font-bold uppercase tracking-[0.7px] text-ink-faint">
                    Before
                  </div>
                  <div className="text-[12.5px] leading-relaxed text-ink-soft">
                    {descriptionBeforeMock}
                  </div>
                </div>
                <div className="min-w-[210px] flex-[1.3] rounded-[10px] border border-[rgba(15,92,72,0.20)] bg-[#F0F5F2] px-[13px] py-[11px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.7px] text-brand">
                      After
                    </span>
                    <span className="font-mono text-[10.5px] text-ink-soft">
                      {descAfter.length} / 750
                    </span>
                  </div>
                  <div className="mb-[9px] mt-[5px] text-[13px] leading-[1.65]">
                    {descAfter}
                  </div>
                  <div className="flex flex-wrap gap-[5px]">
                    {descriptionKeywordsMock
                      .filter((_, i) => kwSel[i])
                      .map((k) => (
                        <span
                          key={k}
                          className="rounded-chip bg-band-good-bg px-[7px] py-[2px] text-[10px] font-bold text-band-good"
                        >
                          ✓ {k}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "qa" && (
              <div className="flex flex-col gap-2">
                {qaPairs.map((p, i) => (
                  <div
                    key={p.q}
                    className="flex items-start gap-[9px] rounded-[10px] border border-line px-3 py-[10px]"
                  >
                    <button
                      type="button"
                      onClick={() => setQaSel((s) => ({ ...s, [i]: !s[i] }))}
                      className={cn(
                        "mt-[2px] flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[5px] text-[10px] font-bold",
                        qaSel[i]
                          ? "bg-brand text-white"
                          : "border-[1.5px] border-[rgba(27,35,33,0.30)] bg-bg-surface text-transparent",
                      )}
                    >
                      ✓
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="mb-[2px] text-[13px] font-bold">
                        {p.q}
                      </div>
                      <div className="text-[12.5px] leading-relaxed text-ink-soft">
                        {p.a}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(
                          `Q: ${p.q}\nA: ${p.a}`,
                        );
                        toast("Q&A pair copied");
                      }}
                      className="flex-none text-[11px] font-semibold text-brand"
                    >
                      Copy
                    </button>
                  </div>
                ))}
                {qaSelCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      saveToHistory();
                      setQaSel({});
                    }}
                    className="self-start rounded-lg bg-brand px-[15px] py-2 text-[12.5px] font-semibold text-white hover:bg-brand-hover"
                  >
                    Save {qaSelCount} selected
                  </button>
                )}
              </div>
            )}

            {tab === "fb" && (
              <div className="max-w-[400px] rounded-card border border-[rgba(27,35,33,0.14)] bg-bg-surface px-[14px] py-3">
                <div className="mb-2 flex items-center gap-[9px]">
                  <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand text-[14px] font-bold text-white">
                    {toolBiz.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold">
                      {toolBiz.name}
                    </div>
                    <div className="text-[10.5px] text-ink-faint">
                      Just now · Facebook Page
                    </div>
                  </div>
                </div>
                <div className="whitespace-pre-line text-[13.5px] leading-[1.65]">
                  {fbText}
                </div>
                {gbpLink === "Yes" && (
                  <div className="mt-[9px] rounded-[9px] bg-bg-app px-[11px] py-2">
                    <div className="text-[10px] uppercase tracking-[0.5px] text-ink-faint">
                      google.com
                    </div>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold">
                      {toolBiz.name} — Google Business Profile
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "creative" && (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex aspect-square w-[min(320px,100%)] rounded-card p-[13px]"
                  style={{ background: tpl.outer }}
                >
                  <div
                    className="relative flex flex-1 flex-col items-center justify-center gap-[10px] rounded-lg p-[18px]"
                    style={{ border: tpl.inner }}
                  >
                    <div
                      className="flex h-[50px] w-[50px] items-center justify-center rounded-full text-[9px] font-bold tracking-[0.5px]"
                      style={{
                        border: `1.5px dashed ${tpl.logo}`,
                        color: tpl.sub,
                      }}
                    >
                      LOGO
                    </div>
                    <div
                      className="text-[12px] font-semibold tracking-[4px]"
                      style={{ color: tpl.accent }}
                    >
                      ॥ शुभेच्छा ॥
                    </div>
                    <div
                      className="whitespace-pre-line text-center text-[26px] font-bold leading-[1.35]"
                      style={{ color: tpl.title }}
                    >
                      {festText}
                    </div>
                    <span
                      className="rounded-chip px-3 py-1 text-[12px] font-bold text-bg-nav"
                      style={{ background: tpl.accent }}
                    >
                      {offer}
                    </span>
                    <div
                      className="text-center text-[14px] font-semibold opacity-[0.92]"
                      style={{ color: tpl.title }}
                    >
                      {toolBiz.name}
                    </div>
                    <div
                      className="absolute inset-x-0 bottom-[9px] text-center text-[9.5px]"
                      style={{ color: tpl.sub }}
                    >
                      फोन: 98XXX XXXXX · कराड
                    </div>
                  </div>
                </div>
                <div className="text-center text-[11px] text-ink-faint">
                  {festival} template · logo + name + phone auto-pulled ·
                  exports PNG 1080×1080
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto flex flex-wrap gap-[6px]">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(copyTextByTab[tab]);
                  toast("Copied — paste anywhere");
                }}
                className="rounded-[7px] border-[1.5px] border-brand bg-bg-surface px-[13px] py-[7px] text-[12px] font-semibold text-brand hover:bg-[#F0F5F2]"
              >
                Copy
              </button>
              <button type="button" onClick={generate} className={ACTION_BTN}>
                Regenerate
              </button>
              <button
                type="button"
                onClick={saveToHistory}
                className={ACTION_BTN}
              >
                Save to history
              </button>
              <button
                type="button"
                title={
                  queueOk
                    ? "Queues for founder approval, then publishes"
                    : "Connect the profile to publish directly"
                }
                onClick={() =>
                  queueOk
                    ? toast("Queued to publish — goes live after approval ✓")
                    : toast(
                        "Not connected — connect the profile or copy the draft instead",
                      )
                }
                className={cn(
                  "rounded-[7px] border-none px-[13px] py-[7px] text-[12px] font-semibold",
                  queueOk
                    ? "bg-brand text-white hover:bg-brand-hover"
                    : "cursor-not-allowed bg-[#E5E1D8] text-ink-faint",
                )}
              >
                Queue to publish
              </button>
              {tab === "fb" && (
                <span className="self-center text-[11px] text-ink-faint">
                  also queues to Instagram via cross-post
                </span>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* History */}
      <Card className="px-5 py-4">
        <div className="mb-[6px] text-[14.5px] font-bold">History</div>
        {history.map((h) => (
          <div
            key={h.id}
            className="flex flex-wrap items-center gap-3 border-t border-[rgba(27,35,33,0.07)] py-[9px]"
          >
            <span
              className={cn(
                "flex-none rounded-chip px-2 py-[2px] text-[10.5px] font-bold",
                h.isNew
                  ? "bg-brand-accent text-bg-nav"
                  : "bg-bg-app text-ink-soft",
              )}
            >
              {h.type}
            </span>
            <span className="min-w-[160px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">
              {h.text}
            </span>
            <span className="font-mono text-[11.5px] text-ink-soft">
              {h.date}
            </span>
            <span
              className={cn(
                "rounded-chip px-2 py-[2px] text-[10.5px] font-bold",
                h.approved
                  ? "bg-band-good-bg text-band-good"
                  : "bg-band-warn-bg text-band-warn",
              )}
            >
              {h.approved ? "Approved ✓" : "Pending"}
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(h.text);
                toast("History entry copied");
              }}
              className="text-[11.5px] font-semibold text-brand"
            >
              Copy
            </button>
          </div>
        ))}
      </Card>
    </section>
  );
}
