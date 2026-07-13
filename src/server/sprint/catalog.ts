import type { Business, SprintTaskSeed } from "@/types";
import { SPRINT_TASK_CATALOG } from "@/types";
import type { AuditInput } from "@/server/audit/input";
import { relatedCategoryIntel } from "@/server/audit/categories";
import { categorySuggestion, isGenericCategory } from "@/server/audit/sanity";

/**
 * P12 — instantiate the LOCKED 23-task catalog (SPRINT_TASK_CATALOG pins the
 * rubric_key vocabulary) against the baseline audit snapshot. MANUAL MODE:
 * per task we derive current_value (what the profile shows today),
 * suggested_value / copy_text (what the founder pastes), editor_url
 * (allowlisted GOOGLE editor surface only — directories go in the note) and
 * editor_hint. Zero GBP API writes, zero vendor calls.
 */

export interface CatalogTask {
  seed: SprintTaskSeed;
  current_value: string | null;
  suggested_value: string | null;
  copy_text: string | null;
  note: string | null;
  editor_url: string | null;
  editor_hint: string | null;
  /** Engine hint: which tasks want an ai.service draft (approved=false). */
  ai_prefill?: "description" | "post";
}

/** Allowlisted Google editor hosts (#1 / ADR-010) — never fetched server-side. */
const GOOGLE_EDITOR_HOSTS = [
  "www.google.com",
  "search.google.com",
  "business.google.com",
];

export function isAllowlistedEditorUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && GOOGLE_EDITOR_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

/** Owner-facing GOOGLE edit surface: knowledge-panel edit (kgmid) → Maps CID
 * → GBP dashboard. */
function googleEditorUrl(business: Business, input: AuditInput): string {
  const kgId = input.profile.kg_id;
  const cid = business.cid ?? input.profile.cid;
  if (kgId) return `https://www.google.com/search?kgmid=${encodeURIComponent(kgId)}`;
  if (cid) return `https://www.google.com/maps/place/?cid=${encodeURIComponent(cid)}`;
  return "https://business.google.com/";
}

function postsEditorUrl(business: Business, input: AuditInput): string {
  const kgId = input.profile.kg_id;
  return kgId
    ? `https://www.google.com/search?kgmid=${encodeURIComponent(kgId)}&uact=5#lpstate=pid:-1`
    : "https://business.google.com/posts";
}

function reviewsEditorUrl(business: Business, input: AuditInput): string {
  return input.profile.place_id
    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(input.profile.place_id)}`
    : googleEditorUrl(business, input);
}

const DIRECTORY_SEARCHES = (name: string, city: string) =>
  [
    `JustDial: https://www.justdial.com/${encodeURIComponent(city)}/search?q=${encodeURIComponent(name)}`,
    `IndiaMART: https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(name)}`,
    `Sulekha: https://www.sulekha.com/search?keyword=${encodeURIComponent(name)}&location=${encodeURIComponent(city)}`,
  ].join("\n");

