import { describe, expect, it } from "vitest";

import { assessFit, FIT_FACTORS, statedCapital, statedHours } from "@/lib/fit/model";
import type { FitFactors } from "@/lib/ai/schemas";
import type { ConsultationAnswers } from "@/lib/consultation/model";
import { normalizeProfile } from "@/lib/profile/normalize";

const answers = (over: Partial<ConsultationAnswers> = {}): ConsultationAnswers => ({
  v: 2,
  age: "24",
  status: "college_student",
  country: "India",
  weeklyHours: "h30_40",
  capitalBracket: 3,
  access: ["laptop", "customer_network"],
  skills: [{ name: "Coding", level: "advanced", usedInReal: true }],
  roles: ["building"],
  riskTolerance: "balanced",
  scale: "national",
  ...over,
});

const signals = (over: Partial<FitFactors> = {}): FitFactors => ({
  requiredSkills: [{ name: "Coding", minLevel: "comfortable" }],
  startupCapitalAmount: 5_000,
  weeklyHoursNeeded: 20,
  riskLevel: "balanced",
  motivationAlignment: "medium",
  requiresLeadership: false,
  requiresSales: false,
  soloFriendly: true,
  relevantExperienceYears: 0,
  requiresDigitalAssets: true,
  locationFlexible: true,
  ceiling: "national",
  ...over,
});

const factor = (a: ReturnType<typeof assessFit>, key: string) =>
  a.factors.find((f) => f.key === key)!;

describe("assessFit — one canonical founder-fit assessment", () => {
  it("scores five factors whose weights sum to 100, in a fixed order", () => {
    const a = assessFit(normalizeProfile(answers()), signals());
    expect(a.factors.map((f) => f.key)).toEqual(["access", "resources", "capability", "time", "goals"]);
    expect(FIT_FACTORS.reduce((s, f) => s + f.weight, 0)).toBe(100);
  });

  it("is deterministic: the same inputs always give the same label", () => {
    const p = normalizeProfile(answers());
    expect(assessFit(p, signals())).toEqual(assessFit(p, signals()));
  });

  it("keeps the founder's stated values as ranges — never a midpoint", () => {
    const p = normalizeProfile(answers({ weeklyHours: "h30_40" }));
    expect(statedHours(p)).toEqual({ min: 30, max: 40 });
    const cap = statedCapital(p)!;
    expect(cap.max).not.toBeNull();
    expect(cap.min).toBeLessThan(cap.max!);
  });

  it("treats skills that were never recorded as unknown, not absent", () => {
    const a = assessFit(normalizeProfile(answers({ skills: [] })), signals());
    expect(factor(a, "capability").score).toBeNull();
    expect(factor(a, "capability").reason.code).toBe("cap_unknown");
    expect(a.unknown).toContain("capability");
  });

  it("does not match an ambition the founder has not set ('Not sure yet')", () => {
    const a = assessFit(normalizeProfile(answers({ scale: "not_sure" })), signals());
    const g = factor(a, "goals");
    expect(g.reason.code).not.toBe("goals_match");
    expect(g.score === null || g.score <= 2).toBe(true);
  });

  it("says provisional, not a number, when less than 80% of the weight is known", () => {
    const a = assessFit(
      normalizeProfile(answers({ skills: [], access: undefined, weeklyHours: undefined })),
      signals(),
    );
    expect(a.coverage).toBeLessThan(0.8);
    expect(a.label).toBe("provisional");
  });

  it("never calls a direction Strong while customer access is unknown", () => {
    const a = assessFit(normalizeProfile(answers({ access: undefined })), signals());
    expect(a.unknown).toContain("access");
    expect(a.label).not.toBe("strong");
  });

  it("an explicit critical blocker rules out Strong", () => {
    const a = assessFit(
      normalizeProfile(answers()),
      signals({ weeklyHoursNeeded: 100 }), // far beyond the stated 30–40 hrs
    );
    expect(a.blockers).toContain("time");
    expect(a.label).not.toBe("strong");
  });

  it("an explicit 'None of these' access answer is a known gap for a selling-led direction", () => {
    const a = assessFit(normalizeProfile(answers({ access: ["none"] })), signals({ requiresSales: true }));
    expect(factor(a, "access").score).toBe(1);
  });

  it("a fully known, well-matched profile can be Strong — labels come from the rubric, not a quota", () => {
    const a = assessFit(normalizeProfile(answers()), signals());
    expect(a.coverage).toBe(1);
    expect(a.label).toBe("strong");
  });

  it("time needed above the stated range is a gap, scored against the range", () => {
    const a = assessFit(normalizeProfile(answers({ weeklyHours: "h5_10" })), signals({ weeklyHoursNeeded: 15 }));
    expect(factor(a, "time").score).toBe(1);
    expect(factor(a, "time").reason.params).toMatchObject({ min: 5, max: 10, need: 15 });
  });
});
