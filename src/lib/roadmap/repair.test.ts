import { describe, expect, it } from "vitest";

import { RoadmapWeekDetailSchema } from "@/lib/ai/schemas";

import { repairWeekDetail } from "./repair";

const task = (over: Record<string, unknown> = {}) => ({
  what: "List 8 shop owners",
  why: "To find people to ask",
  how: "Walk the market",
  resource: null,
  timeEstimate: "~1 hr",
  deadlineDaysFromStart: 1,
  doneWhen: "8 names written down",
  required: true,
  dependsOn: null,
  fallback: "Ask a friend for 3 names",
  ...over,
});

const week = (tasks: unknown[], over: Record<string, unknown> = {}) => ({
  mission: "Talk to 5 shop owners",
  tasks,
  mistakesToAvoid: ["Pitching before listening"],
  evidenceRequired: "Notes from 5 talks",
  successThreshold: "3 of 5 name the same problem",
  evidenceTarget: 5,
  adaptationNote: null,
  ...over,
});

describe("repairWeekDetail", () => {
  it("fixes the small overshoots that used to fail a whole week", () => {
    const raw = week(
      [
        task({
          steps: ["a", "b", "c", "d", "e"],
          workspace: "list",
          workspaceTarget: 25,
          required: "true",
          deadlineDaysFromStart: 9,
        }),
        task({
          workspace: "learn",
          quizQuestions: ["q1", "q2", "q3", "q4"],
          quizOptions: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
          quizAnswers: [0, 3, 1],
          lesson: ["1", "2", "3", "4", "5", "6"],
        }),
        task({ workspace: "chat", assumptionCategory: "money", dependsOn: 2 }),
      ],
      { mistakesToAvoid: ["a", "b", "c", "d"], evidenceTarget: 80 },
    );
    expect(RoadmapWeekDetailSchema.safeParse(raw).success).toBe(false);
    const fixed = RoadmapWeekDetailSchema.parse(repairWeekDetail(raw));
    const [a, b, c] = fixed.tasks;
    expect(a.steps).toHaveLength(4);
    expect(a.workspaceTarget).toBe(20);
    expect(a.required).toBe(true);
    expect(a.deadlineDaysFromStart).toBe(6);
    expect(b.quizQuestions).toHaveLength(3);
    expect(b.quizOptions).toHaveLength(9);
    expect(b.quizAnswers).toEqual([0, 2, 1]);
    expect(b.lesson).toHaveLength(5);
    expect(c.workspace).toBe("generic");
    expect(c.assumptionCategory).toBe("other");
    expect(c.dependsOn).toBeNull();
    expect(fixed.mistakesToAvoid).toHaveLength(3);
    expect(fixed.evidenceTarget).toBe(50);
  });

  it("drops a quiz that is not whole instead of failing", () => {
    const fixed = RoadmapWeekDetailSchema.parse(
      repairWeekDetail(
        week([
          task({ quizQuestions: ["q1", "q2", "q3"], quizOptions: ["x"], quizAnswers: [0] }),
          task(),
        ]),
      ),
    );
    expect(fixed.tasks[0].quizQuestions).toBeNull();
  });

  it("never invents what is missing: no tasks still fails validation", () => {
    expect(RoadmapWeekDetailSchema.safeParse(repairWeekDetail(week([]))).success).toBe(false);
  });
});
