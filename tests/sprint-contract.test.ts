import { describe, expect, it } from "vitest";
import {
  SPRINT_GROUPS,
  SPRINT_TASK_CATALOG,
  projectedScore,
  sprintGroupFor,
  type SprintTask,
} from "@/types/sprint";
import { RUBRIC_MAX } from "@/types/audit";

/**
 * Day-6 locked P12 sprint contract — pure invariants (no DB). Guards the EP-021/022
 * shapes the backend + frontend build against from drifting.
 */
describe("P12 sprint contract invariants", () => {
  it("every catalog entry's group === sprintGroupFor(rubric_key)", () => {
    for (const t of SPRINT_TASK_CATALOG) {
      expect(sprintGroupFor(t.rubric_key), `catalog ${t.rubric_key}`).toBe(t.group);
    }
  });

  it("every catalog group is one of the 6 canonical groups", () => {
    for (const t of SPRINT_TASK_CATALOG) {
      expect(SPRINT_GROUPS).toContain(t.group);
    }
  });

  it("catalog rubric keys are valid RubricKeys or null (visibility)", () => {
    for (const t of SPRINT_TASK_CATALOG) {
      if (t.rubric === null) {
        expect(t.group).toBe("visibility"); // only grid tasks skip the scored rubric
      } else {
        expect(Object.keys(RUBRIC_MAX)).toContain(t.rubric);
      }
    }
  });

  it("rubric_key vocabulary is unique", () => {
    const keys = SPRINT_TASK_CATALOG.map((t) => t.rubric_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("projectedScore sums done-task rubric points and caps at 100", () => {
    const tasks = [
      { status: "done", rubric_points: 15 },
      { status: "done", rubric_points: 10 },
      { status: "todo", rubric_points: 8 }, // not counted
    ] satisfies Array<Pick<SprintTask, "status" | "rubric_points">>;
    expect(projectedScore(41, tasks)).toBe(66);
    expect(projectedScore(95, [{ status: "done", rubric_points: 20 }])).toBe(100); // cap
    expect(projectedScore(null, tasks)).toBeNull();
  });
});
