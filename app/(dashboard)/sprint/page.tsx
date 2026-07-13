"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { FixTask, SprintPatchRequest } from "@/types";
import { sprintGroupFor } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import { apiPost } from "@/components/lib/api";
import {
  GBP_EDITOR_URL,
  sprintClientUpdatesMock,
  sprintDetailMock,
  sprintGatesMock,
  sprintGroupsMeta,
  sprintTaskUiMock,
} from "@/components/mocks/sprint";
import { SprintGate } from "@/components/sprint/gate";
import { SprintSimulator } from "@/components/sprint/simulator";
import { SprintReportModal } from "@/components/sprint/report-modal";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type Stage = "none" | "active" | "complete";

const ACTION_GHOST =
  "rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[12.5px] font-semibold hover:border-ink";
const ACTION_SECONDARY =
  "rounded-lg border-[1.5px] border-brand bg-bg-surface px-4 py-[9px] text-[12.5px] font-semibold text-brand hover:bg-[#F0F5F2]";
const APPROVE_BTN =
  "rounded-lg bg-brand px-4 py-2 text-[12.5px] font-bold text-white hover:bg-brand-hover";

const STATUS_CHIP: Record<FixTask["status"], [string, string]> = {
  done: ["✓", "bg-band-good-bg text-band-good"],
  todo: ["!", "bg-band-warn-bg text-band-warn"],
  blocked: ["✕", "bg-band-crit-bg text-band-crit"],
  doing: ["…", "bg-band-warn-bg text-band-warn"],
};

