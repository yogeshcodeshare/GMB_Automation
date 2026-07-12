/**
 * Central env access + feature flags.
 * Constraint 6: wa.service (WhatsApp) and GBP publishing are behind flags —
 * the app must compile and unit-test WITHOUT their keys.
 * All reads are lazy so importing this module never throws.
 */

export const features = {
  /** WhatsApp sending (M4/M6) — off until Veblika account keys arrive. */
  whatsapp(): boolean {
    return Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    );
  },
  /** GBP OAuth publish actions (M6) — needs Google OAuth client + explicit opt-in. */
  gbpPublish(): boolean {
    return (
      Boolean(
        process.env.GOOGLE_OAUTH_CLIENT_ID &&
          process.env.GOOGLE_OAUTH_CLIENT_SECRET
      ) && process.env.FEATURE_GBP_PUBLISH === "on"
    );
  },
  /** Playwright PDF rendering (ADR-004: flagged on Vercel, on for VPS). */
  pdf(): boolean {
    return process.env.FEATURE_PDF === "on";
  },
};

/** Daily DataForSEO cap in USD from env (settings table wins when present). */
export function envDailySpendCapUsd(): number | null {
  const raw = process.env.DAILY_SPEND_CAP_USD;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function dataForSeoCredentials(): { login: string; password: string } | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  return login && password ? { login, password } : null;
}
