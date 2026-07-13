import { groqApiKey, openRouterApiKey } from "@/lib/env";

/**
 * MS3-T01 — free-model provider chain (ADR-002/004): Groq first
 * (OpenAI-compatible), OpenRouter free models as fallback. The model list
 * comes from settings.model_chain (TB-011) — config, never hardcoded.
 * Entries look like "groq/llama-3.3-70b-versatile" or
 * "openrouter/meta-llama/llama-3.3-70b-instruct:free".
 * A provider whose key is absent is SKIPPED (graceful degrade); every
 * response reports which provider/model actually served.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChainResult {
  text: string;
  model_used: string; // e.g. "groq/llama-3.3-70b-versatile"
}

export class AiUnavailableError extends Error {
  readonly code = "UPSTREAM_ERROR" as const;
  constructor(detail: string) {
    super(`No AI provider could serve the request: ${detail}`);
    this.name = "AiUnavailableError";
  }
}

interface ProviderConfig {
  name: "groq" | "openrouter";
  baseUrl: string;
  key: string | null;
}

function providerFor(entry: string): { provider: ProviderConfig; model: string } | null {
  const slash = entry.indexOf("/");
  if (slash === -1) return null;
  const prefix = entry.slice(0, slash);
  const model = entry.slice(slash + 1);
  if (prefix === "groq") {
    return {
      provider: {
        name: "groq",
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
        key: groqApiKey(),
      },
      model,
    };
  }
  if (prefix === "openrouter") {
    return {
      provider: {
        name: "openrouter",
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        key: openRouterApiKey(),
      },
      model,
    };
  }
  return null;
}

export interface ChainOpts {
  /** settings.model_chain entries, in priority order. */
  modelChain: string[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number; // per attempt
  maxTokens?: number;
  temperature?: number;
}

const RETRYABLE = (status: number) => status === 429 || status >= 500;

async function completeOnce(
  provider: ProviderConfig,
  model: string,
  messages: ChatMessage[],
  opts: Required<Pick<ChainOpts, "timeoutMs" | "maxTokens" | "temperature">> & {
    fetchImpl: typeof fetch;
  }
): Promise<{ ok: true; text: string } | { ok: false; retryable: boolean; detail: string }> {
  try {
    const res = await opts.fetchImpl(provider.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    if (!res.ok) {
      return {
        ok: false,
        retryable: RETRYABLE(res.status),
        detail: `${provider.name} HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content;
    if (!text || text.trim() === "") {
      return { ok: false, retryable: false, detail: `${provider.name} empty completion` };
    }
    return { ok: true, text: text.trim() };
  } catch (e) {
    return {
      ok: false,
      retryable: true, // network / timeout
      detail: `${provider.name} ${(e as Error).name === "TimeoutError" ? "timeout" : "network error"}`,
    };
  }
}

/** Walk the chain: per entry skip-if-unkeyed, try, retry ×1 on 429/5xx/network. */
export async function completeWithChain(
  messages: ChatMessage[],
  opts: ChainOpts
): Promise<ChainResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 25_000;
  const maxTokens = opts.maxTokens ?? 700;
  const temperature = opts.temperature ?? 0.6;
  const failures: string[] = [];
  let sawKeyed = false;

  for (const entry of opts.modelChain) {
    const parsed = providerFor(entry);
    if (!parsed) {
      failures.push(`${entry}: unknown provider prefix`);
      continue;
    }
    if (!parsed.provider.key) {
      failures.push(`${entry}: no API key configured — skipped`);
      continue;
    }
    sawKeyed = true;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await completeOnce(parsed.provider, parsed.model, messages, {
        fetchImpl,
        timeoutMs,
        maxTokens,
        temperature,
      });
      if (result.ok) return { text: result.text, model_used: entry };
      failures.push(`${entry} (attempt ${attempt}): ${result.detail}`);
      if (!result.retryable) break;
    }
  }

  throw new AiUnavailableError(
    sawKeyed ? failures.join(" · ") : "no provider has an API key (set GROQ_API_KEY)"
  );
}
