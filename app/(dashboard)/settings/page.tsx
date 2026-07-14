"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/components/shell/app-state";
import { useApiGet } from "@/components/hooks/use-api-get";
import { apiFetchResult } from "@/components/lib/api";
import {
  settingsMock,
  spendLedgerMock,
  spendSummaryMock,
} from "@/components/mocks/ops";
import {
  INR_PER_USD,
  spendLabel,
  spendPct,
  usdToInr,
} from "@/components/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const CAPTION =
  "text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-soft mb-[6px]";
const INPUT =
  "w-[110px] rounded-[9px] border-[1.5px] border-[rgba(27,35,33,0.18)] bg-bg-surface px-3 py-[10px] font-mono text-[14px] outline-brand";

/** P11 Settings & Spend — data sources, spend, guards, models, ledger. */
export default function SettingsPage() {
  const toast = useToast();
  const {
    spend,
    capHit,
    capPreview,
    setCapPreview,
    liveDataEnabled,
    setLiveDataEnabled,
  } = useAppState();
  const pct = spendPct(spend);

  // GET /api/settings once flipped live; mock until then.
  const settingsQ = useApiGet("/api/settings", settingsMock, { delayMs: 0 });
  const settings = settingsQ.data ?? settingsMock;

  // Guards editing (widened PATCH — approved by MAIN 16 Jul).
  const [capUsd, setCapUsd] = useState(String(settings.daily_spend_cap_usd));
  const [publicLimit, setPublicLimit] = useState(
    String(settings.public_daily_limit),
  );
  const [perIp, setPerIp] = useState(String(settings.per_ip_limit));
  const [guardError, setGuardError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveGuards = async () => {
    setGuardError(null);
    // Client-side mirror of validateSettingsPatch (0..9999.99, integer limits).
    const cap = Number(capUsd);
    const pub = Number(publicLimit);
    const ip = Number(perIp);
    if (!Number.isFinite(cap) || cap <= 0 || cap > 9999.99) {
      setGuardError("Daily cap must be between 0 and 9999.99 USD.");
      return;
    }
    if (!Number.isInteger(pub) || pub < 0 || !Number.isInteger(ip) || ip < 0) {
      setGuardError("Limits must be whole numbers ≥ 0.");
      return;
    }
    setSaving(true);
    const r = await apiFetchResult("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        daily_spend_cap_usd: cap,
        public_daily_limit: pub,
        per_ip_limit: ip,
      }),
    });
    setSaving(false);
    if (!r.ok && r.code === "VALIDATION_ERROR") {
      // Surface the server's validation message inline (widened PATCH).
      setGuardError(r.message);
      return;
    }
    // Live success — or demo-mode local save while the registry is OFF.
    toast(`Guards saved — cap $${cap.toFixed(2)} ≈ ₹${Math.round(cap * INR_PER_USD)}`);
  };

  const ledgerWithTotals = spendLedgerMock.reduce<
    Array<{ entry: (typeof spendLedgerMock)[number]; running: number }>
  >((acc, entry) => {
    const prev = acc.length ? acc[acc.length - 1].running : 0;
    acc.push({ entry, running: prev + entry.cost_usd });
    return acc;
  }, []);

  return (
    <section className="flex flex-col gap-4">
      {/* CR-1 — DataForSEO live-data master switch (persists post-B2+flip) */}
      <Card className="px-5 py-4">
        <div className="mb-1 text-[14.5px] font-bold">Data sources</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[520px]">
            <div className="text-[13px] font-semibold">
              DataForSEO live data
            </div>
            <div className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Paid live calls (₹1–5 per action). Enable only after
              funding/verifying DataForSEO. Audits, grids and refreshes run on
              demo data while off.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={liveDataEnabled}
            aria-label="DataForSEO live data"
            onClick={() => setLiveDataEnabled(!liveDataEnabled)}
            className={cn(
              "relative h-[26px] w-[46px] flex-none rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface",
              liveDataEnabled ? "bg-brand" : "bg-[#C9D2DB]",
            )}
          >
            {/* UAT-7: left-0 anchors the knob — without it the span's static
                (centered) position + translate pushed it past the track. */}
            <span
              className={cn(
                "absolute left-0 top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,20,18,0.35)] transition-transform",
                liveDataEnabled ? "translate-x-[23px]" : "translate-x-[3px]",
              )}
            />
          </button>
        </div>
        <div className="mt-3 text-[11.5px] font-medium text-[#4A5A6A]">
          {liveDataEnabled
            ? "Live data ON — paid actions will call DataForSEO and charge the ledger."
            : "Demo data — paid actions are blocked; screens show the seeded Manovedh demo."}
        </div>
      </Card>

      {/* Spend cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <Card className="px-4 py-[14px]">
          <div className={CAPTION}>Spend today</div>
          <div className="my-1 font-mono text-[20px] font-semibold">
            {spendLabel(spend)}
          </div>
          <div className="mb-[6px] h-[5px] overflow-hidden rounded-[3px] bg-[#EDEAE3]">
            <div
              className={cn(
                "h-full rounded-[3px]",
                capHit
                  ? "bg-[#E06B5D]"
                  : pct > 75
                    ? "bg-band-warn-strong"
                    : "bg-brand-accent",
              )}
              style={{ width: `${pct.toFixed(1)}%` }}
            />
          </div>
          <div
            className={cn(
              "mb-3 text-[12px] font-medium",
              capHit ? "text-band-crit" : "text-ink-soft",
            )}
          >
            {capHit
              ? "Cap hit — paused until tomorrow"
              : `${pct.toFixed(0)}% of daily cap`}
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setCapPreview(!capPreview)}
          >
            {capPreview ? "Exit cap-hit preview" : "Preview cap-hit state"}
          </Button>
        </Card>
        <Card className="px-4 py-[14px]">
          <div className={CAPTION}>This month</div>
          <div className="my-1 font-mono text-[20px] font-semibold">
            ₹{spendSummaryMock.month_inr}
          </div>
          <div className="text-[12px] text-ink-soft">
            {spendSummaryMock.month_calls} DataForSEO calls
          </div>
        </Card>
        <Card className="px-4 py-[14px]">
          <div className={CAPTION}>Vendor balance</div>
          <div className="my-1 font-mono text-[20px] font-semibold">
            ${spendSummaryMock.vendor_balance_usd.toFixed(2)}
          </div>
          <div className="text-[12px] text-ink-soft">credits never expire</div>
        </Card>
        <Card className="px-4 py-[14px]">
          <div className={CAPTION}>AI requests</div>
          <div className="my-1 font-mono text-[20px] font-semibold">
            {spendSummaryMock.ai_used}/{spendSummaryMock.ai_limit}
          </div>
          <div className="text-[12px] text-ink-soft">
            free tier · resets daily
          </div>
        </Card>
      </div>

      {/* Guards — the money guard */}
      <Card className="px-5 py-4">
        <div className="mb-[2px] text-[14.5px] font-bold">Guards</div>
        <div className="mb-[14px] text-[12px] text-ink-soft">
          The money guard — nothing can drain the balance.
        </div>
        <div className="flex flex-wrap gap-[18px]">
          <div>
            <div className={CAPTION}>Daily spend cap (USD)</div>
            <input
              value={capUsd}
              onChange={(e) => setCapUsd(e.target.value)}
              inputMode="decimal"
              className={INPUT}
            />
            <div className="mt-1 text-[11px] text-ink-faint">
              ≈ ₹{Math.round((Number(capUsd) || 0) * INR_PER_USD)}
            </div>
          </div>
          <div>
            <div className={CAPTION}>Public checker / day</div>
            <input
              value={publicLimit}
              onChange={(e) => setPublicLimit(e.target.value)}
              inputMode="numeric"
              className={INPUT}
            />
            <div className="mt-1 text-[11px] text-ink-faint">global limit</div>
          </div>
          <div>
            <div className={CAPTION}>Per visitor / day</div>
            <input
              value={perIp}
              onChange={(e) => setPerIp(e.target.value)}
              inputMode="numeric"
              className={INPUT}
            />
            <div className="mt-1 text-[11px] text-ink-faint">per IP</div>
          </div>
        </div>
        {guardError && (
          <div className="mt-3 rounded-lg bg-band-crit-bg px-3 py-2 text-[12px] font-medium text-band-crit">
            {guardError}
          </div>
        )}
        <div className="mt-3 rounded-lg bg-band-warn-bg px-3 py-2 text-[12px] leading-normal text-band-warn">
          At cap: all external calls pause automatically — saved reports and
          demo data keep working.
        </div>
        <Button
          className="mt-3"
          size="sm"
          loading={saving}
          onClick={() => void saveGuards()}
        >
          Save guards
        </Button>
      </Card>

      {/* Model chain */}
      <Card className="px-5 py-4">
        <div className="mb-[2px] text-[14.5px] font-bold">AI model chain</div>
        <div className="mb-3 text-[12px] text-ink-soft">
          Free models only — each falls back to the next on failure (M3).
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings.model_chain.map((m, i) => (
            <span key={m} className="flex items-center gap-2">
              <span className="rounded-chip bg-bg-app px-[10px] py-1 font-mono text-[11.5px] font-semibold text-ink">
                {m}
              </span>
              {i < settings.model_chain.length - 1 && (
                <span className="text-[12px] text-ink-faint">→</span>
              )}
            </span>
          ))}
        </div>
      </Card>

      {/* Spend ledger */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-[14px]">
          <div className="text-[14.5px] font-bold">Spend ledger</div>
          <span className="text-[11px] text-ink-faint">
            every DataForSEO call logs here (TB-010) — nothing spends silently
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[0.9fr_2fr_0.8fr_0.9fr] gap-[10px] bg-[#FAF8F4] px-4 py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-soft">
              <div>Date</div>
              <div>Endpoint</div>
              <div>Cost</div>
              <div>Running total</div>
            </div>
            {ledgerWithTotals.map(({ entry, running }) => (
              <div
                key={entry.id}
                className="grid grid-cols-[0.9fr_2fr_0.8fr_0.9fr] items-center gap-[10px] border-t border-[rgba(27,35,33,0.07)] px-4 py-[10px] text-[12.5px]"
              >
                <span className="font-mono text-[12px] text-ink-soft">
                  {new Date(entry.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px]">
                  {entry.endpoint}
                </span>
                <span className="font-mono text-[12px]">
                  ₹{usdToInr(entry.cost_usd).toFixed(2)}
                </span>
                <span className="font-mono text-[12px] font-semibold">
                  ₹{usdToInr(running).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
