import { describe, expect, it } from "vitest";
import { clientPace } from "@/server/dashboard/stats";

const CLIENTS = [
  { id: "b2", name: "Hotel Sahyadri Veg" },
  { id: "b3", name: "श्री डेंटल केअर" },
  { id: "b4", name: "Patil Coaching Classes" },
];

function cycle(
  business_id: string,
  posts: [number, number],
  photos: [number, number]
) {
  return {
    business_id,
    posts_done: posts[0],
    posts_target: posts[1],
    photos_done: photos[0],
    photos_target: photos[1],
  };
}

describe("dashboard stats — client pace rule", () => {
  it("seed quotas on 13 Jul (13/31 elapsed): all three on track", () => {
    const pace = clientPace(
      CLIENTS,
      [
        cycle("b2", [6, 8], [7, 10]),
        cycle("b3", [4, 8], [6, 10]),
        cycle("b4", [3, 8], [4, 10]),
      ],
      13 / 31
    );
    expect(pace).toEqual({ on_track: 3, behind: 0, note: null });
  });

  it("late month: a lagging quota flips a client behind with a note", () => {
    const pace = clientPace(
      CLIENTS,
      [
        cycle("b2", [8, 8], [10, 10]),
        cycle("b3", [8, 8], [9, 10]),
        cycle("b4", [3, 8], [10, 10]), // 3 < floor(8 * 0.9) = 7
      ],
      28 / 31
    );
    expect(pace.on_track).toBe(2);
    expect(pace.behind).toBe(1);
    expect(pace.note).toBe("Patil Coaching Classes: posts 3/8 behind");
  });

  it("missing cycle row counts behind (cycle not started)", () => {
    const pace = clientPace(CLIENTS, [cycle("b2", [1, 8], [1, 10])], 2 / 31);
    expect(pace.behind).toBe(2);
    expect(pace.note).toContain("service cycle not started");
  });

  it("no clients → zeros, no note", () => {
    expect(clientPace([], [], 0.5)).toEqual({
      on_track: 0,
      behind: 0,
      note: null,
    });
  });

  it("zero targets never count behind (nothing promised)", () => {
    const pace = clientPace(
      [{ id: "b9", name: "X" }],
      [cycle("b9", [0, 0], [0, 0])],
      0.99
    );
    expect(pace.on_track).toBe(1);
  });
});
