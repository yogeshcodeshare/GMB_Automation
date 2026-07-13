/**
 * P2 "Find the business" candidate results.
 *
 * CONTRACT GAP (proposed in docs/agents/HANDOFF.md): API_CONTRACT.md has no
 * endpoint for the name+city → candidate-list step of P2 (EP-001 resolves
 * internally). Proposal: `GET /api/businesses/resolve?name=&city=` →
 * `BusinessCandidate[]`. Until MAIN arbitrates, the shape lives here — NOT
 * in @/types — and is used only by P2.
 */
export interface BusinessCandidate {
  place_id: string;
  cid: string;
  name: string;
  address: string;
  rating: number;
  reviews_total: number;
}

/** Prototype values: searching "मनोवेध हिप्नोक्लिनिक" + "Karad" → 2 matches. */
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
