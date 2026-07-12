import { createSessionClient } from "@/lib/supabase/server";
import { makeSpendGuard } from "@/server/spend";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

/**
 * M0 "hello dashboard" — proves login + spend ledger wiring end-to-end.
 * The frontend agent replaces this with the full P1 Dashboard (see
 * docs/agents/FRONTEND_BRIEF.md); this page intentionally stays minimal.
 */
export default async function DashboardPage() {
  const supabase = createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let spend: { spent_usd: number; cap_usd: number; blocked: boolean } | null =
    null;
  let spendError: string | null = null;
  try {
    spend = await makeSpendGuard().getStatus();
  } catch (err) {
    spendError =
      err instanceof Error ? err.message : "Spend ledger unavailable.";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-content flex-col gap-4 px-6 py-10">
      <div className="rounded-card border border-line bg-bg-surface p-6">
        <h1 className="text-[21px] font-bold text-ink">
          नमस्कार 🙏 — GMB सारथी is alive
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Signed in as <span className="font-mono">{user?.email}</span> · M0
          foundations
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>

      <div className="rounded-card border border-line bg-bg-surface p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-soft">
          Spend today (EP-012)
        </h2>
        {spend ? (
          <p className="mt-2 font-mono text-[23px] font-semibold text-ink">
            ${spend.spent_usd.toFixed(4)}{" "}
            <span className="text-ink-faint">/ ${spend.cap_usd.toFixed(2)}</span>{" "}
            {spend.blocked ? (
              <span className="ml-2 rounded-chip bg-band-crit-bg px-3 py-1 text-[12.5px] font-bold text-band-crit">
                CAP REACHED — calls paused
              </span>
            ) : (
              <span className="ml-2 rounded-chip bg-band-good-bg px-3 py-1 text-[12.5px] font-bold text-band-good">
                OK
              </span>
            )}
          </p>
        ) : (
          <p className="mt-2 rounded-md bg-band-warn-bg px-3 py-2 text-[12.5px] text-band-warn">
            Spend ledger not reachable yet — apply{" "}
            <span className="font-mono">supabase/migrations/*.sql</span> in the
            Supabase SQL editor, then reload. ({spendError})
          </p>
        )}
      </div>
    </main>
  );
}
