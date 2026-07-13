import type { CategoryIntel, RelatedCategory } from "@/types";

/**
 * MS1-T07 — category taxonomy + related-categories intel (EP-015, P8 tool ⑦).
 * The taxonomy is a static curated map for the verticals this agency serves;
 * search volumes are enriched live via keywords_data ONLY when the route is
 * asked to (paid, guarded) — the base intel is free.
 */

const TAXONOMY: Record<string, { related: string[]; services: string[] }> = {
  hospital: {
    related: [
      "Mental health clinic",
      "Hypnotherapy service",
      "Psychologist",
      "Counselor",
      "Alternative medicine practitioner",
      "Wellness center",
    ],
    services: [
      "Hypnotherapy",
      "NLP therapy",
      "EFT therapy",
      "De-addiction counselling",
      "Student concentration program",
      "Marriage counselling",
    ],
  },
  "mental health clinic": {
    related: ["Hypnotherapy service", "Psychologist", "Counselor", "Psychiatrist"],
    services: ["Hypnotherapy", "Counselling", "Stress management"],
  },
  dentist: {
    related: ["Dental clinic", "Orthodontist", "Pediatric dentist", "Dental implants periodontist"],
    services: ["Root canal", "Braces", "Teeth whitening", "Dental implants"],
  },
  "dental clinic": {
    related: ["Dentist", "Orthodontist", "Cosmetic dentist"],
    services: ["Root canal", "Braces", "Teeth whitening"],
  },
  restaurant: {
    related: ["Veg restaurant", "Family restaurant", "Maharashtrian restaurant", "Fast food restaurant"],
    services: ["Dine-in", "Takeaway", "Home delivery", "Catering"],
  },
  hotel: {
    related: ["Lodge", "Guest house", "Family restaurant", "Banquet hall"],
    services: ["Rooms", "Dining", "Events"],
  },
  "coaching center": {
    related: ["Tutoring service", "Educational institution", "Exam preparation center"],
    services: ["10th/12th coaching", "Competitive exams", "Personal tutoring"],
  },
  "beauty salon": {
    related: ["Beauty parlour", "Hair salon", "Bridal makeup artist", "Spa"],
    services: ["Haircut", "Facial", "Bridal makeup", "Waxing"],
  },
};

function keyFor(category: string): string {
  return category.trim().toLowerCase();
}

export function relatedCategoryIntel(
  current: string[],
  opts: { volumes?: Map<string, number | null> } = {}
): CategoryIntel {
  const seen = new Set(current.map(keyFor));
  const related: RelatedCategory[] = [];
  const services = new Set<string>();

  for (const cat of current) {
    const entry = TAXONOMY[keyFor(cat)];
    if (!entry) continue;
    for (const r of entry.related) {
      if (seen.has(keyFor(r))) continue;
      seen.add(keyFor(r));
      related.push({
        category: r,
        monthly_volume: opts.volumes?.get(keyFor(r)) ?? null,
        used_by_top_performers: 0, // filled when competitor audits exist (M1-T03 data)
      });
    }
    entry.services.forEach((s) => services.add(s));
  }

  const compare = [...current, ...related.slice(0, 4).map((r) => r.category)]
    .slice(0, 5)
    .map(encodeURIComponent)
    .join(",");

  return {
    current,
    related,
    related_services: Array.from(services),
    trends_compare_url: `https://trends.google.com/trends/explore?geo=IN&q=${compare}`,
  };
}
