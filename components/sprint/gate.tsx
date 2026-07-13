"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/components/shell/app-state";
import {
  manovedhClientGateMock,
  sprintGatesMock,
} from "@/components/mocks/sprint";
import { useToast } from "@/components/ui/toast";

interface GateRow {
  num: string;
  title: string;
  ok: boolean | "warn";
  value: string;
  action?: { label: string; run: () => void; blocked?: boolean };
  inlineFields?: boolean;
}

const CHIP = (ok: boolean | "warn") =>
  cn(
    "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold",
    ok === true
      ? "bg-band-good-bg text-band-good"
      : ok === "warn"
        ? "bg-band-warn-bg text-band-warn"
        : "bg-band-crit-bg text-band-crit",
  );

/**
 * US-024 prerequisites gate — every unmet prereq renders its reason + the
 * founder action that fixes it. All four green (or warn-pass) → sprint can
 * start. Per-client fixtures come from sprintGatesMock.
 */
export function SprintGate({
  bizId,
  onReady,
}: {
  bizId: string;
  /** Renders the start control once every gate passes. */
  onReady: (startLabel: string) => React.ReactNode;
}) {
  const toast = useToast();
  const { capHit, liveDataEnabled } = useAppState();
  const fixture = sprintGatesMock[bizId];

  // Founder-action state (per mount; per-client keys).
  const [markedClient, setMarkedClient] = useState(false);
  const [clientModal, setClientModal] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerSaved, setOwnerSaved] = useState(false);
  const [managerAck, setManagerAck] = useState(false);
  const [reaudited, setReaudited] = useState(false);

  if (!fixture) return null;

  const isManovedh = bizId === "biz-manovedh";
  const rows: GateRow[] = [
    {
      num: "①",
      title: "Client & plan",
      ok: fixture.plan.ok || (isManovedh && markedClient),
      value:
        isManovedh && markedClient
          ? manovedhClientGateMock.plan
          : fixture.plan.value,
      action:
        !fixture.plan.ok && !markedClient
          ? fixture.plan.fix === "mark_client"
            ? { label: "Mark as Client…", run: () => setClientModal(true) }
            : {
                label: "Manage plan",
                run: () =>
                  toast("Open Client Ops → Manage plan to add Optimization ₹4,999"),
              }
          : undefined,
    },
    {
      num: "②",
      title: "Owner contact saved",
      ok:
        fixture.owner.ok ||
        (isManovedh && markedClient) ||
        (fixture.owner.fix === "inline_fields" && ownerSaved),
      value:
        isManovedh && markedClient
          ? manovedhClientGateMock.owner
          : ownerSaved
            ? `+91 ${ownerPhone} · ${ownerName} — saved ✓`
            : fixture.owner.value,
      inlineFields:
        fixture.owner.fix === "inline_fields" && !ownerSaved,
    },
    {
      num: "③",
      title: "Google profile access",
      ok:
        fixture.connection.ok === true ||
        fixture.connection.ok === "warn" ||
        (isManovedh && markedClient) ||
        (fixture.connection.fix === "manual_ack" && managerAck && "warn"),
      value:
        isManovedh && markedClient
          ? manovedhClientGateMock.connection
          : managerAck
            ? "○ Manager access confirmed — manual publish mode"
            : fixture.connection.value,
      action:
        fixture.connection.fix === "manual_ack" && !managerAck
          ? {
              label: "Confirm manager access",
              run: () => {
                setManagerAck(true);
                toast("Manager access confirmed — copy/paste publish mode");
              },
            }
          : undefined,
    },
    {
      num: "④",
      title: "Fresh audit ≤ 7 days",
      ok: fixture.audit.ok || reaudited,
      value: reaudited
        ? (fixture.audit.fresh_value ?? "audited just now ✓")
        : fixture.audit.value,
      action:
        !fixture.audit.ok && !reaudited
          ? {
              label: "Re-audit now · ₹1.9",
              blocked: capHit || !liveDataEnabled,
              run: () => {
                setReaudited(true);
                toast("Re-audit complete — fresh baseline ready");
              },
            }
          : undefined,
    },
  ];

  const allOk = rows.every((r) => r.ok === true || r.ok === "warn");
  const firstUnmet = rows.find((r) => !(r.ok === true || r.ok === "warn"));
  const startLabel = "Start sprint · lock baseline";

  return (
    <div className="max-w-[680px] rounded-card border border-line bg-bg-surface px-5 py-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-[10px]">
        <div className="text-[14.5px] font-bold">Prerequisites</div>
        <span className="text-[11px] text-ink-faint">
          all four green to start a sprint · ₹4,999 setup
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.num} className="border-t border-[rgba(27,35,33,0.07)] py-[11px]">
          <div className="flex items-start gap-[10px]">
            <span className={CHIP(r.ok)}>
              {r.ok === true ? "✓" : r.ok === "warn" ? "!" : "✕"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">
                {r.num} {r.title}
              </div>
              <div className="mt-[2px] text-[12.5px] text-ink-soft">
                {r.value}
              </div>
            </div>
            {r.action &&
              (r.action.blocked ? (
                <button
                  disabled
                  title={
                    capHit
                      ? "Daily cap reached"
                      : "DataForSEO live data is off — enable it in Settings"
                  }
                  className="flex-none cursor-not-allowed whitespace-nowrap rounded-lg border border-[#C9D2DB] bg-[#EEF1F4] px-[14px] py-[7px] text-[12px] font-semibold text-[#8697A6]"
                >
                  {r.action.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={r.action.run}
                  className="flex-none whitespace-nowrap rounded-lg border-[1.5px] border-brand bg-bg-surface px-[14px] py-[7px] text-[12px] font-semibold text-brand hover:bg-[#F0F5F2]"
                >
                  {r.action.label}
                </button>
              ))}
          </div>
          {r.inlineFields && (
            <div className="ml-8 mt-[10px] flex flex-wrap gap-2">
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Owner name"
                className="min-w-[140px] flex-1 rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[11px] py-[9px] text-[12.5px] outline-brand"
              />
              <input
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="Owner WhatsApp — 98XXXXXXXX"
                inputMode="numeric"
                className="min-w-[170px] flex-[1.2] rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-[11px] py-[9px] font-mono text-[12.5px] outline-brand"
              />
              <button
                type="button"
                onClick={() => {
                  if (ownerName.trim() && ownerPhone.replace(/\D/g, "").length >= 10) {
                    setOwnerSaved(true);
                    toast("Owner contact saved ✓");
                  } else {
                    toast("Enter the owner's name + a 10-digit WhatsApp number");
                  }
                }}
                className="rounded-lg bg-brand px-[15px] py-[9px] text-[12px] font-semibold text-white hover:bg-brand-hover"
              >
                Save
              </button>
            </div>
          )}
        </div>
      ))}
      <div className="border-t border-[rgba(27,35,33,0.07)] pt-3">
        {allOk ? (
          onReady(startLabel)
        ) : (
          <div className="flex flex-wrap items-center gap-[10px]">
            <button
              disabled
              className="cursor-not-allowed rounded-[9px] bg-[#E5E1D8] px-[22px] py-3 text-[14px] font-bold text-ink-faint"
            >
              {startLabel}
            </button>
            <span className="text-[12px] font-semibold text-band-crit">
              {firstUnmet?.num} {firstUnmet?.title} pending — fix it above to
              unlock the sprint
            </span>
          </div>
        )}
      </div>

      {/* Mark-as-Client modal — captures owner name + WhatsApp (US-024 ①②③) */}
      {clientModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[rgba(15,20,18,0.55)]"
            onClick={() => setClientModal(false)}
          />
          <div className="relative w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-1 rounded-modal bg-bg-surface px-6 py-[22px] shadow-modal duration-200">
            <div className="mb-1 text-[16px] font-bold">Mark as Client</div>
            <div className="mb-[14px] text-[12.5px] leading-relaxed text-ink-soft">
              Captures the owner contact — it powers reports, client updates
              and the connect flow.
            </div>
            <div className="mb-3 flex flex-col gap-2">
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Owner name — e.g. राजेश जोशी"
                className="w-full rounded-lg border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] text-[13px] outline-brand"
              />
              <input
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="Owner WhatsApp — 98XXXXXXXX"
                inputMode="numeric"
                className="w-full rounded-lg border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] font-mono text-[13px] outline-brand"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClientModal(false)}
                className="rounded-lg border-[1.5px] border-[rgba(27,35,33,0.16)] bg-bg-surface px-4 py-[9px] text-[13px] font-semibold hover:border-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    ownerName.trim() &&
                    ownerPhone.replace(/\D/g, "").length >= 10
                  ) {
                    setMarkedClient(true);
                    setClientModal(false);
                    toast("Marked as Client ✓ — plan + owner + access set");
                  } else {
                    toast("Enter the owner's name + a 10-digit WhatsApp number");
                  }
                }}
                className="rounded-lg bg-brand px-5 py-[9px] text-[13px] font-semibold text-white hover:bg-brand-hover"
              >
                Mark as Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
