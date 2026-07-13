import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiGenerateRequest, AiGenerateResponse, Business } from "@/types";
import { aiDailyLimit } from "@/lib/env";
import { startOfTodayIst } from "@/server/spend";
import {
  completeWithChain,
  type ChainOpts,
  type ChainResult,
  type ChatMessage,
} from "./chain";
import {
  logRejection,
  validateOutput,
  type ValidationContext,
} from "./sanitize";
import {
  categoryPrompt,
  descriptionPrompt,
  fbPostPrompt,
  festivalPrompt,
  fixesPrompt,
  postPrompt,
  qaPrompt,
  replyPrompt,
  type BusinessFacts,
  type PromptBundle,
} from "./prompts";

/** EP-005 — ai.service. Every draft persists with approved=false; nothing
 * publishes without the founder's tap (hard constraint #4). */

export class AiRejectedError extends Error {
  readonly code = "UPSTREAM_ERROR" as const;
  constructor(readonly reasons: string[]) {
    super(
      `AI draft failed validation twice (${reasons.join("; ")}) — nothing was saved. Try rephrasing the input.`
    );
    this.name = "AiRejectedError";
  }
}

export interface AiServiceDeps {
  db: SupabaseClient;
  /** Injectable for tests; defaults to the real provider chain. */
  complete?: (messages: ChatMessage[], opts: ChainOpts) => Promise<ChainResult>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const DEFAULT_CHAIN = [
  "groq/llama-3.3-70b-versatile",
  "openrouter/meta-llama/llama-3.3-70b-instruct:free",
  "openrouter/google/gemma-3-27b-it:free",
];

async function modelChain(db: SupabaseClient): Promise<string[]> {
  const { data } = await db
    .from("settings")
    .select("model_chain")
    .eq("id", 1)
    .maybeSingle();
  const chain = data?.model_chain;
  return Array.isArray(chain) && chain.length > 0
    ? (chain as string[])
    : DEFAULT_CHAIN;
}

function factsOf(business: Business | null): BusinessFacts {
  return {
    name: business?.name ?? "the business",
    city: business?.city ?? null,
    category: null, // categories live in audit snapshots; name/city carry enough
    phone: null,
    website: business?.website ?? null,
  };
}

async function buildPrompt(
  db: SupabaseClient,
  req: AiGenerateRequest,
  facts: BusinessFacts
): Promise<PromptBundle> {
  switch (req.tool) {
    case "post":
      return postPrompt(facts, req.lang, req.tone, req.topic, req.cta);
    case "reply": {
      const { data, error } = await db
        .from("reviews_cache")
        .select()
        .eq("business_id", req.business_id)
        .eq("review_id", req.review_id)
        .maybeSingle();
      if (error) throw new Error(`review read failed: ${error.message}`);
      if (!data) throw new Error("NOT_FOUND:review_id not in reviews_cache");
      return replyPrompt(
        facts,
        req.lang,
        req.tone,
        { author: data.author, rating: data.rating, text: data.text },
        req.length
      );
    }
    case "description":
      return descriptionPrompt(
        facts,
        req.lang,
        req.tone,
        req.current_description,
        req.include_keywords
      );
    case "qa":
      return qaPrompt(facts, req.lang, req.tone, req.question, req.suggest_five);
    case "fb_post":
      return fbPostPrompt(
        facts,
        req.lang,
        req.tone,
        req.topic,
        req.emoji_level,
        req.include_gbp_link
      );
    case "festival":
      return festivalPrompt(facts, req.lang, req.festival, req.offer_line);
    case "category":
      return categoryPrompt(facts, {
        keyword: req.keyword,
        chat_prompt: req.chat_prompt,
        // website_text is fetched by the caller when website_url is given
        // (crawl goes through the SEC-001 guard, never raw here).
      });
  }
}

async function usageToday(
  db: SupabaseClient,
  now: Date
): Promise<{ used: number; limit: number }> {
  const since = startOfTodayIst(now).toISOString();
  const { count, error } = await db
    .from("ai_outputs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (error) throw new Error(`ai usage count failed: ${error.message}`);
  return { used: count ?? 0, limit: aiDailyLimit() };
}

export async function generate(
  deps: AiServiceDeps,
  req: AiGenerateRequest
): Promise<AiGenerateResponse> {
  const db = deps.db;
  const now = deps.now ? deps.now() : new Date();
  const complete = deps.complete ?? completeWithChain;

  // business is optional only for the category tool
  let business: Business | null = null;
  if (req.business_id) {
    const { data, error } = await db
      .from("businesses")
      .select()
      .eq("id", req.business_id)
      .maybeSingle();
    if (error) throw new Error(`business read failed: ${error.message}`);
    if (!data) throw new Error("NOT_FOUND:business_id");
    business = data as Business;
  }
  const facts = factsOf(business);
  // Only record-listed contact data may surface in drafts (SEC-002).
  facts.phone = null; // TB-001 has no phone column; audits carry it — keep closed
  const prompt = await buildPrompt(db, req, facts);

  const lang: ValidationContext["lang"] =
    "lang" in req && req.lang ? req.lang : "en";
  const vctx: ValidationContext = {
    lang,
    allowed_urls: facts.website ? [facts.website] : [],
    allowed_phones: facts.phone ? [facts.phone] : [],
    max_chars: prompt.target_chars * 2,
  };

  const chain = await modelChain(db);
  const chainOpts: ChainOpts = { modelChain: chain, fetchImpl: deps.fetchImpl };

  let result = await complete(
    [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    chainOpts
  );
  let verdict = validateOutput(result.text, vctx);

  if (!verdict.ok) {
    logRejection(req.tool, verdict.reasons);
    // one corrective regeneration (SEC-002: reject → regenerate once → error)
    result = await complete(
      [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
        { role: "assistant", content: result.text },
        {
          role: "user",
          content: `That draft was rejected (${verdict.reasons.join("; ")}). Rewrite it following ALL rules — correct language, no URLs/phones outside the business record, plain text, within length.`,
        },
      ],
      chainOpts
    );
    verdict = validateOutput(result.text, vctx);
    if (!verdict.ok) {
      logRejection(req.tool, verdict.reasons);
      throw new AiRejectedError(verdict.reasons);
    }
  }

  // Persist DRAFT-ONLY (approved=false). The DB default is false too —
  // being explicit here is the point.
  const { data: row, error: insErr } = await db
    .from("ai_outputs")
    .insert({
      business_id: req.business_id ?? null,
      type: req.tool,
      lang,
      output: result.text,
      approved: false,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(`ai_outputs insert failed: ${insErr.message}`);

  const usage = await usageToday(db, now);
  return {
    output_id: row.id as string,
    output: result.text,
    model_used: result.model_used,
    char_count: result.text.length,
    usage_today: usage,
  };
}

/** Top-5 fixes redraft for the audit report (not a P8 tool; the "fixes"
 * type is NOT in the ai_outputs enum — contract-proposal raised. Returns
 * the draft WITHOUT persisting; the caller folds it into the snapshot). */
export async function redraftFixes(
  deps: AiServiceDeps,
  business: Business,
  lang: "mr" | "en",
  deterministicFixes: string[]
): Promise<string[] | null> {
  const complete = deps.complete ?? completeWithChain;
  const prompt = fixesPrompt(factsOf(business), lang, deterministicFixes);
  try {
    const chain = await modelChain(deps.db);
    const result = await complete(
      [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      { modelChain: chain, fetchImpl: deps.fetchImpl }
    );
    const verdict = validateOutput(result.text, {
      lang,
      allowed_urls: business.website ? [business.website] : [],
      allowed_phones: [],
      max_chars: prompt.target_chars * 2,
    });
    if (!verdict.ok) {
      logRejection("fixes", verdict.reasons);
      return null; // deterministic fixes remain — never block the report
    }
    const lines = result.text
      .split(/\r?\n/)
      .map((l) => l.replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean);
    return lines.length === deterministicFixes.length ? lines : null;
  } catch {
    return null;
  }
}
