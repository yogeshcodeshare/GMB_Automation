import type { Language } from "./api";

/** TB-007 ai_outputs + P8 AI Tools (7 mini-tools, EP-005). */

export type AiToolType =
  | "post"
  | "reply"
  | "description"
  | "qa"
  | "fb_post"
  | "festival"
  | "category"
  | "fixes"; // top-fixes AI redraft (M3); persists like other tools (approved=false)

export type Tone = "warm" | "professional" | "festive";

export interface AiOutput {
  id: string;
  business_id: string | null;
  type: AiToolType;
  lang: Language;
  output: string;
  approved: boolean; // approve-before-publish — nothing goes live without a founder tap
  created_at: string;
}

/** Per-tool inputs (MS3-T04 / §2.7b P8). Discriminated on `tool`. */
export type AiGenerateRequest =
  | {
      tool: "post";
      business_id: string;
      lang: Language;
      tone: Tone;
      topic: string;
      cta: "call_now" | "book" | "learn_more" | "offer";
      media_inbox_id?: string; // photo from Media Inbox
    }
  | {
      tool: "reply";
      business_id: string;
      lang: Language;
      tone: Tone;
      review_id: string; // picked from pending reviews
      length: "short" | "standard";
    }
  | {
      tool: "description";
      business_id: string;
      lang: Language;
      tone: Tone;
      current_description: string | null;
      include_keywords: string[]; // toggleable chips
    }
  | {
      tool: "qa";
      business_id: string;
      lang: Language;
      tone: Tone;
      question?: string; // omit + suggest_five → 5 common Q&A pairs
      suggest_five?: boolean;
    }
  | {
      tool: "fb_post";
      business_id: string;
      lang: Language;
      tone: Tone;
      topic: string;
      emoji_level: "none" | "some" | "festive";
      include_gbp_link: boolean;
      /** Optional targeting (was folded into `topic`); default "customers". */
      audience?: "customers" | "local_community";
    }
  | {
      tool: "festival";
      business_id: string;
      lang: Language;
      festival: string; // e.g. "Ganesh Chaturthi"
      template: 1 | 2 | 3;
      offer_line?: string;
    }
  | {
      tool: "category";
      business_id?: string;
      keyword?: string; // related categories for a keyword
      website_url?: string; // categories-from-website
      chat_prompt?: string; // categories-from-chat
    };

export interface AiGenerateResponse {
  output_id: string;
  output: string; // for qa: JSON-encoded pairs; for festival: HTML template ref
  model_used: string; // e.g. "groq/llama-3.3-70b-versatile"
  char_count: number;
  usage_today: { used: number; limit: number };
}

/** EP-015 — Category Finder tab data. */
export interface RelatedCategory {
  category: string;
  monthly_volume: number | null; // search-volume badge (keywords_data)
  used_by_top_performers: number;
}
export interface CategoryIntel {
  current: string[];
  related: RelatedCategory[];
  related_services: string[];
  trends_compare_url: string;
}
