import { describe, expect, it } from "vitest";

import { normalizeProfile } from "@/lib/profile/normalize";

import { findContradictions, missingFitFields } from "./gaps";

const BASE = {
  v: 2,
  age: "21",
  status: "college_student",
  country: "India",
  state: "Haryana",
  city: "Gurugram",
  education: "bachelors",
  languages: ["English", "Hindi"],
  weeklyHours: "h10_20",
  skills: [{ name: "Coding", level: "working", usedInReal: false }],
  capitalBracket: 3,
  access: ["laptop"],
  riskTolerance: "balanced",
  scale: "national",
} as const;

const profile = (a: Record<string, unknown>) =>
  normalizeProfile(a as Parameters<typeof normalizeProfile>[0]);

describe("ask what is missing", () => {
  it("asks nothing when every fit answer is there", () => {
    expect(missingFitFields(profile(BASE))).toEqual([]);
  });

  it("asks exactly for the empty answers, heaviest factor first", () => {
    expect(missingFitFields(profile({ ...BASE, skills: [], access: [] }))).toEqual([
      "access",
      "skills",
    ]);
  });

  it("treats 'none of these' as an answer, not a gap", () => {
    expect(missingFitFields(profile({ ...BASE, access: ["none"] }))).toEqual([]);
  });

  it("never asks more than four short questions", () => {
    const fields = missingFitFields(
      profile({
        ...BASE,
        skills: [],
        access: [],
        capitalBracket: undefined,
        weeklyHours: undefined,
        scale: undefined,
        riskTolerance: undefined,
      }),
    );
    // access 1 + capital 1 + skills 2 = 4; hours and scale wait for a later visit.
    expect(fields).toEqual(["access", "capital", "skills"]);
  });
});

describe("profile contradictions", () => {
  it("flags an age that does not match the occupation or education", () => {
    expect(findContradictions({ age: "15", status: "working_professional" })).toEqual([
      { code: "age_status", age: 15, status: "working_professional" },
    ]);
    expect(findContradictions({ age: "16", education: "bachelors" })).toEqual([
      { code: "age_education", age: 16, education: "bachelors" },
    ]);
    expect(findContradictions({ age: "34", status: "school_student" })[0]?.code).toBe("age_status");
  });

  it("leaves ordinary profiles alone", () => {
    expect(
      findContradictions({ age: "21", status: "college_student", education: "bachelors" }),
    ).toEqual([]);
    expect(
      findContradictions({ age: "17", status: "school_student", education: "twelfth" }),
    ).toEqual([]);
    expect(findContradictions({})).toEqual([]);
  });
});
