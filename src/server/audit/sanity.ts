import type { SanityFlag } from "@/types";
import { hoursAnomalyMessage } from "./hours";
import type { AuditInput } from "./input";

/**
 * MS1-T10 sanity checks — deterministic red flags surfaced on the audit page.
 * The Manovedh fixture must raise all six.
 */

/** Website-builder rental domains: a business site on `something.<provider>`
 * is rented, not owned — flagged because it can vanish with the subscription
 * and passes no domain authority. */
const RENTED_PROVIDERS = [
  "grexa.site",
  "wixsite.com",
  "business.site",
  "blogspot.com",
  "wordpress.com",
  "weebly.com",
  "godaddysites.com",
  "square.site",
  "webnode.page",
  "site123.me",
  "mystrikingly.com",
  "netlify.app",
  "github.io",
];

/** Broad categories that under-describe a niche business (rubric + sanity).
 * "Hospital" on a hypnotherapy clinic is the fixture's canonical case. */
export const GENERIC_CATEGORIES = [
  "Hospital",
  "Doctor",
  "Clinic",
  "Medical clinic",
  "Store",
  "Shop",
  "Office",
  "Company",
  "Corporate office",
  "Business center",
  "Service establishment",
];

/** Better-category hints for reasons/fixes (deterministic, no AI). */
const CATEGORY_SUGGESTIONS: Record<string, string> = {
  Hospital: "Mental health clinic / Hypnotherapy service",
  Doctor: "the doctor's actual speciality (e.g. Pediatrician)",
  Clinic: "the clinic's speciality (e.g. Dental clinic)",
  Store: "the product category (e.g. Clothing store)",
  Shop: "the product category (e.g. Mobile phone shop)",
};

export function isGenericCategory(category: string | null): boolean {
  if (!category) return false;
  return GENERIC_CATEGORIES.some(
    (g) => g.toLowerCase() === category.trim().toLowerCase()
  );
}

export function categorySuggestion(category: string): string | null {
  return CATEGORY_SUGGESTIONS[category] ?? null;
}

export function detectRentedSubdomain(
  websiteUrl: string | null
): { rented: boolean; provider: string | null } {
  if (!websiteUrl) return { rented: false, provider: null };
  let host: string;
  try {
    host = new URL(websiteUrl).hostname.toLowerCase();
  } catch {
    return { rented: false, provider: null };
  }
  for (const provider of RENTED_PROVIDERS) {
    if (host === provider || host.endsWith(`.${provider}`)) {
      return { rented: true, provider };
    }
  }
  return { rented: false, provider: null };
}

export function runSanityChecks(input: AuditInput): SanityFlag[] {
  const flags: SanityFlag[] = [];
  const { profile, website } = input;

  if (!profile.phone) {
    flags.push({
      key: "phone_missing",
      severity: "fail",
      message:
        "No phone number on the profile — customers cannot call; calls are the #1 GBP action",
    });
  }

  if (profile.services.length === 0) {
    flags.push({
      key: "services_empty",
      severity: "fail",
      message:
        "Services list is empty — Google matches service searches against this list",
    });
  }

  const hoursMsg = hoursAnomalyMessage(profile.hours);
  if (hoursMsg) {
    flags.push({ key: "hours_anomaly", severity: "warn", message: hoursMsg });
  }

  const primary = profile.categories.primary;
  if (primary && isGenericCategory(primary)) {
    const suggestion = categorySuggestion(primary);
    flags.push({
      key: "generic_category",
      severity: "fail",
      message:
        `Primary category "${primary}" is generic` +
        (suggestion ? ` — a specific category (${suggestion}) ranks better` : ""),
    });
  }

  const rented = detectRentedSubdomain(profile.website);
  if (rented.rented) {
    flags.push({
      key: "rented_subdomain",
      severity: "warn",
      message: `Website lives on a rented subdomain (${rented.provider}) — the business does not own its domain`,
    });
  }

  const napMismatches = (website?.nap ?? []).filter((r) => !r.match);
  if (napMismatches.length > 0) {
    const fields = napMismatches.map((r) => r.field).join(", ");
    flags.push({
      key: "nap_mismatch",
      severity: "warn",
      message: `NAP mismatch between GBP and website: ${fields}`,
    });
  }

  return flags;
}
