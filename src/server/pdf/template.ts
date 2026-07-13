import { readFileSync } from "node:fs";
import path from "node:path";
import type { AuditReport, RubricRow } from "@/types";

/**
 * MS4-T01 + CR-2/CR-3 — the report template (EP-006). Server-rendered HTML →
 * Playwright PDF. ONE A4 page for typical data; long detail flows to page 2.
 * SEC-003 (P0): EVERY interpolated string passes esc(); CSP meta blocks
 * scripts; fonts embed as data: URIs (no external fetch at render time).
 * CR-3: mr | en | hinglish copy — deterministic strings, no AI.
 */

/** Contract-proposal `PdfLanguage` — local alias until @/types lands it. */
export type PdfLanguage = "mr" | "en" | "hinglish";

export const PDF_LANGUAGES: PdfLanguage[] = ["mr", "en", "hinglish"];

/** HTML-entity escape — the SEC-003 primitive. Everything dynamic goes
 * through here, Devanagari included (entities don't touch non-ASCII). */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    // control chars have no place in a report
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

let fontCache: string | null = null;
function fontDataUri(): string {
  if (fontCache) return fontCache;
  const file = path.join(process.cwd(), "public", "fonts", "NotoSansDevanagari.ttf");
  const b64 = readFileSync(file).toString("base64");
  fontCache = `data:font/ttf;base64,${b64}`;
  return fontCache;
}

const BAND_COLOR: Record<string, string> = {
  red: "#dc2626",
  amber: "#d97706",
  green: "#16a34a",
};

const STATUS_GLYPH: Record<RubricRow["status"], string> = {
  pass: "✔",
  warn: "⚠",
  fail: "✖",
};

const STATUS_COLOR: Record<RubricRow["status"], string> = {
  pass: "#16a34a",
  warn: "#d97706",
  fail: "#dc2626",
};

/** CR-3 copy tables. Hinglish = Marathi phrasing in Latin script, the way
 * Karad owners type — deterministic strings, no AI. */
const L: Record<
  PdfLanguage,
  {
    title: string;
    score: string;
    rubric: string;
    flags: string;
    fixes: string;
    reviews: string;
    posts: string;
    website: string;
    competitors: string;
    generated: string;
    of: string;
    replyRate: string;
    velocity: string;
    cadence: string;
    rented: string;
    napRow: string;
  }
> = {
  mr: {
    title: "GBP ऑडिट रिपोर्ट",
    score: "तुमचा Google स्कोअर",
    rubric: "तपासणी यादी",
    flags: "तातडीचे प्रश्न",
    fixes: "पहिली ५ कामे",
    reviews: "रिव्ह्यू",
    posts: "पोस्ट",
    website: "वेबसाइट",
    competitors: "स्पर्धक",
    generated: "तारीख",
    of: "पैकी",
    replyRate: "उत्तर दर",
    velocity: "६ महिने वेग",
    cadence: "वारंवारता",
    rented: "भाड्याचे डोमेन",
    napRow: "NAP जुळणी",
  },
  en: {
    title: "GBP Audit Report",
    score: "Your Google Score",
    rubric: "Checklist",
    flags: "Urgent issues",
    fixes: "Top 5 fixes",
    reviews: "Reviews",
    posts: "Posts",
    website: "Website",
    competitors: "Competitors",
    generated: "Generated",
    of: "of",
    replyRate: "Reply rate",
    velocity: "6-month pace",
    cadence: "Cadence",
    rented: "Rented domain",
    napRow: "NAP match",
  },
  hinglish: {
    title: "GBP Audit Report",
    score: "Tumcha Google Score",
    rubric: "Tapasni Yaadi",
    flags: "He Turant Sudhara",
    fixes: "Pahili 5 Kaame",
    reviews: "Reviews",
    posts: "Posts",
    website: "Website",
    competitors: "Spardhak",
    generated: "Taarikh",
    of: "paiki",
    replyRate: "Reply Rate",
    velocity: "6 Mahine Speed",
    cadence: "Kiti Divsani Post",
    rented: "Bhadyacha Domain",
    napRow: "NAP Julni",
  },
};

