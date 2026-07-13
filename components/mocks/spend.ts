import type { SpendToday } from "@/types";

/**
 * Typed mock of EP-012 `GET /api/spend/today` (swapped for the real route on
 * Day 5). Values chosen so the display is exactly the prototype's
 * "₹6.20 / ₹95" at INR_PER_USD = 85.
 */
export const spendTodayMock: SpendToday = {
  spent_usd: 0.0729,
  cap_usd: 1.1176,
  remaining_usd: 1.0447,
  blocked: false,
};

/** Cap-hit variant — drives the global red banner + disabled paid buttons. */
export const spendTodayCapHitMock: SpendToday = {
  spent_usd: 1.1176,
  cap_usd: 1.1176,
  remaining_usd: 0,
  blocked: true,
};
