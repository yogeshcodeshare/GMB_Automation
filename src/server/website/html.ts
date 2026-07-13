import type { HeadingNode } from "@/types";

/** Dependency-free HTML extraction for the M1.5 crawler — boring regex
 * parsing, defensive against broken markup (small-business site builders). */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Visible text: drop script/style/noscript/head content first. */
export function visibleText(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return stripTags(cleaned);
}

export function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? stripTags(m[1]) || null : null;
}

export function extractMetaDescription(html: string): string | null {
  const re = /<meta\s+[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    if (/name\s*=\s*["']description["']/i.test(tag)) {
      const c = /content\s*=\s*["']([\s\S]*?)["']/i.exec(tag);
      return c ? decodeEntities(c[1]).trim() || null : null;
    }
  }
  return null;
}

export function extractHeadings(
  html: string
): Array<{ level: HeadingNode["level"]; text: string }> {
  const out: Array<{ level: HeadingNode["level"]; text: string }> = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = stripTags(m[2]);
    if (text) out.push({ level: Number(m[1]) as HeadingNode["level"], text });
  }
  return out;
}

export function extractLinks(html: string): Array<{ href: string; text: string }> {
  const out: Array<{ href: string; text: string }> = [];
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push({ href: decodeEntities(m[1]), text: stripTags(m[2]) });
  }
  return out;
}

export function hasStructuredData(html: string): boolean {
  return (
    /<script[^>]+type\s*=\s*["']application\/ld\+json["']/i.test(html) ||
    /itemscope/i.test(html) ||
    /itemtype\s*=\s*["']https?:\/\/schema\.org/i.test(html)
  );
}

export function telLinks(html: string): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*["']tel:([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** Indian phone candidates in visible text (+91 xxxxx xxxxx, 0xxxx-xxxxxx, bare 10-digit). */
export function phoneCandidates(text: string): string[] {
  const re = /(?:\+91[\s-]?)?(?:0)?[6-9]\d{4}[\s-]?\d{5}/g;
  return (text.match(re) ?? []).map((s) => s.trim());
}

/** Last 10 digits — the comparable core of an Indian phone number. */
export function phoneDigits(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function normalizeForMatch(s: string): string {
  // Letters (Latin + Devanagari) and digits survive; everything else separates.
  return decodeEntities(s)
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
