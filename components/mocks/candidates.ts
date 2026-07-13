import type { BusinessCandidate } from "@/types";

/**
 * Typed mock of `GET /api/businesses/resolve?name=&city=` (contract row added
 * 13 Jul — MAIN approved backend's proposal). Prototype values: searching
 * "मनोवेध हिप्नोक्लिनिक" + "Karad" → 2 matches. Swapped for the real route
 * on Day 5.
 */
/**
 * Mock resolver behaviour: fixture-ish queries return the two candidates,
 * anything else returns none (drives the P2 no-results state). Replaced by
 * the real `GET /api/businesses/resolve` on Day 5.
 */
export function searchCandidatesMock(name: string): BusinessCandidate[] {
  const q = name.trim().toLowerCase();
  if (!q) return [];
  const hit = ["मनोवेध", "manovedh", "hypno", "avani", "हिप्नो"].some((k) =>
    q.includes(k.toLowerCase()),
  );
  return hit ? candidatesMock : [];
}

export const candidatesMock: BusinessCandidate[] = [
  {
    place_id: "ChIJXQL5mR3BwjsRkH4v7VZ9aQY",
    cid: "1129384756602311845",
    name: "मनोवेध हिप्नोक्लिनिक (संमोहन उपचार, NLP, EFT थेरपी)",
    address: "Somwar Peth, Karad",
    rating: 4.9,
    reviews_total: 30,
  },
  {
    place_id: "ChIJVVVVVVVVVRQRavani0007",
    cid: "11297348762834455007",
    name: "Avani Hypnotism & Wellness",
    address: "Janvhi Arcade, Karad",
    rating: 4.7,
    reviews_total: 18,
  },
];