/** P12 Optimization Sprint — client selector → prereq gate → sprint board. */
export default function SprintPage() {
  const toast = useToast();
  const { businesses, pdfLangFor } = useAppState();

  const clients = useMemo(
    () => businesses.filter((b) => b.is_client || sprintGatesMock[b.id]),
    [businesses],
  );
  const prospects = useMemo(
    () => businesses.filter((b) => !b.is_client && !sprintGatesMock[b.id]),
    [businesses],
  );
  const [clientId, setClientId] = useState(
    clients.find((b) => sprintGatesMock[b.id])?.id ?? clients[0]?.id ?? "",
  );
  const isManovedh = clientId === "biz-manovedh";

  // Sprint stage (Manovedh demo board) + demo-state switcher (prototype).
  const [stage, setStage] = useState<Stage>("active");
  // Gate shows for every non-Manovedh client, and for Manovedh only before
  // a sprint runs (stage "none") — starting from the gate activates it.
  const showGate = !isManovedh || stage === "none";

  // Task state: overrides on top of the fixture (approve/skip/note/edit).
  const [statusOverride, setStatusOverride] = useState<
    Record<string, FixTask["status"]>
  >({});
  const [noteByTask, setNoteByTask] = useState<Record<string, string>>({});
  const [valueOverride, setValueOverride] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    profile: true,
  });
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [notifyOff, setNotifyOff] = useState<Record<string, boolean>>({});
  const [customTasks, setCustomTasks] = useState<FixTask[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addPts, setAddPts] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [queuedUpdates, setQueuedUpdates] = useState<string[]>([]);

  const detail = sprintDetailMock;
  const tasks = useMemo(
    () =>
      [...detail.tasks, ...customTasks].map((t) => ({
        ...t,
        status: statusOverride[t.id] ?? t.status,
        change_after: valueOverride[t.id] ?? t.change_after,
        note: noteByTask[t.id] ?? t.note,
      })),
    [detail.tasks, customTasks, statusOverride, valueOverride, noteByTask],
  );

  const doneN = tasks.filter((t) => t.status === "done").length;
  const blockedN = tasks.filter((t) => t.status === "blocked").length;
  const pct = Math.round((doneN / tasks.length) * 100);
  const approvedExtra = Object.values(statusOverride).filter(
    (s) => s === "done",
  ).length;
  const currentScore = (detail.current_projected_score ?? 70) + approvedExtra * 2;

  /** EP-021 PATCH — typed; registry "/api/sprint" OFF → local state is truth. */
  const patchSprint = (patch: SprintPatchRequest) => {
    void apiPost(`/api/sprint/${detail.sprint.id}`, patch);
  };

  const completeTask = (t: FixTask, skipped = false) => {
    setStatusOverride((m) => ({ ...m, [t.id]: "done" }));
    setOpenTask(null);
    patchSprint({ task_id: t.id, task_status: "done" });
    const ui = sprintTaskUiMock[t.id];
    if (!skipped && ui?.waLine && !notifyOff[t.id]) {
      setQueuedUpdates((q) => [...q, ui.waLine]);
    }
    toast(
      skipped
        ? "Marked N/A — excluded from the report"
        : `${t.title} — applied ✓ · logged, client update queued`,
    );
  };

  const groups = sprintGroupsMeta
    .map((g) => ({
      ...g,
      tasks: tasks.filter(
        (t) => t.source === "audit" && sprintGroupFor(t.rubric_key) === g.key,
      ),
    }))
    .filter((g) => g.tasks.length > 0);
  const customGroup = tasks.filter((t) => t.source === "manual");

  const renderTaskDetail = (t: FixTask) => {
    const ui = sprintTaskUiMock[t.id] ?? {
      pts: "+1",
      time: "~2 min",
      meta: "founder-added",
      waLine: `✓ ${t.title} पूर्ण.`,
      kind: "plain",
    };
    const editing = editingTask === t.id;

    if (t.status === "done") {
      return (
        <div className="pb-[13px] pl-8">
          {t.change_before && (
            <div className="text-[12.5px] leading-relaxed">
              <span className="text-ink-faint">{t.change_before}</span>{" "}
              <span className="font-bold text-band-good">→</span>{" "}
              <span className="font-semibold">{t.change_after}</span>
            </div>
          )}
          {!notifyOff[t.id] && ui.waLine && (
            <div className="mt-2 max-w-[520px] rounded-lg bg-[#F0F5F2] px-[11px] py-2 text-[12px] leading-relaxed">
              <span className="mb-[2px] block text-[9.5px] font-bold tracking-[0.6px] text-brand">
                CLIENT UPDATE LINE
              </span>
              {ui.waLine}
            </div>
          )}
          {t.note && (
            <div className="mt-2 text-[11.5px] text-ink-faint">
              Note: {t.note}
            </div>
          )}
        </div>
      );
    }

    if (t.status === "blocked") {
      return (
        <div className="pb-[13px] pl-8">
          <div className="mb-2 max-w-[560px] text-[12.5px] leading-relaxed">
            <span className="font-semibold text-band-crit">
              {t.change_before}
            </span>{" "}
            <span className="font-bold text-band-good">→</span>{" "}
            <span className="font-semibold">{t.change_after}</span>
          </div>
          <div className="flex flex-wrap items-center gap-[6px]">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `${t.title}: ${t.change_before} → ${t.change_after}`,
                );
                toast("Copied for vendor — Marathi + English note ready to WhatsApp");
              }}
              className="rounded-lg border-[1.5px] border-brand bg-bg-surface px-[14px] py-[7px] text-[12px] font-semibold text-brand hover:bg-[#F0F5F2]"
            >
              Copy for vendor
            </button>
            <span className="text-[11px] text-ink-faint">
              external — client&apos;s website vendor
            </span>
          </div>
        </div>
      );
    }

    if (t.status === "doing") {
      return (
        <div className="pb-[13px] pl-8">
          <div className="mb-2 text-[12.5px] leading-relaxed text-ink-soft">
            Review-request machine running —{" "}
            <span className="font-mono font-semibold text-ink">9</span> new
            reviews so far · customer photos arrive with reviews.
          </div>
          <button
            type="button"
            onClick={() => toast("5 more review requests queued ✓")}
            className={ACTION_SECONDARY}
          >
            Send 5 more requests
          </button>
        </div>
      );
    }

    // todo — AI-prefilled value (editable) + manual-mode controls.
    const value = t.change_after ?? "";
    return (
      <div className="pb-[13px] pl-8">
        <div className="max-w-[560px] rounded-[10px] border border-[rgba(15,92,72,0.18)] bg-[#F0F5F2] px-[13px] py-[11px]">
          <div className="mb-[5px] flex flex-wrap justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-brand">
              {editing ? "Editing AI draft" : "Suggested by AI — review before applying"}
            </span>
            {t.id === "desc" && (
              <span className="font-mono text-[10.5px] text-ink-soft">
                {(editing ? draft : value).length} / 750
              </span>
            )}
          </div>
          {editing ? (
            <>
              <textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="mb-2 w-full resize-y rounded-lg border-[1.5px] border-brand bg-bg-surface px-[11px] py-[9px] text-[13px] leading-relaxed outline-brand"
              />
              <div className="flex flex-wrap gap-[6px]">
                <button
                  type="button"
                  onClick={() => {
                    setValueOverride((m) => ({ ...m, [t.id]: draft }));
                    setEditingTask(null);
                    patchSprint({ task_id: t.id, change_after: draft });
                    toast("Draft saved — approve to apply");
                  }}
                  className={APPROVE_BTN}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className={ACTION_GHOST}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {t.change_before && (
                <div className="mb-2 text-[12.5px] leading-[1.65]">
                  <span className="text-ink-faint">{t.change_before}</span>{" "}
                  <span className="font-bold text-band-good">→</span>{" "}
                  <span className="font-semibold">{value}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-[6px]">
                <button
                  type="button"
                  onClick={() => completeTask(t)}
                  className={APPROVE_BTN}
                >
                  Approve &amp; apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(t.id);
                    setDraft(value);
                  }}
                  className={ACTION_GHOST}
                >
                  Edit
                </button>
                {/* Manual mode (ADR-010): copy value → open Google editor */}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(value);
                    toast("Value copied — paste it in the Google editor");
                  }}
                  className={ACTION_SECONDARY}
                >
                  Copy value
                </button>
                <a
                  href={GBP_EDITOR_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[12.5px] font-semibold no-underline hover:border-ink"
                >
                  Open Google editor ↗
                </a>
                <button
                  type="button"
                  onClick={() => completeTask(t, true)}
                  className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[12.5px] font-semibold text-ink-soft hover:border-ink"
                >
                  Mark N/A
                </button>
              </div>
              <input
                value={noteByTask[t.id] ?? ""}
                onChange={(e) =>
                  setNoteByTask((m) => ({ ...m, [t.id]: e.target.value }))
                }
                onBlur={() =>
                  noteByTask[t.id] &&
                  patchSprint({ task_id: t.id, task_note: noteByTask[t.id] })
                }
                placeholder="Note — e.g. owner confirmed hours on call"
                className="mt-2 w-full rounded-lg border border-[rgba(27,35,33,0.14)] bg-bg-surface px-[11px] py-2 text-[12px] outline-brand"
              />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-[14px]">
      {/* Client selector FIRST (client decision) */}
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft">
          Sprint client
        </span>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="max-w-[300px] rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[9px] font-sans text-[13px] font-semibold text-ink"
        >
          {clients.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          {prospects.map((b) => (
            <option key={b.id} value={b.id} disabled>
              {b.name} — audit-only (prospect)
            </option>
          ))}
        </select>
        <span className="text-[11px] text-ink-faint">
          prospects are audit-only until marked as client
        </span>
      </div>

      {/* Prereq gate — entry for every client until their sprint runs */}
      {showGate && (
        <SprintGate
          key={clientId}
          bizId={clientId}
          onReady={(label) => (
            <button
              type="button"
              onClick={() => {
                if (isManovedh) {
                  setStage("active");
                  toast("Baseline locked — 41/100 · grid avg 7.8");
                } else {
                  toast("Demo: the full sprint board lives on मनोवेध हिप्नोक्लिनिक");
                }
              }}
              className="rounded-[9px] bg-brand px-[22px] py-3 text-[14px] font-bold text-white hover:bg-brand-hover"
            >
              {label}
            </button>
          )}
        />
      )}

      {isManovedh && (
        <>
          {/* Demo-state switcher (prototype) */}
          <div className="flex flex-wrap items-center gap-[6px]">
            <span className="text-[11px] text-ink-faint">Demo states:</span>
            {(["none", "active", "complete"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className={cn(
                  "rounded-lg border-[1.5px] px-[14px] py-[7px] text-[12.5px] font-semibold capitalize",
                  stage === s
                    ? "border-brand bg-brand text-white"
                    : "border-[rgba(27,35,33,0.14)] bg-bg-surface text-ink-soft hover:border-brand",
                )}
              >
                {s === "none" ? "No sprint" : s}
              </button>
            ))}
          </div>

          {stage === "none" && (
            <div className="max-w-[620px] text-[12px] leading-relaxed text-ink-soft">
              Starting a sprint{" "}
              <span className="font-bold text-ink">
                locks today&apos;s audit as the baseline
              </span>{" "}
              — score, every rubric value, all profile fields and the latest
              grid avg. Every fix after that is logged; the sprint ends with a
              Before/After report.
            </div>
          )}

          {stage === "active" && (
            <>
              {/* Sprint header — baseline strip + progress + actions */}
              <Card className="px-5 py-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-[6px] text-[17px] font-bold">
                      मनोवेध हिप्नोक्लिनिक — Optimization Sprint
                    </div>
                    <div className="flex flex-wrap gap-[6px]">
                      <span className="rounded-chip bg-brand-accent px-[11px] py-1 text-[11.5px] font-bold text-bg-nav">
                        Sprint active · day 9
                      </span>
                      <span className="rounded-chip bg-bg-nav px-[11px] py-1 text-[11.5px] font-semibold text-white">
                        Client
                      </span>
                      <span className="rounded-chip border-[1.5px] border-brand-accent bg-bg-surface px-[11px] py-1 text-[11.5px] font-semibold text-band-warn">
                        Optimization ₹4,999
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-[6px]">
                    <span className="whitespace-nowrap rounded-chip border-[1.5px] border-[rgba(27,35,33,0.2)] px-[11px] py-1 text-[11.5px] font-semibold text-ink-soft">
                      Baseline locked 12 Jul — {detail.baseline_score}/100
                    </span>
                    <span className="whitespace-nowrap rounded-chip bg-band-good-bg px-[11px] py-1 text-[11.5px] font-bold text-band-good">
                      Now {currentScore}/100 ▲ +{currentScore - (detail.baseline_score ?? 41)}
                    </span>
                    <span className="whitespace-nowrap rounded-chip bg-[#EDEAE3] px-[11px] py-1 text-[11.5px] font-semibold text-ink-soft">
                      {blockedN} blocked external
                    </span>
                  </div>
                </div>
                <div className="mb-[5px] flex justify-between text-[11.5px]">
                  <span className="font-semibold">
                    {doneN} of {tasks.length} tasks done
                  </span>
                  <span className="font-mono text-ink-soft">{pct}%</span>
                </div>
                <div className="mb-[14px] h-[6px] overflow-hidden rounded-[3px] bg-[#EDEAE3]">
                  <div
                    className="h-full rounded-[3px] bg-band-good transition-[width] ease-out [transition-duration:400ms]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchOpen(true)}
                    className="rounded-lg bg-brand-accent px-4 py-[9px] text-[12.5px] font-bold text-bg-nav hover:bg-brand-accent-hover"
                  >
                    Apply all safe suggestions
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className={ACTION_SECONDARY}
                  >
                    Generate Before/After report
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStage("complete");
                      patchSprint({ complete_sprint: true });
                      toast("Sprint completed — final report ready");
                    }}
                    className="rounded-lg bg-brand px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-brand-hover"
                  >
                    Complete sprint
                  </button>
                </div>
                <div className="mt-[9px] text-[11px] text-ink-faint">
                  After the last task, the re-audit runs automatically (₹1.9)
                  and the report is drafted — you just tap Send.
                </div>
              </Card>

              <div className="flex flex-wrap items-start gap-[14px]">
                {/* Fix checklist */}
                <Card className="min-w-[340px] flex-[1.7] px-5 py-[14px]">
                  <div className="flex flex-wrap items-baseline justify-between gap-[10px] pb-2">
                    <div className="text-[14.5px] font-bold">Fix checklist</div>
                    <span className="text-[11px] text-ink-faint">
                      every task opens pre-filled by AI — approve, don&apos;t
                      compose
                    </span>
                  </div>
                  {[...groups, ...(customGroup.length ? [{ key: "custom", label: "Custom", src: "founder-added", tasks: customGroup }] : [])].map((g) => {
                    const gDone = g.tasks.filter((t) => t.status === "done").length;
                    const open = openGroups[g.key] ?? false;
                    const isWebsite = g.key === "website";
                    return (
                      <div key={g.key} className="border-t border-[rgba(27,35,33,0.09)]">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroups((m) => ({ ...m, [g.key]: !open }))
                          }
                          className="flex w-full flex-wrap items-center gap-[9px] py-3 text-left"
                        >
                          <span className="text-[13px] font-bold">{g.label}</span>
                          <span className="whitespace-nowrap rounded-chip bg-bg-app px-2 py-[2px] text-[10px] font-semibold text-ink-soft">
                            {g.src}
                          </span>
                          <span className="font-mono text-[11px] text-ink-soft">
                            {gDone}/{g.tasks.length}
                          </span>
                          {isWebsite && (
                            <span className="whitespace-nowrap text-[10.5px] font-semibold text-band-warn">
                              1 internal · 4 with vendor
                            </span>
                          )}
                          <span className="flex-1" />
                          {isWebsite && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                void navigator.clipboard?.writeText(
                                  "Website fixes for vendor: meta description, category page, spelling Minde→Mind, heading hierarchy.",
                                );
                                toast("Vendor brief copied — WhatsApp it to the website vendor");
                              }}
                              className="flex-none rounded-chip border-[1.5px] border-brand bg-bg-surface px-[11px] py-[5px] text-[10.5px] font-bold text-brand hover:bg-[#F0F5F2]"
                            >
                              Copy brief for vendor
                            </span>
                          )}
                          <span className="flex-none text-[11px] text-ink-faint">
                            {open ? "▴" : "▾"}
                          </span>
                        </button>
                        {open && (
                          <div className="pl-2">
                            {g.tasks.map((t) => {
                              const ui = sprintTaskUiMock[t.id] ?? {
                                pts: "+1",
                                time: "~2 min",
                                meta: "founder-added",
                                waLine: "",
                                kind: "custom",
                              };
                              const [glyph, chipCls] = STATUS_CHIP[t.status];
                              const isOpen = openTask === t.id;
                              const notify = !notifyOff[t.id];
                              return (
                                <div key={t.id} className="border-t border-[rgba(27,35,33,0.06)]">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      setOpenTask(isOpen ? null : t.id)
                                    }
                                    className="flex cursor-pointer items-center gap-[10px] py-[10px]"
                                  >
                                    <span className={cn("flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold", chipCls)}>
                                      {glyph}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold">
                                        {t.title}
                                      </div>
                                      <div className="mt-[2px] flex flex-wrap items-center gap-2">
                                        <span className={cn("text-[11px] font-semibold", t.status === "done" ? "text-band-good" : t.status === "blocked" ? "text-band-crit" : "text-band-warn")}>
                                          {statusOverride[t.id] === "done"
                                            ? "done just now"
                                            : ui.meta}
                                        </span>
                                        <span className="font-mono text-[10.5px] text-ink-faint">
                                          {ui.time}
                                        </span>
                                      </div>
                                    </div>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      title="Queue a WhatsApp progress line to the client"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNotifyOff((m) => ({ ...m, [t.id]: notify }));
                                      }}
                                      className={cn(
                                        "flex-none whitespace-nowrap rounded-chip px-2 py-[3px] text-[10px] font-bold",
                                        notify
                                          ? "bg-band-good-bg text-band-good"
                                          : "bg-[#EDEAE3] text-ink-faint",
                                      )}
                                    >
                                      {notify ? "Notify ✓" : "Notify off"}
                                    </span>
                                    <span className="flex-none font-mono text-[12px] font-bold text-band-good">
                                      {ui.pts}
                                    </span>
                                    <span className="flex-none text-[11px] text-ink-faint">
                                      {isOpen ? "▴" : "▾"}
                                    </span>
                                  </div>
                                  {isOpen && renderTaskDetail(t)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Custom task adder */}
                  {addOpen ? (
                    <div className="mt-[10px] flex flex-wrap items-center gap-2 rounded-[10px] border-[1.5px] border-brand p-3">
                      <input
                        value={addTitle}
                        onChange={(e) => setAddTitle(e.target.value)}
                        placeholder="Task title — e.g. Link Facebook page"
                        className="min-w-[180px] flex-[2] rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[11px] py-[9px] text-[12.5px] outline-brand"
                      />
                      <input
                        value={addPts}
                        onChange={(e) => setAddPts(e.target.value)}
                        placeholder="pts"
                        inputMode="numeric"
                        className="w-16 rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[11px] py-[9px] font-mono text-[12.5px] outline-brand"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!addTitle.trim()) return;
                          const id = `custom-${customTasks.length + 1}`;
                          setCustomTasks((c) => [
                            ...c,
                            {
                              id,
                              sprint_id: detail.sprint.id,
                              rubric_key: "custom",
                              title: addTitle.trim(),
                              status: "todo",
                              source: "manual",
                              done_at: null,
                              note: null,
                              change_before: null,
                              change_after: null,
                              created_at: new Date().toISOString(),
                            },
                          ]);
                          patchSprint({
                            add_custom_task: {
                              title: addTitle.trim(),
                              rubric_key: "custom",
                            },
                          });
                          setAddTitle("");
                          setAddPts("");
                          setAddOpen(false);
                          setOpenGroups((m) => ({ ...m, custom: true }));
                          toast("Custom task added — Notify defaults ON");
                        }}
                        className="rounded-lg bg-brand px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-brand-hover"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddOpen(false)}
                        className={ACTION_GHOST}
                      >
                        ✕
                      </button>
                      <span className="w-full text-[10.5px] text-ink-faint">
                        Notify defaults ON — completing it queues a client
                        update line.
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddOpen(true)}
                      className="mt-[10px] w-full rounded-[10px] border-[1.5px] border-dashed border-[rgba(27,35,33,0.25)] p-[10px] text-center text-[12.5px] font-semibold text-ink-soft hover:border-brand hover:text-brand"
                    >
                      + Add custom task
                    </button>
                  )}
                  <div className="mt-[10px] border-t border-[rgba(27,35,33,0.07)] pt-[10px] text-[11px] text-ink-faint">
                    Connected clients publish via API · Manager-access clients
                    get &quot;copy value → open Google editor&quot; on each
                    control.
                  </div>
                </Card>

                {/* Simulator + client updates */}
                <div className="flex min-w-[290px] flex-1 flex-col gap-[14px]">
                  <SprintSimulator
                    baseline={detail.baseline_score ?? 41}
                    current={currentScore}
                  />
                  <Card className="px-5 py-4">
                    <div className="mb-[2px] text-[14.5px] font-bold">
                      Client updates
                    </div>
                    <div className="mb-3 text-[11.5px] text-ink-faint">
                      Auto-queued when a task with Notify ✓ completes · one
                      tidy message per day, no spam.
                    </div>
                    {sprintClientUpdatesMock.map((u) => (
                      <div
                        key={u.date}
                        className="mb-2 rounded-[10px] bg-bg-app px-3 py-[10px]"
                      >
                        <div className="mb-1 flex justify-between gap-2">
                          <span className="text-[10.5px] font-bold text-ink-soft">
                            {u.date}
                          </span>
                          <span className="rounded-chip bg-band-good-bg px-2 py-[2px] text-[10px] font-bold text-band-good">
                            Sent ✓
                          </span>
                        </div>
                        <div className="text-[12.5px] leading-[1.65]">
                          {u.text}
                        </div>
                      </div>
                    ))}
                    {queuedUpdates.length > 0 ? (
                      <div className="rounded-[10px] border border-[rgba(15,92,72,0.18)] bg-[#F0F5F2] px-3 py-[10px]">
                        <div className="mb-1 flex justify-between gap-2">
                          <span className="text-[10.5px] font-bold text-brand">
                            Today
                          </span>
                          <span className="rounded-chip bg-band-warn-bg px-2 py-[2px] text-[10px] font-bold text-band-warn">
                            Queued — sends 7:00 PM
                          </span>
                        </div>
                        <div className="text-[12.5px] leading-[1.65]">
                          नमस्कार! आजची प्रगती: {queuedUpdates.join(" · ")} —
                          तुमची डिजिटल एजन्सी
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[10px] border border-dashed border-[rgba(27,35,33,0.22)] px-3 py-[10px] text-[12px] leading-relaxed text-ink-faint">
                        No updates queued today yet — completing a task with
                        Notify ✓ adds a line here.
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </>
          )}

          {stage === "complete" && (
            <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
              <span className="rounded-chip bg-band-good-bg px-3 py-1 text-[10.5px] font-bold tracking-[1px] text-band-good">
                SPRINT COMPLETED · 12–20 JUL 2026
              </span>
              <div className="flex flex-wrap items-center justify-center gap-[14px]">
                <span className="font-mono text-[44px] font-bold text-ink-soft">
                  41
                </span>
                <span className="text-[26px] font-bold text-band-good">→</span>
                <span className="font-mono text-[56px] font-bold text-band-good">
                  78
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-chip bg-band-warn-bg px-3 py-1 text-[12px] font-bold text-band-warn">
                  सुधारणा आवश्यक
                </span>
                <span className="text-[13px] font-bold text-band-good">→</span>
                <span className="rounded-chip bg-band-good-bg px-3 py-1 text-[12px] font-bold text-band-good">
                  चांगले
                </span>
              </div>
              <div className="text-[12.5px] text-ink-soft">
                {doneN}/{tasks.length} tasks · grid avg 7.8 → 4.6 · reply rate
                6.67% → 100%
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className={ACTION_SECONDARY}
                >
                  View report
                </button>
                <button
                  type="button"
                  onClick={() => toast("Client Ops ships later today")}
                  className="rounded-[9px] bg-brand px-[18px] py-[10px] text-[13px] font-semibold text-white hover:bg-brand-hover"
                >
                  Monthly service continues in Client Ops →
                </button>
              </div>
            </Card>
          )}

          {/* Apply-all-safe modal */}
          {batchOpen && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-[rgba(15,20,18,0.55)]"
                onClick={() => setBatchOpen(false)}
              />
              <div className="relative w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-1 rounded-modal bg-bg-surface px-6 py-[22px] shadow-modal duration-200">
                <div className="mb-[6px] text-[16px] font-bold">
                  Apply all safe suggestions
                </div>
                <div className="mb-3 text-[12.5px] leading-relaxed text-ink-soft">
                  One confirm applies every remaining low-risk AI suggestion:
                </div>
                {tasks
                  .filter(
                    (t) =>
                      t.status === "todo" &&
                      ["plain", "desc", "attr"].includes(
                        sprintTaskUiMock[t.id]?.kind ?? "",
                      ),
                  )
                  .map((t) => (
                    <div
                      key={t.id}
                      className="mb-2 flex items-start gap-[9px] rounded-[10px] border border-line px-3 py-[10px]"
                    >
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-band-warn-bg text-[11px] font-bold text-band-warn">
                        !
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold">
                          {t.title}
                        </div>
                        <div className="text-[11.5px] text-ink-soft">
                          {sprintTaskUiMock[t.id]?.meta} ·{" "}
                          {sprintTaskUiMock[t.id]?.pts} pts
                        </div>
                      </div>
                    </div>
                  ))}
                <div className="mb-[14px] rounded-lg bg-band-warn-bg px-3 py-[9px] text-[12px] font-medium leading-[1.55] text-band-warn">
                  Category changes always need individual confirm — they can
                  trigger re-verification.
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchOpen(false)}
                    className={ACTION_GHOST}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const safe = tasks.filter(
                        (t) =>
                          t.status === "todo" &&
                          ["plain", "desc", "attr"].includes(
                            sprintTaskUiMock[t.id]?.kind ?? "",
                          ),
                      );
                      safe.forEach((t) => completeTask(t));
                      setBatchOpen(false);
                      toast(`Applied ${safe.length} safe suggestions ✓`);
                    }}
                    className="rounded-lg bg-brand px-[18px] py-[9px] text-[13px] font-semibold text-white hover:bg-brand-hover"
                  >
                    Apply{" "}
                    {
                      tasks.filter(
                        (t) =>
                          t.status === "todo" &&
                          ["plain", "desc", "attr"].includes(
                            sprintTaskUiMock[t.id]?.kind ?? "",
                          ),
                      ).length
                    }{" "}
                    suggestions
                  </button>
                </div>
              </div>
            </div>
          )}

          {reportOpen && (
            <SprintReportModal
              sprintId={detail.sprint.id}
              initialLang={pdfLangFor(clientId)}
              onClose={() => setReportOpen(false)}
            />
          )}
        </>
      )}
    </section>
  );
}
