"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SprintGroup, SprintPatchRequest, SprintTask } from "@/types";
import { SPRINT_GROUP_LABELS, SPRINT_GROUPS, projectedScore } from "@/types";
import { useAppState } from "@/components/shell/app-state";
import { apiPost } from "@/components/lib/api";
import {
  buildSprintGroups,
  sprintClientUpdatesMock,
  sprintDetailMock,
  sprintGatesMock,
  sprintMachineReviewsMock,
  sprintReportMock,
  sprintTaskUiMock,
} from "@/components/mocks/sprint";
import { SprintGate } from "@/components/sprint/gate";
import { SprintSimulator } from "@/components/sprint/simulator";
import { SprintReportModal } from "@/components/sprint/report-modal";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type Stage = "none" | "active" | "complete";

/** Audit-source chips per group (UI copy, mirrors §2.7b P12). */
const GROUP_SRC: Record<SprintGroup, string> = {
  profile: "from Basic Audit",
  reviews: "from Review Audit",
  posts: "from Post Audit",
  website: "from Website Audit",
  visibility: "from Grid Scan",
  citations: "NAP tracker",
};

const ACTION_GHOST =
  "rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[12.5px] font-semibold hover:border-ink";
const ACTION_SECONDARY =
  "rounded-lg border-[1.5px] border-brand bg-bg-surface px-4 py-[9px] text-[12.5px] font-semibold text-brand hover:bg-[#F0F5F2]";
const APPROVE_BTN =
  "rounded-lg bg-brand px-4 py-2 text-[12.5px] font-bold text-white hover:bg-brand-hover";

const STATUS_CHIP: Record<SprintTask["status"], [string, string]> = {
  done: ["✓", "bg-band-good-bg text-band-good"],
  todo: ["!", "bg-band-warn-bg text-band-warn"],
  blocked: ["✕", "bg-band-crit-bg text-band-crit"],
  doing: ["…", "bg-band-warn-bg text-band-warn"],
};

