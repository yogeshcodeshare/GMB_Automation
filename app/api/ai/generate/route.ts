import type { AiGenerateRequest, AiToolType, Language, Tone } from "@/types";
import { createServiceClient } from "@/lib/supabase/server";
import { AiRejectedError, AiUnavailableError, generate } from "@/server/ai";
import { err, errFrom, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOOLS: AiToolType[] = ["post", "reply", "description", "qa", "fb_post", "festival", "category"];
const LANGS: Language[] = ["mr", "en", "hinglish"];
const TONES: Tone[] = ["warm", "professional"];

/** Per-tool request validation — mirrors the AiGenerateRequest union. */
function parse(raw: unknown): AiGenerateRequest | string {
  if (typeof raw !== "object" || raw === null) return "JSON body required";
  const b = raw as Record<string, unknown>;
  if (!TOOLS.includes(b.tool as AiToolType)) {
    return `tool must be one of: ${TOOLS.join(", ")}`;
  }
  const tool = b.tool as AiToolType;

  const needBusiness = tool !== "category";
  if (needBusiness && (typeof b.business_id !== "string" || !UUID_RE.test(b.business_id))) {
    return "business_id (UUID) is required";
  }
  const needLangTone = tool !== "festival" && tool !== "category";
  if (needLangTone) {
    if (!LANGS.includes(b.lang as Language)) return `lang must be: ${LANGS.join(", ")}`;
    if (!TONES.includes(b.tone as Tone)) return `tone must be: ${TONES.join(", ")}`;
  }

  const str = (k: string, max = 500) =>
    typeof b[k] === "string" && (b[k] as string).trim() !== "" && (b[k] as string).length <= max;

  switch (tool) {
    case "post":
      if (!str("topic")) return "topic is required";
      if (!["call_now", "book", "learn_more", "offer"].includes(b.cta as string)) {
        return "cta must be call_now | book | learn_more | offer";
      }
      break;
    case "reply":
      if (!str("review_id", 200)) return "review_id is required";
      if (!["short", "standard"].includes(b.length as string)) {
        return "length must be short | standard";
      }
      break;
    case "description":
      if (b.current_description !== null && typeof b.current_description !== "string") {
        return "current_description must be a string or null";
      }
      if (!Array.isArray(b.include_keywords) || b.include_keywords.some((k) => typeof k !== "string")) {
        return "include_keywords must be a string array";
      }
      if ((b.include_keywords as string[]).length > 10) return "max 10 keywords";
      break;
    case "qa":
      if (b.question !== undefined && !str("question")) return "question must be a non-empty string";
      if (!b.question && b.suggest_five !== true) return "provide question or suggest_five: true";
      break;
    case "fb_post":
      if (!str("topic")) return "topic is required";
      if (!["none", "some", "festive"].includes(b.emoji_level as string)) {
        return "emoji_level must be none | some | festive";
      }
      if (typeof b.include_gbp_link !== "boolean") return "include_gbp_link must be boolean";
      break;
    case "festival":
      if (!LANGS.includes(b.lang as Language)) return `lang must be: ${LANGS.join(", ")}`;
      if (!str("festival", 60)) return "festival is required";
      if (![1, 2, 3].includes(b.template as number)) return "template must be 1 | 2 | 3";
      if (b.offer_line !== undefined && !str("offer_line", 120)) return "offer_line too long";
      break;
    case "category":
      if (!b.keyword && !b.website_url && !b.chat_prompt && !b.business_id) {
        return "category tool needs keyword, website_url, chat_prompt or business_id";
      }
      break;
  }
  return raw as AiGenerateRequest;
}

/** EP-005 — POST /api/ai/generate → AiGenerateResponse (draft-only,
 * approved=false; founder approval is a separate explicit action). */
export async function POST(req: Request) {
  const parsed = parse(await readJson(req));
  if (typeof parsed === "string") return err("VALIDATION_ERROR", parsed);

  try {
    const response = await generate({ db: createServiceClient() }, parsed);
    return ok(response);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("NOT_FOUND:")) {
      return err("NOT_FOUND", e.message.slice("NOT_FOUND:".length));
    }
    if (e instanceof AiRejectedError || e instanceof AiUnavailableError) {
      return err(e.code, e.message);
    }
    return errFrom(e);
  }
}
