import { describe, it, expect } from "vitest";

import {
  applyAnswer,
  parseAge,
  resolveScreens,
  SCREENS,
  screenIndexForKey,
  toggleMulti,
  type ConsultationAnswers,
} from "@/lib/consultation/model";
import { formatBracketLabel, getBrackets } from "@/lib/consultation/brackets";
import { legacyToV2 } from "@/lib/consultation/migrate";
import { normalizeProfile } from "@/lib/profile/normalize";
import { computeAmbitionCalibration } from "@/lib/profile/ambition";
import { computeFounderGenome } from "@/lib/profile/founder-genome";

const screen = (key: string) => SCREENS.find((s) => s.key === key)!;

describe("consultation structure", () => {
  it("keeps seven stages and ~17 screens (not 40+)", () => {
    const stages = new Set(SCREENS.map((s) => s.stage));
    expect([...stages].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(SCREENS.length).toBeGreaterThanOrEqual(16);
    expect(SCREENS.length).toBeLessThanOrEqual(19);
  });

  it("only shows the Position screen to employees, freelancers and business owners", () => {
    const keys = (status: string) => resolveScreens({ status }).map((s) => s.key);
    expect(keys("college_student")).not.toContain("position");
    expect(keys("working_professional")).toContain("position");
    expect(keys("freelancer")).toContain("position");
    expect(keys("business_owner")).toContain("position");
    expect(keys("not_working")).not.toContain("position");
  });

  it("never lets a screen with nothing to ask sit behind a Continue button", () => {
    // Every screen must be completable — none returns false for a fully answered profile.
    const full: ConsultationAnswers = {
      v: 2,
      age: "30",
      status: "business_owner",
      country: "India",
      city: "Gurugram",
      education: "bachelors",
      major: "business",
      languages: ["English"],
      weeklyHours: "h10_20",
      skills: [{ name: "Sales", level: "advanced", usedInReal: true }],
      domains: ["ecommerce"],
      executionSignals: ["ran_business"],
      capitalBracket: 4,
      access: ["team"],
      bizSector: "ecommerce",
      bizTurnoverBracket: 3,
      bizTeamBracket: 3,
      riskTolerance: "balanced",
      roles: ["leading"],
      teamPreference: "has_team",
      commitment: "large_company",
      relocation: "no",
      constraints: ["none"],
      scale: "expand_existing",
      horizon: "y2_4",
      hope: "large_company",
    };
    for (const s of resolveScreens(full)) expect(s.isComplete(full), s.key).toBe(true);
  });
});

describe("validation", () => {
  it("accepts a sane age range only", () => {
    expect(parseAge("24")).toBe(24);
    expect(parseAge("12")).toBeNull();
    expect(parseAge("91")).toBeNull();
    expect(parseAge("2x")).toBeNull();
    expect(parseAge("")).toBeNull();
    expect(parseAge(undefined)).toBeNull();
  });

  it("basics needs a valid age, a status, and the description when status is Other", () => {
    const basics = screen("basics");
    expect(basics.isComplete({ age: "24" })).toBe(false);
    expect(basics.isComplete({ age: "24", status: "college_student" })).toBe(true);
    expect(basics.isComplete({ age: "24", status: "other" })).toBe(false);
    expect(basics.isComplete({ age: "24", status: "other", statusOther: "Caregiver" })).toBe(true);
    expect(basics.isComplete({ age: "9", status: "college_student" })).toBe(false);
  });

  it("education adapts: degree levels need a major, students need a study year", () => {
    const edu = screen("education");
    expect(edu.isComplete({ education: "twelfth" })).toBe(true);
    expect(edu.isComplete({ education: "bachelors" })).toBe(false);
    expect(edu.isComplete({ education: "bachelors", major: "cs_it" })).toBe(true);
    expect(edu.isComplete({ education: "bachelors", major: "other" })).toBe(false);
    expect(
      edu.isComplete({ education: "bachelors", major: "other", majorOther: "Marine biology" }),
    ).toBe(true);
    expect(
      edu.isComplete({ education: "bachelors", major: "cs_it", status: "college_student" }),
    ).toBe(false);
    expect(
      edu.isComplete({
        education: "bachelors",
        major: "cs_it",
        status: "college_student",
        studyYear: "y2",
      }),
    ).toBe(true);
  });

  it("skills are optional, but every added skill needs a level", () => {
    const skills = screen("skills");
    expect(skills.isComplete({})).toBe(true);
    expect(
      skills.isComplete({ skills: [{ name: "Coding", level: null, usedInReal: false }] }),
    ).toBe(false);
    expect(
      skills.isComplete({ skills: [{ name: "Coding", level: "basic", usedInReal: false }] }),
    ).toBe(true);
  });

  it("business owners must give sector, turnover and team size; employees may skip income", () => {
    const pos = screen("position");
    expect(pos.isComplete({ status: "working_professional" })).toBe(true);
    expect(pos.isComplete({ status: "business_owner" })).toBe(false);
    expect(
      pos.isComplete({
        status: "business_owner",
        bizSector: "manufacturing",
        bizTurnoverBracket: 4,
        bizTeamBracket: 2,
      }),
    ).toBe(true);
  });

  it("the minimum-income question is optional but the hope is required", () => {
    const s = screen("incomeHope");
    expect(s.isComplete({})).toBe(false);
    expect(s.isComplete({ hope: "not_sure" })).toBe(true);
  });
});

describe("answer mechanics", () => {
  it("'none of these' is exclusive in both directions", () => {
    let list = toggleMulti("access", ["laptop"], "none");
    expect(list).toEqual(["none"]);
    list = toggleMulti("access", list, "team");
    expect(list).toEqual(["team"]);
    list = toggleMulti("access", list, "team");
    expect(list).toEqual([]);
  });

  it("changing status drops answers that belonged to the old branch", () => {
    const before: ConsultationAnswers = {
      status: "college_student",
      studyYear: "y2",
      annualIncomeBracket: 3,
      bizTurnoverBracket: 2,
    };
    const after = applyAnswer(before, "status", "business_owner");
    expect(after.status).toBe("business_owner");
    expect(after.studyYear).toBeUndefined();
    expect(after.annualIncomeBracket).toBeUndefined();
    expect(after.bizTurnoverBracket).toBeUndefined();
  });

  it("changing country clears the region/city that belonged to it", () => {
    const after = applyAnswer(
      { country: "India", state: "Haryana", city: "Gurugram" },
      "country",
      "Canada",
    );
    expect(after.state).toBeUndefined();
    expect(after.city).toBeUndefined();
  });

  it("resumes at the exact screen, or the nearest earlier one if it no longer applies", () => {
    const student = resolveScreens({ status: "college_student" });
    const emp = resolveScreens({ status: "working_professional" });
    expect(screenIndexForKey(emp, "position")).toBe(emp.findIndex((s) => s.key === "position"));
    // 'position' no longer applies after switching to a student: land on 'access' (the screen before it).
    expect(student[screenIndexForKey(student, "position")].key).toBe("access");
    expect(screenIndexForKey(student, "submit")).toBe(student.length);
    expect(screenIndexForKey(student, undefined)).toBe(0);
  });
});

describe("country-aware money tiers", () => {
  it("INR tiers read in lakh/crore in English and Hindi", () => {
    const tiers = getBrackets("capital", "INR");
    expect(tiers).toHaveLength(9);
    expect(formatBracketLabel(tiers[5], "INR", "en")).toBe("₹5 lakh – ₹10 lakh");
    expect(formatBracketLabel(tiers[5], "INR", "hi")).toBe("₹5 लाख – ₹10 लाख");
    expect(formatBracketLabel(tiers[8], "INR", "en")).toBe("More than ₹1 crore");
  });

  it("a 100-crore operator lands in a top turnover tier, distinct from a first-timer", () => {
    const tiers = getBrackets("turnover", "INR");
    expect(tiers.at(-1)!.min).toBe(2_500_000_000);
    expect(tiers.at(-1)!.value).toBeGreaterThan(tiers[0].value * 100);
  });

  it("other currencies are independently scaled, not converted", () => {
    const usd = getBrackets("capital", "USD");
    const jpy = getBrackets("capital", "JPY");
    expect(jpy[2].max).toBe(usd[2].max! * 100);
  });
});

describe("normalizeProfile v2", () => {
  const base: ConsultationAnswers = {
    v: 2,
    age: "21",
    status: "college_student",
    country: "India",
    state: "Haryana",
    city: "Gurugram",
    education: "bachelors",
    major: "cs_it",
    studyYear: "y3",
    languages: ["English", "Hindi"],
    weeklyHours: "h10_20",
    capitalBracket: 5,
    access: ["laptop"],
    riskTolerance: "balanced",
    roles: ["building"],
    teamPreference: "open_cofounder",
    commitment: "solve_problem",
    interests: ["education"],
    relocation: "unlikely",
    constraints: ["none"],
    scale: "national",
    horizon: "y2_4",
    hope: "large_company",
  };

  it("maps ids to canonical English regardless of the language the founder used", () => {
    const p = normalizeProfile(base);
    expect(p.identity.currentStatus).toBe("College Student");
    expect(p.identity.education).toBe("Bachelor's Degree");
    expect(p.time.weeklyHours).toBe(15);
    expect(p.resources.capitalAmount).toBe(750_000);
    expect(p.resources.capitalBracket).toBe("₹5 lakh – ₹10 lakh");
    expect(p.v2?.ambition.scale).toBe("A scalable national company");
    expect(p.direction.timeline).toBe("2–4 years");
  });

  it("a skill never used on a real project counts for less than the same skill used in practice", () => {
    const studied = normalizeProfile({
      ...base,
      skills: [{ name: "Coding", level: "working", usedInReal: false }],
    });
    const used = normalizeProfile({
      ...base,
      skills: [{ name: "Coding", level: "working", usedInReal: true }],
    });
    const pro = normalizeProfile({
      ...base,
      skills: [{ name: "Coding", level: "professional", usedInReal: false }],
    });
    expect(studied.skills[0].levelScore).toBeLessThan(used.skills[0].levelScore);
    expect(pro.skills[0].levelScore).toBe(3);
    expect(pro.skills[0].usedInReal).toBe(true);
  });

  it("drops the retired 'monthly income win' anchor; minimum income stays a constraint", () => {
    const p = normalizeProfile({ ...base, minIncomeBracket: 2 });
    expect(p.direction.monthlyIncomeGoalAmount).toBeNull();
    expect(p.v2?.ambition.minimumMonthlyIncome).toBeGreaterThan(0);
  });

  it("treats an established operator very differently from a first-time founder", () => {
    const first = normalizeProfile(base);
    const operator = normalizeProfile({
      ...base,
      age: "46",
      status: "business_owner",
      studyYear: undefined,
      executionSignals: ["ran_business", "managed_team", "managed_budget", "sold_customers"],
      capitalBracket: 8,
      access: ["team", "customer_network", "suppliers", "existing_business"],
      bizSector: "manufacturing",
      bizTurnoverBracket: 5,
      bizTeamBracket: 4,
      roles: ["leading", "selling"],
      teamPreference: "has_team",
      scale: "expand_existing",
    });
    expect(operator.v2?.position.business?.turnoverAmount).toBeGreaterThan(1_000_000_000);
    expect(operator.experienceYears).toBeGreaterThan(first.experienceYears + 8);

    const aFirst = computeAmbitionCalibration(first, computeFounderGenome(first));
    const aOp = computeAmbitionCalibration(operator, computeFounderGenome(operator));
    expect(aOp.score).toBeGreaterThan(aFirst.score + 15);
    expect("DE".includes(aOp.band)).toBe(true);
  });

  it("leaves pre-rebuild (v1) answers on the original normalization path", () => {
    const p = normalizeProfile({
      age: "30",
      country: "India",
      currentStatus: "Working Professional",
      yearsExperience: "5–10 years",
      timeAvailableWeekly: "10–20 hrs",
      skills: [{ name: "Coding", level: "advanced" }],
    });
    expect(p.experienceYears).toBe(7);
    expect(p.time.weeklyHours).toBe(15);
    expect(p.v2).toBeUndefined();
  });
});

describe("legacy → v2 migration (edit-profile prefill only)", () => {
  it("drops 'never tried' skills, maps levels, and never invents answers", () => {
    const v2 = legacyToV2({
      age: "28",
      country: "India",
      currentStatus: "Working Professional",
      timeAvailableWeekly: "20+ hrs",
      investmentBudget: "₹50,000 – ₹2,00,000",
      annualIncome: "₹10–20L",
      skills: [
        { name: "Coding", level: "advanced" },
        { name: "Cooking / Baking", level: "never_tried" },
        { name: "Writing", level: "comfortable" },
      ],
      riskAppetite: "Very cautious",
      relocation: "Possibly, for the right reason",
    });
    expect(v2.v).toBe(2);
    expect(v2.status).toBe("working_professional");
    expect(v2.weeklyHours).toBe("h20_30");
    expect(v2.capitalBracket).toBe(3);
    expect(v2.annualIncomeBracket).toBe(3);
    expect(v2.skills?.map((s) => [s.name, s.level])).toEqual([
      ["Coding", "advanced"],
      ["Writing", "working"],
    ]);
    expect(v2.riskTolerance).toBe("conservative");
    expect(v2.relocation).toBe("exceptional");
    // Nothing was asked about scale in v1 — it must stay blank, not guessed.
    expect(v2.scale).toBeUndefined();
    expect(v2.horizon).toBeUndefined();
  });
});
