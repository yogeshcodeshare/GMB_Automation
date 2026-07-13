import type { KeywordCloudItem } from "@/types";

/**
 * MS1-T11 — bilingual keyword tokenizer for the review cloud.
 * Karad reviews mix three registers: Marathi in Devanagari ("खूप छान"),
 * Marathi/Hinglish in Latin script ("khup chan anubhav"), and English
 * ("best experience"). Latin-script Marathi words are CONTENT words here —
 * only English function words and Google-Translate artifacts are stopped.
 */

const ENGLISH_STOPWORDS = new Set(
  (
    "a an and are as at be been by for from had has have i if in into is it its " +
    "me my of on or our so than that the their them then there these they this to " +
    "too was we were what when which who will with you your yours am im i'm ive " +
    "he she his her had do does did doing don't dont very really just also can " +
    "could should would must after before again more most much any all both each " +
    "few once only own same some such no nor not out over under up down here now"
  ).split(/\s+/)
);

/** Devanagari Marathi function words (kept minimal — nouns/adjectives stay). */
const MARATHI_STOPWORDS = new Set([
  "आहे",
  "आहेत",
  "आणि",
  "मी",
  "आम्ही",
  "तुम्ही",
  "तो",
  "ती",
  "ते",
  "हे",
  "ही",
  "हा",
  "या",
  "तर",
  "पण",
  "व",
  "का",
  "ना",
  "की",
  "च",
  "ला",
  "चे",
  "ची",
  "चा",
  "मध्ये",
  "साठी",
  "वर",
  "आता",
  "एक",
]);

/** Google-Translate UI artifacts that leak into scraped review text. */
const ARTIFACTS = new Set([
  "google",
  "translated",
  "original",
  "see",
  "marathi",
  "hindi",
]);

function isStopword(token: string): boolean {
  return (
    ENGLISH_STOPWORDS.has(token) ||
    MARATHI_STOPWORDS.has(token) ||
    ARTIFACTS.has(token)
  );
}

const URL_RE = /https?:\/\/[^\s]+/g;
/** Keep Latin letters and Devanagari; everything else separates tokens. */
const NON_WORD_RE = /[^a-zऀ-ॿ]+/g;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(URL_RE, " ")
    .replace(NON_WORD_RE, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !isStopword(t));
}

/** Unigram + bigram cloud over review texts (P6 keyword cloud). */
export function buildKeywordCloud(
  texts: Array<string | null | undefined>,
  opts: { top?: number } = {}
): KeywordCloudItem[] {
  const top = opts.top ?? 30;
  const uni = new Map<string, number>();
  const bi = new Map<string, number>();

  for (const text of texts) {
    if (!text) continue;
    const tokens = tokenize(text);
    for (const t of tokens) uni.set(t, (uni.get(t) ?? 0) + 1);
    for (let i = 0; i < tokens.length - 1; i++) {
      const pair = `${tokens[i]} ${tokens[i + 1]}`;
      bi.set(pair, (bi.get(pair) ?? 0) + 1);
    }
  }

  const pick = (
    map: Map<string, number>,
    kind: KeywordCloudItem["kind"],
    min: number
  ): KeywordCloudItem[] => {
    const items: KeywordCloudItem[] = [];
    map.forEach((count, token) => {
      if (count >= min) items.push({ token, count, kind });
    });
    return items.sort((a, b) => b.count - a.count).slice(0, top);
  };

  return [...pick(uni, "unigram", 2), ...pick(bi, "bigram", 2)];
}
