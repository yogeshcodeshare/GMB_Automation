import type { Business } from "@/types";
import type { AuditInput } from "@/server/audit/input";
import { relatedCategoryIntel } from "@/server/audit/categories";
import { categorySuggestion, isGenericCategory } from "@/server/audit/sanity";

/**
 * P12 — the grouped fix-task catalog (§2.7b, ~23 tasks for a Manovedh-grade
 * audit), generated from the audit snapshot. MANUAL MODE: every task carries
 * a copy_value (what the founder pastes) + a google_editor_url deep link
 * (where to paste it) — zero GBP API writes in M6.
 * Groups derive from rubric_key via sprintGroupFor (@/types).
 */

export interface CatalogTask {
  rubric_key: string;
  title: string;
  change_before: string | null;
  /** AI-prefill slot — engine may overwrite with an ai.service draft. */
  change_after: string | null;
  note: string | null;
  manual: {
    copy_value: string | null;
    google_editor_url: string;
  };
  /** Engine hint: which tasks want an AI draft (persisted approved=false). */
  ai_prefill?: "description" | "post";
}

/** Owner-facing edit surface per area — manual mode deep links. The
 * knowledge-panel link shows the owner's Edit chips when logged in as a
 * manager; falls back to the Maps CID link, then the GBP dashboard. */
export function editorUrlFor(
  area: "profile" | "posts" | "reviews" | "website" | "maps" | string,
  business: Business,
  input: AuditInput
): string {
  const kgId = input.profile.kg_id;
  const cid = business.cid ?? input.profile.cid;
  if (area === "website" && business.website) return business.website;
  if (area === "posts") {
    return kgId
      ? `https://www.google.com/search?kgmid=${encodeURIComponent(kgId)}&uact=5#lpstate=pid:-1`
      : "https://business.google.com/posts";
  }
  if (area === "reviews" && input.profile.place_id) {
    return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(input.profile.place_id)}`;
  }
  if (kgId) return `https://www.google.com/search?kgmid=${encodeURIComponent(kgId)}`;
  if (cid) return `https://www.google.com/maps/place/?cid=${encodeURIComponent(cid)}`;
  return "https://business.google.com/";
}

const DIRECTORY_URLS: Record<string, (name: string, city: string) => string> = {
  citation_justdial: (name, city) =>
    `https://www.justdial.com/${encodeURIComponent(city)}/search?q=${encodeURIComponent(name)}`,
  citation_indiamart: (name) =>
    `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(name)}`,
  citation_sulekha: (name, city) =>
    `https://www.sulekha.com/search?keyword=${encodeURIComponent(name)}&location=${encodeURIComponent(city)}`,
};

/** Generate the audit-driven catalog. Deficit-driven tasks appear only when
 * the audit shows the deficit; standard-practice tasks always appear. */
