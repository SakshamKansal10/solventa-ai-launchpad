import { describe, expect, it } from "vitest";

import { evaluateDoneRule, readWorkspace, type MissionEntry } from "./workspace";

const row = (name: string, i = 0): MissionEntry => ({
  id: `r${i}`,
  kind: "list_row",
  data: { name, phone: "", where: "" },
  createdAt: "2026-11-15T10:00:00Z",
});

describe("mission done rules", () => {
  it("a mission without a rule is never gated", () => {
    expect(evaluateDoneRule(null, []).met).toBe(true);
  });

  it("a list counts only rows that name someone", () => {
    const rule = { metric: "list.count" as const, min: 3 };
    expect(evaluateDoneRule(rule, [row("A", 1), row("", 2), row("B", 3)])).toMatchObject({
      met: false,
      have: 2,
      need: 3,
    });
    expect(evaluateDoneRule(rule, [row("A", 1), row("B", 2), row("C", 3)]).met).toBe(true);
  });

  it("a quiz counts correct answers of the latest attempt", () => {
    const spec = {
      quiz: [
        { q: "1", options: ["a", "b"], answer: 0 },
        { q: "2", options: ["a", "b"], answer: 1 },
        { q: "3", options: ["a", "b"], answer: 1 },
      ],
    };
    const quiz = (answers: number[]): MissionEntry => ({
      id: "q",
      kind: "quiz",
      data: { answers },
      createdAt: "",
    });
    const rule = { metric: "quiz.correct" as const, min: 3 };
    expect(evaluateDoneRule(rule, [quiz([0, 0, 1])], spec).have).toBe(2);
    expect(evaluateDoneRule(rule, [quiz([0, 0, 1]), quiz([0, 1, 1])], spec).met).toBe(true);
  });

  it("malformed stored data means a generic, ungated workspace", () => {
    expect(readWorkspace({ workspace: "dance", done_rule: { metric: "x" } })).toMatchObject({
      type: "generic",
      rule: null,
    });
    expect(
      readWorkspace({ workspace: "list", done_rule: { metric: "list.count", min: 6 } }),
    ).toMatchObject({ type: "list", rule: { metric: "list.count", min: 6 } });
  });
});
