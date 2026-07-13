import { readFileSync } from "node:fs";
import path from "node:path";
import type { AuditReport, RubricRow } from "@/types";

/**
 * MS4-T01 — the Marathi-first report template (EP-006). Server-rendered
 * HTML → Playwright PDF. SEC-003 (P0): EVERY interpolated string passes
 * esc() — business names and review text are attacker-controlled. CSP meta
 * blocks scripts even if something slipped; fonts are embedded as data:
 * URIs (no external fetches at render time).
 */

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

const L = {
  mr: {
    title: "GBP ऑडिट रिपोर्ट",
    score: "एकूण गुण",
    rubric: "तपासणी यादी",
    flags: "तातडीचे प्रश्न",
    fixes: "पहिली ५ कामे",
    reviews: "रिव्ह्यू",
    posts: "पोस्ट",
    website: "वेबसाइट",
    competitors: "स्पर्धक",
    generated: "तयार केले",
    of: "पैकी",
  },
  en: {
    title: "GBP Audit Report",
    score: "Total score",
    rubric: "Checklist",
    flags: "Urgent issues",
    fixes: "Top 5 fixes",
    reviews: "Reviews",
    posts: "Posts",
    website: "Website",
    competitors: "Competitors",
    generated: "Generated",
    of: "of",
  },
} as const;

function statRow(label: string, value: string): string {
  return `<tr><td class="k">${esc(label)}</td><td class="v">${esc(value)}</td></tr>`;
}

export function renderReportHtml(
  report: AuditReport,
  lang: "mr" | "en",
  opts: { brand?: string; generatedAt?: string } = {}
): string {
  const t = L[lang];
  const brand = esc(opts.brand ?? "GMB Sarathi");
  const generated = esc(
    (opts.generatedAt ?? new Date().toISOString()).slice(0, 10)
  );
  const b = report.business;
  const band = report.band;
  const bandColor = BAND_COLOR[band] ?? "#6b7280";

  const rubricRows = report.rubric
    .map(
      (r) => `
      <tr>
        <td style="color:${STATUS_COLOR[r.status]}" class="glyph">${STATUS_GLYPH[r.status]}</td>
        <td>${esc(r.label)}</td>
        <td class="pts">${esc(r.points)}/${esc(r.max)}</td>
        <td class="reason">${esc(r.reason)}</td>
      </tr>`
    )
    .join("");

  const flags = report.sanity_flags
    .map((f) => `<li class="${f.severity}">${esc(f.message)}</li>`)
    .join("");

  const fixes =
    report.top_fixes.find((f) => f.lang === lang)?.items ??
    report.top_fixes[0]?.items ??
    [];
  const fixItems = fixes.map((f) => `<li>${esc(f)}</li>`).join("");

  const rs = report.review_stats;
  const ps = report.post_stats;
  const w = report.website;

  const competitorRows = report.competitors
    .slice(0, 6)
    .map(
      (c) => `
      <tr class="${c.is_target ? "target" : ""}">
        <td>${esc(c.name)}${c.is_target ? " ★" : ""}</td>
        <td>${esc(c.primary_category ?? "—")}</td>
        <td>${esc(c.rating ?? "—")}</td>
        <td>${esc(c.reviews_total ?? "—")}</td>
        <td>${c.distance_km === null ? "—" : esc(c.distance_km) + " km"}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="${lang}">
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
    font-size: 12px; color: #111827; padding: 28px 32px;
  }
  header { display: flex; justify-content: space-between; align-items: baseline;
           border-bottom: 3px solid ${bandColor}; padding-bottom: 10px; }
  .brand { font-size: 14px; font-weight: 700; color: #4f46e5; }
  h1 { font-size: 20px; margin: 14px 0 2px; }
  .meta { color: #6b7280; }
  .gauge { display: flex; align-items: center; gap: 16px; margin: 18px 0; }
  .score { font-size: 44px; font-weight: 800; color: ${bandColor}; }
  .band-chip { background: ${bandColor}; color: #fff; border-radius: 999px;
               padding: 3px 14px; font-weight: 700; text-transform: uppercase; }
  h2 { font-size: 14px; margin: 16px 0 6px; border-bottom: 1px solid #e5e7eb;
       padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 6px; vertical-align: top; border-bottom: 1px solid #f3f4f6; }
  .glyph { width: 18px; font-weight: 700; }
  .pts { width: 48px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .reason { color: #6b7280; }
  ul { padding-left: 18px; }
  li { margin: 3px 0; }
  li.fail { color: #dc2626; }
  li.warn { color: #d97706; }
  .stats-grid { display: flex; gap: 24px; }
  .stats-grid table { width: auto; min-width: 200px; }
  .k { color: #6b7280; }
  .v { font-weight: 600; }
  .target { background: #eef2ff; font-weight: 600; }
  footer { margin-top: 22px; color: #9ca3af; font-size: 10px;
           border-top: 1px solid #e5e7eb; padding-top: 6px; }
</style>
</head>
<body>
  <header>
    <span class="brand">${brand}</span>
    <span class="meta">${t.generated}: ${generated}</span>
  </header>

  <h1>${esc(b.name)}</h1>
  <div class="meta">${esc(b.city ?? "")}${b.website ? " · " + esc(b.website) : ""}</div>

  <div class="gauge">
    <span class="score">${esc(report.scores.total)}</span>
    <div>
      <div>${t.score} — ${esc(report.scores.total)} ${t.of} 100</div>
      <span class="band-chip">${esc(band)}</span>
    </div>
  </div>

  <h2>${t.rubric}</h2>
  <table>${rubricRows}</table>

  ${flags ? `<h2>${t.flags}</h2><ul>${flags}</ul>` : ""}

  <h2>${t.fixes}</h2>
  <ol>${fixItems}</ol>

  <div class="stats-grid">
    ${
      rs
        ? `<div><h2>${t.reviews}</h2><table>
            ${statRow("★", `${rs.avg_rating} (${rs.total})`)}
            ${statRow("Reply rate", `${rs.reply_rate_pct}%`)}
            ${statRow("6m velocity", `${rs.velocity_per_month_6m}/mo`)}
          </table></div>`
        : ""
    }
    ${
      ps
        ? `<div><h2>${t.posts}</h2><table>
            ${statRow("Total", String(ps.total))}
            ${statRow("Cadence", ps.days_per_post ? `1/${ps.days_per_post}d` : "—")}
            ${statRow("Avg chars", String(ps.avg_chars ?? "—"))}
          </table></div>`
        : ""
    }
    ${
      w
        ? `<div><h2>${t.website}</h2><table>
            ${statRow("PSI", String(w.psi_score ?? "—"))}
            ${statRow("Rented domain", w.rented_subdomain ? `yes (${w.provider ?? ""})` : "no")}
            ${statRow("NAP", w.nap_match ? "match" : "mismatch")}
          </table></div>`
        : ""
    }
  </div>

  ${
    competitorRows
      ? `<h2>${t.competitors}</h2><table>${competitorRows}</table>`
      : ""
  }

  <footer>${brand} · ${esc(b.place_id ?? "")} · ${t.generated} ${generated}</footer>
</body>
</html>`;
}
