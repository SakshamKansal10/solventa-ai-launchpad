import { describe, expect, it } from "vitest";

import { applyFactPatch, capitalAnswer, cleanFactPatch, isEmptyPatch } from "./apply-facts";
import type { ConsultationAnswers } from "@/lib/consultation/model";

const OLD: ConsultationAnswers = {
  v: 2,
  country: "India",
  state: "Haryana",
  city: "Gurugram",
  capitalBracket: 1,
  weeklyHours: "h10_20",
  workDays: ["weekday_evenings"],
  skills: [{ name: "Coding", level: "working", usedInReal: false }],
  constraints: ["none"],
};

describe("new facts from Ask Sol (Job M)", () => {
  it("keeps only well-formed fields from the model", () => {
    expect(
      cleanFactPatch({
        capitalAmount: 200000,
        weeklyHours: "lots",
        workDays: ["saturday", "funday"],
        city: "  Delhi ",
        addSkills: ["", "Cooking"],
        notes: ["My partner is a chef"],
        extra: "ignored",
      }),
    ).toEqual({
      capitalAmount: 200000,
      workDays: ["saturday"],
      city: "Delhi",
      addSkills: ["Cooking"],
      notes: ["My partner is a chef"],
    });
    expect(isEmptyPatch(cleanFactPatch(null))).toBe(true);
    expect(isEmptyPatch(cleanFactPatch({ capitalAmount: -5, weeklyHours: 3 }))).toBe(true);
  });

  it("maps an amount to its capital tier (₹2 lakh is ₹2–5 lakh), the top tier keeps the amount", () => {
    expect(capitalAnswer(200_000, "India")).toEqual({ capitalBracket: 4 });
    expect(capitalAnswer(0, "India")).toEqual({ capitalBracket: 0 });
    expect(capitalAnswer(50_000_000, "India")).toEqual({
      capitalBracket: 8,
      capitalPrecise: "50000000",
    });
  });

  it("returns a NEW answer set and never edits the old one", () => {
    const before = structuredClone(OLD);
    const next = applyFactPatch(OLD, {
      capitalAmount: 200_000,
      city: "Delhi",
      state: "Delhi",
      workDays: ["saturday", "sunday"],
      addSkills: ["Cooking", "coding"],
      notes: ["My partner is a chef"],
    });
    expect(OLD).toEqual(before);
    expect(next).toMatchObject({
      city: "Delhi",
      state: "Delhi",
      capitalBracket: 4,
      workDays: ["saturday", "sunday"],
      weeklyHours: "h10_20",
    });
    expect(next.skills?.map((s) => s.name)).toEqual(["Coding", "Cooking"]);
    expect(next.constraints).toEqual(["other"]);
    expect(next.constraintsOther).toBe("Latest update from the founder: My partner is a chef");
  });
});
