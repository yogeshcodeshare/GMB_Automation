import type { BusinessCandidate } from "@/types";

/**
 * Typed mock of `GET /api/businesses/resolve?name=&city=` (contract row added
 * 13 Jul — MAIN approved backend's proposal). Prototype values: searching
 * "मनोवेध हिप्नोक्लिनिक" + "Karad" → 2 matches. Swapped for the real route
 * on Day 5.
 */
export const candidatesMock: BusinessCandidate[] = [
  {
    place_id: "ChIJVVVVVVVVVRQRmanovedh0001",
    cid: "11297348762834455001",
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