/** Per-key enrichment against the audit snapshot. */
export function generateCatalog(business: Business, input: AuditInput): CatalogTask[] {
  const p = input.profile;
  const city = business.city ?? p.city ?? "Karad";
  const name = business.name;
  const site = business.website ?? p.website;
  const editor = googleEditorUrl(business, input);
  const hoursText = p.hours.map((h) => `${h.day}: ${h.text}`).join(" · ");
  const napBlock = [name, p.address, p.phone].filter(Boolean).join("\n");

  return SPRINT_TASK_CATALOG.map((seed): CatalogTask => {
    const base: CatalogTask = {
      seed,
      current_value: null,
      suggested_value: null,
      copy_text: null,
      note: null,
      editor_url: editor,
      editor_hint: null,
    };

    switch (seed.rubric_key) {
      case "primary_phone":
        return {
          ...base,
          current_value: p.phone,
          suggested_value: p.phone ? null : business.owner_whatsapp,
          note: p.phone
            ? "Phone already set — verify it rings"
            : "Calls are the #1 GBP action — use the number customers should reach",
          editor_hint: "Paste into Phone under Contact",
        };
      case "category_primary_fix": {
        const generic = !p.categories.primary || isGenericCategory(p.categories.primary);
        const suggestion = p.categories.primary
          ? categorySuggestion(p.categories.primary)
          : null;
        return {
          ...base,
          current_value: p.categories.primary,
          suggested_value: generic ? suggestion : null,
          note: generic
            ? suggestion
              ? `"${p.categories.primary}" is generic — suggested: ${suggestion}`
              : "Pick the most specific category Google offers"
            : "Primary category looks specific — verify it matches the core service",
          editor_hint: "Edit profile → Business category → Primary",
        };
      }
      case "category_secondary": {
        const intel = relatedCategoryIntel(
          p.categories.primary ? [p.categories.primary] : []
        );
        const extras = intel.related.slice(0, 4).map((r) => r.category);
        return {
          ...base,
          current_value: p.categories.secondary.join(", ") || null,
          suggested_value: extras.join(", ") || null,
          editor_hint: "Edit profile → Business category → Add another category",
        };
      }
      case "services": {
        const intel = relatedCategoryIntel(
          p.categories.primary ? [p.categories.primary] : []
        );
        const services = intel.related_services.slice(0, 8);
        return {
          ...base,
          current_value: p.services.join(", ") || "Services not found",
          suggested_value: services.join(", ") || null,
          copy_text: services.join("\n") || null,
          note: "Google matches service searches against this list",
          editor_hint: "Edit services → paste one per line",
        };
      }
      case "hours_fix":
        return {
          ...base,
          current_value: hoursText || null,
          note: p.hours.some((h) => h.anomaly)
            ? "The 12–9 AM overnight block looks like a data-entry error — confirm real hours with the owner"
            : "Hours look sane — verify festival/special days",
          editor_hint: "Edit profile → Hours",
        };
      case "attributes_upi":
        return {
          ...base,
          current_value:
            Object.entries(p.attributes)
              .map(([g, items]) => `${g}: ${items.join(", ")}`)
              .join(" · ") || null,
          note: "Add UPI/payments + accessibility attributes customers filter by",
          editor_hint: "Edit profile → More → Attributes",
        };
      case "products":
        return {
          ...base,
          note: "Add 3–5 products/packages with photos and prices",
          editor_hint: "Edit profile → Products",
        };
      case "booking_link":
        return {
          ...base,
          suggested_value: business.owner_whatsapp
            ? `https://wa.me/${business.owner_whatsapp.replace(/\D/g, "")}`
            : null,
          note: "A WhatsApp deep link works as the booking link for appointment businesses",
          editor_hint: "Edit profile → Booking",
        };
      case "logo_cover":
        return {
          ...base,
          current_value: `${p.photos_total ?? 0} photos on profile`,
          editor_hint: "Photos → Logo / Cover",
        };
      case "opening_date":
        return { ...base, editor_hint: "Edit profile → About → Opening date" };
      case "social_links":
        return { ...base, editor_hint: "Edit profile → Contact → Social profiles" };
      case "service_area":
        return {
          ...base,
          note: "Only for businesses that visit customers — skip (blocked + note) if storefront-only",
          editor_hint: "Edit profile → Location → Service area",
        };
      case "utm_link": {
        const utm = site
          ? `${site}${site.includes("?") ? "&" : "?"}utm_source=gbp&utm_medium=profile`
          : null;
        return {
          ...base,
          current_value: site ?? null,
          suggested_value: utm,
          copy_text: utm,
          note: site
            ? "Makes GBP traffic visible in analytics"
            : "No website linked — add one first (blocked)",
          editor_hint: "Edit profile → Contact → Website",
        };
      }
      case "description":
        return {
          ...base,
          current_value: p.description,
          note: "AI draft below — approve, edit, then paste (approve-before-publish)",
          editor_hint: "Edit profile → About → Description",
          ai_prefill: "description",
        };
      case "reply_backlog": {
        const rate = input.reviews?.stats.reply_rate_pct ?? null;
        return {
          ...base,
          current_value: rate === null ? "reply rate unknown" : `${rate}% replied`,
          note: "Use the AI Reply tool per review — approve each before posting",
          editor_url: reviewsEditorUrl(business, input),
          editor_hint: "Open the review list → reply from the owner account",
        };
      }
      case "review_machine": {
        const link = p.place_id
          ? `https://search.google.com/local/writereview?placeid=${p.place_id}`
          : null;
        return {
          ...base,
          suggested_value: link,
          copy_text: link,
          note: "Print the QR card + send after every sale on WhatsApp",
          editor_url: reviewsEditorUrl(business, input),
          editor_hint: "Share the review link with happy customers",
        };
      }
      case "review_velocity":
        return {
          ...base,
          current_value: `${input.reviews?.stats.velocity_per_month_6m ?? 0}/month over 6 months`,
          note: "Target 4+ new reviews every month",
          editor_url: reviewsEditorUrl(business, input),
          editor_hint: null,
        };
      case "posts_cadence":
        return {
          ...base,
          current_value: input.posts
            ? `${input.posts.stats.total} posts ever, ${input.posts.last_30d_count} in last 30 days`
            : "no post data",
          note: "AI draft for post #1 below — offers, tips, festivals",
          editor_url: postsEditorUrl(business, input),
          editor_hint: "Add update → paste the approved draft",
          ai_prefill: "post",
        };
      case "website_vendor": {
        const w = input.website;
        const briefLines = [
          `Website brief for ${name} (${site ?? "no site"})`,
          w && !(w.title.has_category && w.title.has_city)
            ? `1. Title tag → "${name} - ${p.categories.primary ?? "category"} in ${city}"`
            : null,
          w && !(w.meta.has_category && w.meta.has_locality)
            ? `2. Meta description → ${w.meta.ai_suggestions[0] ?? "include category + locality"}`
            : null,
          w && w.category_pages.some((c) => c.matched_page === null)
            ? `3. Create a page per GBP category: ${w.category_pages
                .filter((c) => c.matched_page === null)
                .map((c) => c.category)
                .join(", ")}`
            : null,
          w && w.heading_skips.length > 0
            ? `4. Fix heading hierarchy (skips: ${w.heading_skips.join(", ")})`
            : null,
          w && w.spelling_issues.length > 0
            ? `5. Spelling: ${w.spelling_issues
                .map((s) => `"${s.found}" → "${s.suggested}"`)
                .join(", ")}`
            : null,
        ].filter(Boolean);
        return {
          ...base,
          current_value: site ?? null,
          copy_text: site ? briefLines.join("\n") : null,
          note: site
            ? "Copy the brief and send it to the website vendor"
            : "No website — consider a basic owned-domain site (blocked until then)",
          editor_url: null, // vendor work — no Google editor surface
          editor_hint: null,
        };
      }
      case "website_quality":
        return {
          ...base,
          current_value: input.website?.rented_subdomain
            ? `rented subdomain (${input.website.provider})`
            : site ?? null,
          note: input.website?.rented_subdomain
            ? "Move from the rented subdomain to an owned domain; check SSL + mobile"
            : "Check SSL certificate + mobile usability",
          editor_url: null,
          editor_hint: null,
        };
      case "weak_zone":
        return {
          ...base,
          note: "Run a grid scan to locate the weak zone (grid is behind the live-data switch); plan: citations + service-area keywords",
          editor_url: null,
          editor_hint: null,
        };
      case "citation_nap":
        return {
          ...base,
          current_value: p.phone ? null : "GBP phone missing → NAP mismatch everywhere",
          copy_text: napBlock,
          note: "Fix the GBP phone FIRST, then align every directory to this exact NAP block",
          editor_url: null, // directories aren't Google editor surfaces
          editor_hint: null,
        };
      case "citation_directories":
        return {
          ...base,
          copy_text: `${napBlock}\n\n${DIRECTORY_SEARCHES(name, city)}`,
          note: "Directory search links are in the copy block — align NAP on each",
          editor_url: null,
          editor_hint: null,
        };
      default:
        return base;
    }
  });
}