export function generateCatalog(business: Business, input: AuditInput): CatalogTask[] {
  const tasks: CatalogTask[] = [];
  const p = input.profile;
  const name = business.name;
  const city = business.city ?? p.city ?? "Karad";
  const profileUrl = editorUrlFor("profile", business, input);
  const push = (t: Omit<CatalogTask, "manual"> & { manual?: Partial<CatalogTask["manual"]> }) =>
    tasks.push({
      ...t,
      manual: {
        copy_value: t.manual?.copy_value ?? null,
        google_editor_url: t.manual?.google_editor_url ?? profileUrl,
      },
    });

  // ---------- Profile ----------
  const primary = p.categories.primary;
  if (!primary || isGenericCategory(primary)) {
    const suggestion = primary ? categorySuggestion(primary) : null;
    push({
      rubric_key: "primary_category",
      title: "Fix primary category",
      change_before: primary,
      change_after: suggestion,
      note: suggestion ? `Suggested: ${suggestion}` : "Pick the most specific category Google offers",
      manual: { copy_value: suggestion },
    });
  }
  if (!p.phone) {
    push({
      rubric_key: "phone",
      title: "Add business phone number",
      change_before: null,
      change_after: business.owner_whatsapp,
      note: "Calls are the #1 GBP action — use the number customers should reach",
      manual: { copy_value: business.owner_whatsapp },
    });
  }
  if (p.hours.some((h) => h.anomaly)) {
    push({
      rubric_key: "hours",
      title: "Correct opening hours",
      change_before: p.hours.map((h) => `${h.day}: ${h.text}`).join(" · "),
      change_after: null,
      note: "The 12–9 AM overnight block looks like a data-entry error — confirm real hours with the owner",
    });
  }
  if (p.services.length === 0) {
    const intel = relatedCategoryIntel(primary ? [primary] : []);
    const services = intel.related_services.slice(0, 8);
    push({
      rubric_key: "services",
      title: `Add services list (${services.length || "8"} services)`,
      change_before: "Services not found",
      change_after: services.join(", ") || null,
      note: "Google matches service searches against this list",
      manual: { copy_value: services.join("\n") || null },
    });
  }
  push({
    rubric_key: "description",
    title: "Rewrite business description",
    change_before: p.description,
    change_after: null, // AI prefill slot
    note: "AI draft below — edit before pasting (approve-before-publish)",
    ai_prefill: "description",
  });
  if ((p.photos_total ?? 0) < 10) {
    push({
      rubric_key: "photos",
      title: "Upload 10 fresh photos",
      change_before: `${p.photos_total ?? 0} photos on profile`,
      change_after: null,
      note: "Front, inside, team, results — phones are fine",
    });
  }
  push({
    rubric_key: "logo_cover",
    title: "Set logo and cover photo",
    change_before: null,
    change_after: null,
    note: null,
  });
  push({
    rubric_key: "opening_date",
    title: "Add business opening date",
    change_before: null,
    change_after: null,
    note: null,
  });
  push({
    rubric_key: "social_links",
    title: "Add social profile links",
    change_before: null,
    change_after: null,
    note: null,
  });
  if (business.website ?? p.website) {
    const site = (business.website ?? p.website) as string;
    const utm = `${site}${site.includes("?") ? "&" : "?"}utm_source=gbp&utm_medium=profile`;
    push({
      rubric_key: "utm_website",
      title: "Set UTM-tagged website link",
      change_before: site,
      change_after: utm,
      manual: { copy_value: utm },
      note: "Makes GBP traffic visible in analytics",
    });
  }

  // ---------- Reviews ----------
  const reviewsUrl = editorUrlFor("reviews", business, input);
  const replyRate = input.reviews?.stats.reply_rate_pct ?? null;
  if (replyRate === null || replyRate < 50) {
    push({
      rubric_key: "reply_backlog",
      title: "Reply to all unanswered reviews",
      change_before: replyRate === null ? "reply rate unknown" : `${replyRate}% replied`,
      change_after: null,
      note: "Use the AI Reply tool per review — approve each before posting",
      manual: { google_editor_url: reviewsUrl },
    });
  }
  push({
    rubric_key: "review_machine",
    title: "Launch review-request machine (QR + WhatsApp)",
    change_before: null,
    change_after: null,
    note: input.profile.place_id
      ? `Review link: https://search.google.com/local/writereview?placeid=${input.profile.place_id}`
      : null,
    manual: {
      copy_value: input.profile.place_id
        ? `https://search.google.com/local/writereview?placeid=${input.profile.place_id}`
        : null,
      google_editor_url: reviewsUrl,
    },
  });
  if ((input.reviews?.stats.velocity_per_month_6m ?? 0) < 2) {
    push({
      rubric_key: "review_velocity",
      title: "Ask 10 recent customers for reviews",
      change_before: `${input.reviews?.stats.velocity_per_month_6m ?? 0}/month over 6 months`,
      change_after: null,
      note: null,
      manual: { google_editor_url: reviewsUrl },
    });
  }

  // ---------- Posts ----------
  if ((input.posts?.last_30d_count ?? 0) < 4) {
    push({
      rubric_key: "posts_cadence",
      title: "Publish first 4 GBP posts of the month",
      change_before: input.posts
        ? `${input.posts.stats.total} posts ever, ${input.posts.last_30d_count} in last 30 days`
        : "no post data",
      change_after: null, // AI prefill slot
      note: "AI draft for post #1 below — offers, tips, festivals",
      manual: { google_editor_url: editorUrlFor("posts", business, input) },
      ai_prefill: "post",
    });
  }

  // ---------- Website (vendor sub-tasks; copy brief for vendor) ----------
  const w = input.website;
  const siteUrl = business.website ?? p.website;
  if (siteUrl) {
    const webUrl = editorUrlFor("website", business, input);
    if (!w || !(w.title.has_category && w.title.has_city)) {
      const suggested = `${name} - ${primary ?? "your category"} in ${city}`;
      push({
        rubric_key: "website_title",
        title: "Fix title tag (category + locality)",
        change_before: w?.title.value ?? null,
        change_after: suggested,
        manual: { copy_value: suggested, google_editor_url: webUrl },
        note: "Copy brief for the website vendor",
      });
    }
    if (!w || !(w.meta.has_category && w.meta.has_locality)) {
      const aiSuggestion = w?.meta.ai_suggestions[0] ?? null;
      push({
        rubric_key: "website_meta",
        title: "Rewrite meta description",
        change_before: w?.meta.value ?? null,
        change_after: aiSuggestion,
        manual: { copy_value: aiSuggestion, google_editor_url: webUrl },
        note: "Copy brief for the website vendor",
      });
    }
    if (!w || w.category_pages.some((c) => c.matched_page === null)) {
      push({
        rubric_key: "website_category_page",
        title: "Create category/service pages",
        change_before: w
          ? w.category_pages
              .filter((c) => c.matched_page === null)
              .map((c) => c.category)
              .join(", ") + " — no matching page"
          : null,
        change_after: null,
        manual: { google_editor_url: webUrl },
        note: "Copy brief for the website vendor",
      });
    }
    if (!w || w.heading_skips.length > 0) {
      push({
        rubric_key: "website_headings",
        title: "Fix heading hierarchy (H1→H2→H3)",
        change_before: w?.heading_skips.join(", ") || null,
        change_after: null,
        manual: { google_editor_url: webUrl },
        note: "Copy brief for the website vendor",
      });
    }
    if (w && w.spelling_issues.length > 0) {
      push({
        rubric_key: "website_spelling",
        title: "Fix spelling issues on site",
        change_before: w.spelling_issues
          .map((s) => `"${s.found}" → "${s.suggested}"`)
          .join(", "),
        change_after: w.spelling_issues.map((s) => s.suggested).join(", "),
        manual: {
          copy_value: w.spelling_issues
            .map((s) => `${s.found} → ${s.suggested} (${s.location})`)
            .join("\n"),
          google_editor_url: webUrl,
        },
        note: null,
      });
    }
  }

  // ---------- Visibility ----------
  push({
    rubric_key: "weak_zone",
    title: "Improve the weak map zone",
    change_before: null,
    change_after: null,
    note: "Run a grid scan to locate it (grid is behind the live-data switch); plan: citations + service-area keywords",
    manual: {
      google_editor_url: input.profile.cid
        ? `https://www.google.com/maps/place/?cid=${encodeURIComponent(input.profile.cid)}`
        : profileUrl,
    },
  });

  // ---------- Citations ----------
  for (const key of ["citation_justdial", "citation_indiamart", "citation_sulekha"] as const) {
    const label = key.split("_")[1];
    const pretty = label.charAt(0).toUpperCase() + label.slice(1);
    push({
      rubric_key: key,
      title: key === "citation_sulekha" ? `Create ${pretty} listing` : `Fix ${pretty} listing NAP`,
      change_before: null,
      change_after: null,
      note: p.phone
        ? null
        : "Add the phone here AFTER fixing it on GBP — NAP must match everywhere",
      manual: {
        copy_value: [name, p.address, p.phone].filter(Boolean).join("\n"),
        google_editor_url: DIRECTORY_URLS[key](name, city),
      },
    });
  }

  return tasks;
}