/** Fix lines exist in mr + en; hinglish borrows en for now (flagged as a
 * future improvement — needs curated Latin-Marathi fix copy). */
function fixLangFor(lang: PdfLanguage): "mr" | "en" {
  return lang === "mr" ? "mr" : "en";
}

/** CR-2 — half-ring score gauge: SVG arc filled score/100, stroke in the
 * band colour, score centred under the arc (mirrors the P3 gauge). */
export function gaugeSvg(total: number, band: string): string {
  const color = BAND_COLOR[band] ?? "#6b7280";
  const R = 80;
  const ARC = Math.PI * R; // ≈ 251.33
  const filled = Math.max(0, Math.min(1, total / 100)) * ARC;
  return `
  <svg class="score-gauge" data-band="${esc(band)}" width="190" height="118"
       viewBox="0 0 200 124" role="img" aria-label="${esc(total)} / 100">
    <path d="M 20 100 A ${R} ${R} 0 0 1 180 100" fill="none"
          stroke="#e5e7eb" stroke-width="15" stroke-linecap="round"/>
    <path d="M 20 100 A ${R} ${R} 0 0 1 180 100" fill="none"
          stroke="${color}" stroke-width="15" stroke-linecap="round"
          stroke-dasharray="${filled.toFixed(2)} ${ARC.toFixed(2)}"/>
    <text x="100" y="92" text-anchor="middle" font-size="40" font-weight="800"
          fill="${color}">${esc(total)}</text>
    <text x="100" y="112" text-anchor="middle" font-size="13" fill="#6b7280">/ 100</text>
  </svg>`;
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

export function renderReportHtml(
  report: AuditReport,
  lang: PdfLanguage,
  opts: { brand?: string; generatedAt?: string } = {}
): string {
  const t = L[lang];
  const brand = esc(opts.brand ?? "GMB Sarathi");
  const generated = esc((opts.generatedAt ?? new Date().toISOString()).slice(0, 10));
  const b = report.business;
  const band = report.band;
  const bandColor = BAND_COLOR[band] ?? "#6b7280";

  const rubricRows = report.rubric
    .map(
      (r) => `
      <tr>
        <td style="color:${STATUS_COLOR[r.status]}" class="glyph">${STATUS_GLYPH[r.status]}</td>
        <td class="lbl">${esc(r.label)}</td>
        <td class="pts">${esc(r.points)}/${esc(r.max)}</td>
        <td class="reason">${esc(clip(r.reason, 92))}</td>
      </tr>`
    )
    .join("");

  const flags = report.sanity_flags
    .map((f) => `<li class="${f.severity}">${esc(clip(f.message, 96))}</li>`)
    .join("");

  const fixLang = fixLangFor(lang);
  const fixes =
    report.top_fixes.find((f) => f.lang === fixLang)?.items ??
    report.top_fixes[0]?.items ??
    [];
  const fixItems = fixes.map((f) => `<li>${esc(clip(f, 110))}</li>`).join("");

  const rs = report.review_stats;
  const ps = report.post_stats;
  const w = report.website;

  const stat = (label: string, value: string) =>
    `<div class="stat"><span class="k">${esc(label)}</span><span class="v">${esc(value)}</span></div>`;

  const statBlocks = [
    rs
      ? `<div class="statgroup"><h2>${t.reviews}</h2>
          ${stat("★", `${rs.avg_rating} (${rs.total})`)}
          ${stat(t.replyRate, `${rs.reply_rate_pct}%`)}
          ${stat(t.velocity, `${rs.velocity_per_month_6m}/mo`)}</div>`
      : "",
    ps
      ? `<div class="statgroup"><h2>${t.posts}</h2>
          ${stat("Σ", String(ps.total))}
          ${stat(t.cadence, ps.days_per_post ? `1/${ps.days_per_post}d` : "—")}
          ${stat("chars", String(ps.avg_chars ?? "—"))}</div>`
      : "",
    w
      ? `<div class="statgroup"><h2>${t.website}</h2>
          ${stat("PSI", String(w.psi_score ?? "—"))}
          ${stat(t.rented, w.rented_subdomain ? `✖ ${w.provider ?? ""}` : "✔")}
          ${stat(t.napRow, w.nap_match ? "✔" : "✖")}</div>`
      : "",
  ].join("");

  const competitorRows = report.competitors
    .slice(0, 4)
    .map(
      (c) => `
      <tr class="${c.is_target ? "target" : ""}">
        <td>${esc(clip(c.name, 34))}${c.is_target ? " ★" : ""}</td>
        <td>${esc(c.primary_category ?? "—")}</td>
        <td>${esc(c.rating ?? "—")}</td>
        <td>${esc(c.reviews_total ?? "—")}</td>
        <td>${c.distance_km === null ? "—" : esc(c.distance_km) + " km"}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="${lang === "hinglish" ? "mr-Latn" : lang}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:;">
<title>${esc(b.name)} — ${t.title}</title>
<style>
  @font-face {
    font-family: "Noto Sans Devanagari";
    src: url("${fontDataUri()}") format("truetype");
    font-weight: 100 900;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Noto Sans Devanagari", "Segoe UI", Arial, sans-serif;
    font-size: 10px; color: #111827; padding: 16px 22px;
  }
  header { display: flex; justify-content: space-between; align-items: baseline;
           border-bottom: 2px solid ${bandColor}; padding-bottom: 5px; }
  .brand { font-size: 12px; font-weight: 700; color: #4f46e5; }
  .meta { color: #6b7280; }
  .top { display: flex; justify-content: space-between; align-items: center;
         margin: 8px 0 2px; gap: 14px; }
  .who h1 { font-size: 16px; }
  .gaugebox { text-align: center; }
  .gaugebox .caption { color: #6b7280; margin-top: -4px; }
  .band-chip { display: inline-block; background: ${bandColor}; color: #fff;
               border-radius: 999px; padding: 1px 10px; font-weight: 700;
               font-size: 9px; text-transform: uppercase; margin-top: 2px; }
  h2 { font-size: 11px; margin: 8px 0 3px; border-bottom: 1px solid #e5e7eb;
       padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1.5px 4px; vertical-align: top; border-bottom: 1px solid #f3f4f6; }
  .glyph { width: 14px; font-weight: 700; }
  .lbl { width: 118px; white-space: nowrap; }
  .pts { width: 34px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .reason { color: #6b7280; }
  ul, ol { padding-left: 15px; }
  li { margin: 1.5px 0; }
  li.fail { color: #dc2626; }
  li.warn { color: #d97706; }
  .stats-grid { display: flex; gap: 14px; margin-top: 2px; }
  .statgroup { flex: 1; }
  .stat { display: flex; justify-content: space-between; gap: 8px;
          border-bottom: 1px solid #f3f4f6; padding: 1px 0; }
  .k { color: #6b7280; }
  .v { font-weight: 600; }
  .target { background: #eef2ff; font-weight: 600; }
  footer { margin-top: 10px; color: #9ca3af; font-size: 8px;
           border-top: 1px solid #e5e7eb; padding-top: 4px; }
</style>
</head>
<body>
  <header>
    <span class="brand">${brand}</span>
    <span class="meta">${t.generated}: ${generated}</span>
  </header>

  <div class="top">
    <div class="who">
      <h1>${esc(b.name)}</h1>
      <div class="meta">${esc(b.city ?? "")}${b.website ? " · " + esc(b.website) : ""}</div>
    </div>
    <div class="gaugebox">
      ${gaugeSvg(report.scores.total, band)}
      <div class="caption">${t.score} — ${esc(report.scores.total)} ${t.of} 100</div>
      <span class="band-chip">${esc(band)}</span>
    </div>
  </div>

  <h2>${t.rubric}</h2>
  <table>${rubricRows}</table>

  <h2>${t.fixes}</h2>
  <ol>${fixItems}</ol>

  ${flags ? `<h2>${t.flags}</h2><ul>${flags}</ul>` : ""}

  <div class="stats-grid">${statBlocks}</div>

  ${competitorRows ? `<h2>${t.competitors}</h2><table>${competitorRows}</table>` : ""}

  <footer>${brand} · ${esc(b.place_id ?? "")} · ${t.generated} ${generated}</footer>
</body>
</html>`;
}
