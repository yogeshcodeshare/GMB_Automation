"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

/**
 * P0 Login (M0 minimal version of the design-handoff screen).
 * Single founder account — Supabase email/password auth.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-bg-nav text-xl font-bold text-brand-accent">
            सा
          </div>
          <h1 className="text-[22px] font-bold text-ink">GMB सारथी</h1>
          <p className="text-sm text-ink-soft">Agency ops · founder login</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-card border border-line bg-bg-surface p-5 shadow-sm"
        >
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border-[1.5px] border-ink/20 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border-[1.5px] border-ink/20 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          {error ? (
            <p className="mb-3 rounded-md bg-band-crit-bg px-3 py-2 text-[12.5px] text-band-crit">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:bg-[#E5E1D8] disabled:text-ink-faint"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[12px] text-ink-faint">
          Single founder account · sessions expire after 30 days
        </p>
      </div>
    </main>
  );
}