/** P12 Optimization Sprint — client selector → US-024 gate → sprint board. */
export default function SprintPage() {
  const router = useRouter();
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
  // Contract note: on load the page reads GET /api/sprint?businessId= and
  // branches start-vs-resume on prereqs.active_sprint_id — mock equivalent:
  // stage 'active' == active_sprint_id set (resume), 'none' == start flow.
  const [stage, setStage] = useState<Stage>("active");
  const showGate = !isManovedh || stage === "none";

  // Task-state overrides on top of the fixture (approve/done/note/edit).
  const [approvedOverride, setApprovedOverride] = useState<Record<string, boolean>>({});
  const [statusOverride, setStatusOverride] = useState<
    Record<string, SprintTask["status"]>
  >({});
  const [noteByTask, setNoteByTask] = useState<Record<string, string>>({});
  const [valueOverride, setValueOverride] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    profile: true,
  });
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [customTasks, setCustomTasks] = useState<SprintTask[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addGroup, setAddGroup] = useState<SprintGroup>("profile");
  const [batchOpen, setBatchOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [queuedUpdates, setQueuedUpdates] = useState<string[]>([]);

  const detail = sprintDetailMock;
  const tasks: SprintTask[] = useMemo(
    () =>
      [...detail.tasks, ...customTasks].map((t) => ({
        ...t,
        status: statusOverride[t.id] ?? t.status,
        approved: approvedOverride[t.id] ?? t.approved,
        suggested_value: valueOverride[t.id] ?? t.suggested_value,
        note: noteByTask[t.id] ?? t.note,
      })),
    [detail.tasks, customTasks, statusOverride, approvedOverride, valueOverride, noteByTask],
  );

  const doneN = tasks.filter((t) => t.status === "done").length;
  const blockedN = tasks.filter((t) => t.status === "blocked").length;
  const pct = Math.round((doneN / tasks.length) * 100);
  const baseline = detail.baseline;
  // Locked-contract simulator math: baseline + rubric_points of done tasks.
  const currentScore = projectedScore(baseline.score, tasks) ?? baseline.score ?? 0;
  const allInternalScore =
    projectedScore(
      baseline.score,
      tasks.map((t) => ({
        status: t.status === "blocked" ? t.status : "done",
        rubric_points: t.rubric_points,
      })),
    ) ?? currentScore;
  const vendorPoints = tasks
    .filter((t) => t.status === "blocked")
    .reduce((s, t) => s + t.rubric_points, 0);

  /** EP-021 PATCH — typed; registry "/api/sprint" OFF → local state is truth. */
  const patchSprint = (patch: SprintPatchRequest) => {
    void apiPost(`/api/sprint/${detail.sprint.id}`, patch);
  };

  /** Approve tap (#4) — unlocks copy + editor + the done transition. */
  const approveTask = (t: SprintTask) => {
    setApprovedOverride((m) => ({ ...m, [t.id]: true }));
    patchSprint({ task_id: t.id, task_approved: true });
    toast(`${t.title} — suggestion approved · copy + editor unlocked`);
  };

  /** Done: requires approved + non-empty change_after (source='audit'). */
  const markDone = (t: SprintTask) => {
    setStatusOverride((m) => ({ ...m, [t.id]: "done" }));
    setOpenTask(null);
    patchSprint({
      task_id: t.id,
      task_status: "done",
      change_before: t.current_value ?? undefined,
      change_after: t.suggested_value ?? t.title,
    });
    const ui = sprintTaskUiMock[t.id];
    if (ui?.waLine) setQueuedUpdates((q) => [...q, ui.waLine]);
    toast(`${t.title} — applied ✓ · change logged`);
  };

  /** Contract: no 'skipped' status — a skipped task is blocked with a note. */
  const markNa = (t: SprintTask) => {
    setStatusOverride((m) => ({ ...m, [t.id]: "blocked" }));
    setNoteByTask((m) => ({ ...m, [t.id]: m[t.id] || "Marked N/A by founder" }));
    setOpenTask(null);
    patchSprint({
      task_id: t.id,
      task_status: "blocked",
      task_note: noteByTask[t.id] || "Marked N/A by founder",
    });
    toast("Marked N/A — excluded from the report");
  };

  const groups = buildSprintGroups(tasks);

  const renderTaskDetail = (t: SprintTask) => {
    const editing = editingTask === t.id;
    const copyValue = t.copy_text ?? t.suggested_value ?? "";

    if (t.status === "done") {
      return (
        <div className="pb-[13px] pl-8">
          {t.change_before !== null && (
            <div className="text-[12.5px] leading-relaxed">
              <span className="text-ink-faint">{t.change_before}</span>{" "}
              <span className="font-bold text-band-good">→</span>{" "}
              <span className="font-semibold">{t.change_after}</span>
            </div>
          )}
          {sprintTaskUiMock[t.id]?.waLine && (
            <div className="mt-2 max-w-[520px] rounded-lg bg-[#F0F5F2] px-[11px] py-2 text-[12px] leading-relaxed">
              <span className="mb-[2px] block text-[9.5px] font-bold tracking-[0.6px] text-brand">
                CLIENT UPDATE LINE
              </span>
              {sprintTaskUiMock[t.id].waLine}
            </div>
          )}
          {t.note && (
            <div className="mt-2 text-[11.5px] text-ink-faint">Note: {t.note}</div>
          )}
        </div>
      );
    }

    if (t.status === "blocked") {
      return (
        <div className="pb-[13px] pl-8">
          <div className="mb-2 max-w-[560px] text-[12.5px] leading-relaxed">
            <span className="font-semibold text-band-crit">
              {t.current_value}
            </span>{" "}
            <span className="font-bold text-band-good">→</span>{" "}
            <span className="font-semibold">{t.suggested_value}</span>
          </div>
          <div className="flex flex-wrap items-center gap-[6px]">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(copyValue);
                toast("Copied for vendor — Marathi + English note ready to WhatsApp");
              }}
              className="rounded-lg border-[1.5px] border-brand bg-bg-surface px-[14px] py-[7px] text-[12px] font-semibold text-brand hover:bg-[#F0F5F2]"
            >
              Copy for vendor
            </button>
            <span className="text-[11px] text-ink-faint">
              {t.note ? `note: ${t.note}` : "external — client's website vendor"}
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
            <span className="font-mono font-semibold text-ink">
              {sprintMachineReviewsMock}
            </span>{" "}
            new reviews so far · customer photos arrive with reviews.
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

    // todo — approve unlocks copy (copy_text ?? suggested_value) + editor + done.
    return (
      <div className="pb-[13px] pl-8">
        <div className="max-w-[560px] rounded-[10px] border border-[rgba(15,92,72,0.18)] bg-[#F0F5F2] px-[13px] py-[11px]">
          <div className="mb-[5px] flex flex-wrap justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-brand">
              {editing
                ? "Editing AI draft"
                : t.approved
                  ? "Approved — copy the value, then apply it in the Google editor"
                  : "Suggested by AI — review before applying"}
            </span>
            {t.rubric_key === "description" && (
              <span className="font-mono text-[10.5px] text-ink-soft">
                {(editing ? draft : (t.suggested_value ?? "")).length} / 750
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
                    toast("Draft saved — approve to unlock copy + editor");
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
              {/* current → suggested (contract: current_value on SprintTask) */}
              <div className="mb-2 text-[12.5px] leading-[1.65]">
                <span className="text-ink-faint">
                  {t.current_value ?? "—"}
                </span>{" "}
                <span className="font-bold text-band-good">→</span>{" "}
                <span className="font-semibold">{t.suggested_value}</span>
              </div>
              <div className="flex flex-wrap items-center gap-[6px]">
                {!t.approved ? (
                  <>
                    <button
                      type="button"
                      onClick={() => approveTask(t)}
                      className={APPROVE_BTN}
                    >
                      Approve suggestion
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(t.id);
                        setDraft(t.suggested_value ?? "");
                      }}
                      className={ACTION_GHOST}
                    >
                      Edit
                    </button>
                    <span className="text-[11px] text-ink-faint">
                      approval unlocks copy + editor + done (#4)
                    </span>
                  </>
                ) : (
                  <>
                    {/* Manual mode (ADR-010): copy value → open Google editor */}
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(copyValue);
                        toast(
                          t.editor_hint
                            ? `Copied — ${t.editor_hint}`
                            : "Value copied — paste it in the Google editor",
                        );
                      }}
                      className={ACTION_SECONDARY}
                    >
                      Copy value
                    </button>
                    {t.editor_url ? (
                      <a
                        href={t.editor_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[12.5px] font-semibold no-underline hover:border-ink"
                      >
                        Open Google editor ↗
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink-faint">
                        copy-only — no direct editor target
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => markDone(t)}
                      className={APPROVE_BTN}
                    >
                      Mark done
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => markNa(t)}
                  className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[12.5px] font-semibold text-ink-soft hover:border-ink"
                >
                  Mark N/A
                </button>
              </div>
              {t.editor_hint && t.approved && (
                <div className="mt-2 text-[11px] text-ink-faint">
                  {t.editor_hint}
                </div>
              )}
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

      {/* US-024 gate — entry for every client until their sprint runs */}
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
                    {baseline.locked && (
                      <span className="whitespace-nowrap rounded-chip border-[1.5px] border-[rgba(27,35,33,0.2)] px-[11px] py-1 text-[11.5px] font-semibold text-ink-soft">
                        Baseline locked{" "}
                        {new Date(baseline.captured_at).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short" },
                        )}{" "}
                        — {baseline.score}/100
                      </span>
                    )}
                    <span className="whitespace-nowrap rounded-chip bg-band-good-bg px-[11px] py-1 text-[11.5px] font-bold text-band-good">
                      Now {currentScore}/100 ▲ +
                      {currentScore - (baseline.score ?? 0)}
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
                  Completing links the after-state from existing scans only —
                  it never triggers a paid audit or grid (#7).
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
                  {groups.map((g) => {
                    const open = openGroups[g.group] ?? false;
                    const isWebsite = g.group === "website";
                    return (
                      <div
                        key={g.group}
                        className="border-t border-[rgba(27,35,33,0.09)]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroups((m) => ({ ...m, [g.group]: !open }))
                          }
                          className="flex w-full flex-wrap items-center gap-[9px] py-3 text-left"
                        >
                          <span className="text-[13px] font-bold">
                            {g.label}
                          </span>
                          <span className="whitespace-nowrap rounded-chip bg-bg-app px-2 py-[2px] text-[10px] font-semibold text-ink-soft">
                            {GROUP_SRC[g.group]}
                          </span>
                          <span className="font-mono text-[11px] text-ink-soft">
                            {g.done_count}/{g.total_count}
                          </span>
                          {g.remaining_minutes > 0 && (
                            <span className="whitespace-nowrap rounded-chip bg-band-warn-bg px-2 py-[2px] font-mono text-[10px] font-bold text-band-warn">
                              ~{g.remaining_minutes} min left
                            </span>
                          )}
                          {isWebsite && (
                            <span className="whitespace-nowrap text-[10.5px] font-semibold text-band-warn">
                              {
                                g.tasks.filter(
                                  (t) =>
                                    t.status !== "blocked" &&
                                    t.status !== "done",
                                ).length
                              }{" "}
                              internal ·{" "}
                              {
                                g.tasks.filter((t) => t.status === "blocked")
                                  .length
                              }{" "}
                              with vendor
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
                                  g.tasks
                                    .filter((t) => t.status === "blocked")
                                    .map((t) => t.copy_text ?? t.title)
                                    .join("\n"),
                                );
                                toast(
                                  "Vendor brief copied — WhatsApp it to the website vendor",
                                );
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
                              const [glyph, chipCls] = STATUS_CHIP[t.status];
                              const isOpen = openTask === t.id;
                              const meta =
                                statusOverride[t.id] === "done"
                                  ? "done just now"
                                  : (sprintTaskUiMock[t.id]?.meta ??
                                    "founder-added");
                              return (
                                <div
                                  key={t.id}
                                  className="border-t border-[rgba(27,35,33,0.06)]"
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      setOpenTask(isOpen ? null : t.id)
                                    }
                                    className="flex cursor-pointer items-center gap-[10px] py-[10px]"
                                  >
                                    <span
                                      className={cn(
                                        "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold",
                                        chipCls,
                                      )}
                                    >
                                      {glyph}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold">
                                        {t.title}
                                      </div>
                                      <div className="mt-[2px] flex flex-wrap items-center gap-2">
                                        <span
                                          className={cn(
                                            "text-[11px] font-semibold",
                                            t.status === "done"
                                              ? "text-band-good"
                                              : t.status === "blocked"
                                                ? "text-band-crit"
                                                : "text-band-warn",
                                          )}
                                        >
                                          {meta}
                                        </span>
                                        {t.estimate_minutes !== null && (
                                          <span className="font-mono text-[10.5px] text-ink-faint">
                                            ~{t.estimate_minutes} min
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="flex-none font-mono text-[12px] font-bold text-band-good">
                                      {t.rubric_points > 0
                                        ? `+${t.rubric_points}`
                                        : "·"}
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

                  {/* Custom task adder — {title, group} per the locked contract */}
                  {addOpen ? (
                    <div className="mt-[10px] flex flex-wrap items-center gap-2 rounded-[10px] border-[1.5px] border-brand p-3">
                      <input
                        value={addTitle}
                        onChange={(e) => setAddTitle(e.target.value)}
                        placeholder="Task title — e.g. Link Facebook page"
                        className="min-w-[180px] flex-[2] rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[11px] py-[9px] text-[12.5px] outline-brand"
                      />
                      <select
                        value={addGroup}
                        onChange={(e) =>
                          setAddGroup(e.target.value as SprintGroup)
                        }
                        className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[11px] py-[9px] font-sans text-[12.5px]"
                      >
                        {SPRINT_GROUPS.map((gr) => (
                          <option key={gr} value={gr}>
                            {SPRINT_GROUP_LABELS[gr]}
                          </option>
                        ))}
                      </select>
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
                              rubric_key: `custom_${id}`,
                              title: addTitle.trim(),
                              status: "todo",
                              source: "manual",
                              // Manual tasks need no approval (founder authored).
                              approved: true,
                              suggested_value: null,
                              copy_text: null,
                              ai_output_id: null,
                              change_before: null,
                              change_after: null,
                              note: null,
                              done_at: null,
                              created_at: new Date().toISOString(),
                              group: addGroup,
                              rubric: null,
                              current_value: null,
                              editor_url: null,
                              editor_hint: null,
                              estimate_minutes: null,
                              rubric_points: 0,
                            },
                          ]);
                          patchSprint({
                            add_custom_task: {
                              title: addTitle.trim(),
                              group: addGroup,
                            },
                          });
                          setAddTitle("");
                          setAddOpen(false);
                          setOpenGroups((m) => ({ ...m, [addGroup]: true }));
                          toast("Custom task added");
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
                    Manual mode (ADR-010): approve → copy value → open the
                    Google editor → mark done. Zero API writes.
                  </div>
                </Card>

                {/* Simulator + client updates */}
                <div className="flex min-w-[290px] flex-1 flex-col gap-[14px]">
                  <SprintSimulator
                    baseline={baseline.score ?? 0}
                    current={currentScore}
                    allInternal={allInternalScore}
                    vendorPoints={vendorPoints}
                  />
                  <Card className="px-5 py-4">
                    <div className="mb-[2px] text-[14.5px] font-bold">
                      Client updates
                    </div>
                    <div className="mb-3 text-[11.5px] text-ink-faint">
                      Progress lines collect here — one tidy WhatsApp message
                      per day ships with the Week-2 wa keys.
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
                        No updates queued today yet — completing a task adds a
                        line here.
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </>
          )}

          {stage === "complete" && (
            <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
              <span className="rounded-chip bg-band-good-bg px-3 py-1 text-[10.5px] font-bold uppercase tracking-[1px] text-band-good">
                {sprintReportMock.period} · completed
              </span>
              <div className="flex flex-wrap items-center justify-center gap-[14px]">
                <span className="font-mono text-[44px] font-bold text-ink-soft">
                  {sprintReportMock.before_score}
                </span>
                <span className="text-[26px] font-bold text-band-good">→</span>
                <span className="font-mono text-[56px] font-bold text-band-good">
                  {sprintReportMock.after_score}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-chip bg-band-warn-bg px-3 py-1 text-[12px] font-bold text-band-warn">
                  {sprintReportMock.before_band}
                </span>
                <span className="text-[13px] font-bold text-band-good">→</span>
                <span className="rounded-chip bg-band-good-bg px-3 py-1 text-[12px] font-bold text-band-good">
                  {sprintReportMock.after_band}
                </span>
              </div>
              <div className="text-[12.5px] text-ink-soft">
                {doneN}/{tasks.length} tasks · grid avg{" "}
                {sprintReportMock.grid.avg_before} →{" "}
                {sprintReportMock.grid.avg_after} · reply rate{" "}
                {sprintReportMock.reviews.reply_before}% →{" "}
                {sprintReportMock.reviews.reply_after}%
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
                  onClick={() => router.push("/client-ops")}
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
                  One confirm APPROVES every remaining low-risk AI suggestion —
                  each still gets applied by hand (copy → Google editor):
                </div>
                {tasks
                  .filter((t) => t.status === "todo" && !t.approved)
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
                          {sprintTaskUiMock[t.id]?.meta}
                          {t.rubric_points > 0 && ` · +${t.rubric_points} pts`}
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
                        (t) => t.status === "todo" && !t.approved,
                      );
                      safe.forEach((t) => approveTask(t));
                      setBatchOpen(false);
                      toast(`Approved ${safe.length} suggestions — apply each via copy + editor`);
                    }}
                    className="rounded-lg bg-brand px-[18px] py-[9px] text-[13px] font-semibold text-white hover:bg-brand-hover"
                  >
                    Approve{" "}
                    {tasks.filter((t) => t.status === "todo" && !t.approved).length}{" "}
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
