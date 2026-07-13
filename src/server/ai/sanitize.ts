import { phoneCandidates, phoneDigits } from "@/server/website/html";

/**
 * SEC-002 — prompt-injection defenses (P0, OWASP LLM01:2025).
 * Everything fetched from outside (review text, website content, competitor
 * names) is DATA. It goes into prompts only between explicit markers, and
 * every draft passes the output validator before it may persist.
 */

/** Untrusted-data delimiters. The system prompt defines their meaning; the
 * wrapper strips look-alikes from the data so it cannot fake a close-marker. */
export const DATA_OPEN = "⟦DATA⟧";
export const DATA_CLOSE = "⟦/DATA⟧";

/** Canary embedded in every system prompt — its presence in a draft means
 * system-prompt leakage and fails validation. */
export const SYSTEM_CANARY = "[GMB-SARATHI-SYS-7f3a]";

export function wrapUntrusted(label: string, text: string): string {
  const cleaned = text
    .replace(/[⟦⟧]/g, " ") // marker look-alikes
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4_000); // no unbounded pastes into the context
  return `${label}:\n${DATA_OPEN}\n${cleaned}\n${DATA_CLOSE}`;
}

export interface ValidationContext {
  lang: "mr" | "en" | "hinglish";
  /** URLs that may legitimately appear (business website etc.). */
  allowed_urls: string[];
  /** Phone numbers that may legitimately appear (business phone). */
  allowed_phones: string[];
  /** Hard output budget — 2× the tool's target length. */
  max_chars: number;
}

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

const URL_RE = /(?:https?:\/\/|www\.)[^\s)"'<>]+/gi;
const HTML_TAG_RE = /<\s*(script|iframe|img|svg|object|embed|style|a|div|span|on\w+)/i;
const DEVANAGARI_RE = /[ऀ-ॿ]/g;

function hostOf(raw: string): string | null {
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return null;
  }
}

function devanagariRatio(text: string): number {
  // Strip whitespace, ASCII digits and common punctuation (ES5-safe — no \p classes).
  const letters = text.replace(/[\s0-9.,!?;:'"()[\]{}\/\\|@#%^&*+=~`<>_—–…-]+/g, "");
  if (letters.length === 0) return 0;
  const dev = (text.match(DEVANAGARI_RE) ?? []).length;
  return dev / letters.length;
}

/** SEC-002 output validator — reject anything the founder wouldn't have
 * written: foreign URLs/phones, runaway length, wrong language, HTML,
 * delimiter/system-prompt leakage. */
export function validateOutput(
  output: string,
  ctx: ValidationContext
): ValidationResult {
  const reasons: string[] = [];

  // 1. Leakage: markers or the system canary must never surface.
  if (
    output.includes(DATA_OPEN) ||
    output.includes(DATA_CLOSE) ||
    output.includes(SYSTEM_CANARY)
  ) {
    reasons.push("system/delimiter leakage");
  }

  // 2. HTML/script content — drafts are plain text.
  if (HTML_TAG_RE.test(output)) {
    reasons.push("HTML markup in draft");
  }

  // 3. URLs must be from the business record.
  const allowedHosts = new Set(
    ctx.allowed_urls.map(hostOf).filter((h): h is string => h !== null)
  );
  for (const raw of output.match(URL_RE) ?? []) {
    const host = hostOf(raw);
    if (!host || !allowedHosts.has(host)) {
      reasons.push(`URL not in business record: ${host ?? raw.slice(0, 40)}`);
    }
  }

  // 4. Phone numbers must be the business's own.
  const allowedPhones = new Set(
    ctx.allowed_phones
      .map(phoneDigits)
      .filter((p): p is string => p !== null)
  );
  for (const candidate of phoneCandidates(output)) {
    const digits = phoneDigits(candidate);
    if (digits && !allowedPhones.has(digits)) {
      reasons.push(`phone not in business record: …${digits.slice(-4)}`);
    }
  }

  // 5. Length budget (2× the tool target).
  if (output.length > ctx.max_chars) {
    reasons.push(`too long: ${output.length} > ${ctx.max_chars}`);
  }

  // 6. Language sanity. Marathi drafts must actually be Devanagari; English
  // drafts may carry Devanagari names but not be mostly Marathi.
  const ratio = devanagariRatio(output);
  if (ctx.lang === "mr" && ratio < 0.3) {
    reasons.push(`expected Marathi, Devanagari ratio ${ratio.toFixed(2)}`);
  }
  if (ctx.lang === "en" && ratio > 0.4) {
    reasons.push(`expected English, Devanagari ratio ${ratio.toFixed(2)}`);
  }

  return { ok: reasons.length === 0, reasons };
}

/** Rejected-output log (SEC-002): server log with a stable prefix — never
 * persisted to ai_outputs, so a bad draft can never be approved. */
export function logRejection(tool: string, reasons: string[]): void {
  console.warn(`[ai-reject] tool=${tool} reasons=${reasons.join("; ")}`);
}
