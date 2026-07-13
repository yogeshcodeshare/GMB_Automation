import type { CompetitorCompareRow } from "@/types";

/**
 * P4 add-competitor suggestions (modal). Pulling one profile costs ₹0.2
 * (my_business_info). `area` is display-only for the suggestion row.
 * Flushable per the client data policy.
 */
export interface CompetitorSuggestion {
  area: string;
  row: CompetitorCompareRow;
}

export const competitorSuggestionsMock: CompetitorSuggestion[] = [
  {
    area: "Malkapur · 3.1 km",
    row: {
      business_id: null,
      name: "Mind Care Clinic",
      distance_km: 3.1,
      primary_category: "Psychiatrist",
      rating: 4.5,
      reviews_total: 21,
      velocity_6m: 0.9,
      reply_rate_pct: 12,
      photos: 18,
      services_count: 3,
      is_target: false,
    },
  },
  {
    area: "Shaniwar Peth, Karad · 0.9 km",
    row: {
      business_id: null,
      name: "Sukhmani Counselling Centre",
      distance_km: 0.9,
      primary_category: "Counselor",
      rating: 4.8,
      reviews_total: 12,
      velocity_6m: 0.6,
      reply_rate_pct: 45,
      photos: 9,
      services_count: 5,
      is_target: false,
    },
  },
];

/**
 * AI compare summary (EP-005 output on Day 5 — OpenRouter free model).
 * Marked AI-draft in the UI; never publishes anywhere.
 */
export const compareSummaryMock = {
  strengths:
    'Highest rating in the niche (4.9★). Strong Marathi word-of-mouth — "anubhav" theme appears in 8 reviews.',
  weaknesses:
    'Generic "Hospital" category. Zero services listed. 7% reply rate vs 81% at the top competitor. Near-zero posting.',
  fix_first:
    "Category + phone + services — free changes that unlock ranking. Then reply to all 28 pending reviews.",
};

/** Discovery line under the P4 title. */
export const compareDiscoveryNoteMock =
  'Discovered via local finder · "hypno clinic" + "mental health clinic", Karad';
