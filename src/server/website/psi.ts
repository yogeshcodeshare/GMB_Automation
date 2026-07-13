import { psiApiKey } from "@/lib/env";

/** MS15-T02 — PageSpeed Insights mobile performance score (FREE Google API,
 * not a paid vendor: no SpendGuard, no ledger). Failures degrade to null —
 * PSI flakiness must never fail an audit. */

const PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 60_000; // PSI runs a real Lighthouse pass — it is slow.

export async function psiMobileScore(
  url: string,
  opts: {
    apiKey?: string | null;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {}
): Promise<number | null> {
  const key = opts.apiKey === undefined ? psiApiKey() : opts.apiKey;
  if (!key) return null; // no key configured — skip silently, field is nullable
  const doFetch = opts.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
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
