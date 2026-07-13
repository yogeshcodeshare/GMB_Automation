import { psiApiKey } from "@/lib/env";

/** MS15-T02 — PageSpeed Insights mobile performance score (FREE Google API,
 * not a paid vendor: no SpendGuard, no ledger). Failures degrade to null —
 * PSI flakiness must never fail an audit. */

const PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 60_000; // PSI runs a real Lighthouse pass — it is slow.

export interface PsiOpts {
  apiKey?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function psiScore(
  url: string,
  strategy: "mobile" | "desktop",
  opts: PsiOpts = {}
): Promise<number | null> {
  const key = opts.apiKey === undefined ? psiApiKey() : opts.apiKey;
  if (!key) return null; // no key configured — skip silently, field is nullable
  const doFetch = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
    key,
  });
  try {
    const res = await doFetch(`${PSI_URL}?${params}`, {
      signal: AbortSignal.timeout(opts.timeoutMs ?? PSI_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      lighthouseResult?: { categories?: { performance?: { score?: number } } };
    };
    const score = json.lighthouseResult?.categories?.performance?.score;
    if (typeof score !== "number") return null;
    return Math.round(score * 100);
  } catch {
    return null;
  }
}

/** P3b mobile gauge (also the score.service input). */
export function psiMobileScore(url: string, opts: PsiOpts = {}): Promise<number | null> {
  return psiScore(url, "mobile", opts);
}

/** P3b desktop gauge (WebsiteAuditSummary.psi_desktop, optional). */
export function psiDesktopScore(url: string, opts: PsiOpts = {}): Promise<number | null> {
  return psiScore(url, "desktop", opts);
}
