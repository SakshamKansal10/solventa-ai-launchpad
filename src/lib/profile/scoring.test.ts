import { describe, expect, it } from "vitest";
import {
  computeFitScore,
  FIT_SCORE_MAXIMA,
  getConstraintWarnings,
  type OpportunityFitFactors,
} from "@/lib/profile/scoring";
import { normalizeProfile } from "@/lib/profile/normalize";

const baseFactors: OpportunityFitFactors = {
  requiredSkills: [{ name: "Coding", minLevel: "intermediate" }],
  startupCapitalINR: 50_000,
  weeklyHoursNeeded: 10,
  riskLevel: "balanced",
  motivationAlignment: "high",
  requiresLeadership: false,
  requiresSales: false,
  soloFriendly: true,
  relevantExperienceYears: 1,
  requiresDigitalAssets: true,
  locationFlexible: true,
};

describe("computeFitScore", () => {
  it("weights sum to exactly 100 across the seven factors", () => {
    const total = Object.values(FIT_SCORE_MAXIMA).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("gives a perfect skills score when the founder meets or exceeds every required skill", () => {
    const profile = normalizeProfile({
      skills: [{ name: "Coding", level: "advanced" }],
      investmentBudget: "₹50,000 – ₹2,00,000",
      timeAvailableWeekly: "10–20 hrs",
      riskAppetite: "Balanced",
      assets: ["A laptop / computer"],
      yearsExperience: "1–3 years",
    });
    const result = computeFitScore(profile, baseFactors);
    expect(result.breakdown.skills).toBe(FIT_SCORE_MAXIMA.skills);
  });

  it("scores zero skill match when the founder has none of the required skills", () => {
    const profile = normalizeProfile({ skills: [{ name: "Cooking / Baking", level: "advanced" }] });
    const result = computeFitScore(profile, baseFactors);
    expect(result.breakdown.skills).toBe(0);
  });

  it("scales resources score by how much capital the founder actually has relative to what's needed", () => {
    const poor = normalizeProfile({ investmentBudget: "₹0 — I have no capital right now" });
    const rich = normalizeProfile({
      investmentBudget: "More than ₹2,00,000",
      preciseCapital: "5 lakh",
      assets: ["A laptop / computer"],
    });
    const poorScore = computeFitScore(poor, baseFactors);
    const richScore = computeFitScore(rich, baseFactors);
    expect(richScore.breakdown.resources).toBeGreaterThan(poorScore.breakdown.resources);
    expect(richScore.breakdown.resources).toBe(FIT_SCORE_MAXIMA.resources);
  });

  it("gives full time score when available hours meet or exceed what's needed, partial otherwise", () => {
    const fullTime = normalizeProfile({ timeAvailableWeekly: "Full-time" });
    const under5 = normalizeProfile({ timeAvailableWeekly: "Under 5 hrs" });
    expect(computeFitScore(fullTime, baseFactors).breakdown.time).toBe(FIT_SCORE_MAXIMA.time);
    expect(computeFitScore(under5, baseFactors).breakdown.time).toBeLessThan(FIT_SCORE_MAXIMA.time);
  });

  it("penalizes risk mismatch proportionally to distance on the risk spectrum", () => {
    const cautious = normalizeProfile({ riskAppetite: "Very cautious" });
    const experimental = normalizeProfile({ riskAppetite: "Comfortable experimenting" });
    const experimentalFactors: OpportunityFitFactors = {
      ...baseFactors,
      riskLevel: "experimental",
    };

    const cautiousScore = computeFitScore(cautious, experimentalFactors).breakdown.risk;
    const experimentalScore = computeFitScore(experimental, experimentalFactors).breakdown.risk;
    expect(experimentalScore).toBeGreaterThan(cautiousScore);
  });

  it("never returns a total outside 0-100", () => {
    const extreme = normalizeProfile({
      skills: [],
      investmentBudget: "₹0 — I have no capital right now",
      timeAvailableWeekly: "Under 5 hrs",
      riskAppetite: "Very cautious",
    });
    const demandingFactors: OpportunityFitFactors = {
      ...baseFactors,
      startupCapitalINR: 5_000_000,
      weeklyHoursNeeded: 60,
      riskLevel: "experimental",
      motivationAlignment: "low",
      relevantExperienceYears: 15,
    };
    const result = computeFitScore(extreme, demandingFactors);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("gives two radically different founders different scores for the same opportunity", () => {
    const student = normalizeProfile({
      currentStatus: "School Student",
      skills: [],
      investmentBudget: "₹0 — I have no capital right now",
      timeAvailableWeekly: "Under 5 hrs",
      riskAppetite: "Very cautious",
      yearsExperience: undefined,
    });
    const founder = normalizeProfile({
      currentStatus: "Business Owner",
      skills: [{ name: "Coding", level: "professional" }],
      investmentBudget: "More than ₹2,00,000",
      preciseCapital: "10 lakh",
      timeAvailableWeekly: "Full-time",
      riskAppetite: "Comfortable experimenting",
      yearsExperience: "5–10 years",
      assets: ["A laptop / computer"],
    });

    const studentScore = computeFitScore(student, baseFactors).total;
    const founderScore = computeFitScore(founder, baseFactors).total;
    expect(studentScore).not.toBe(founderScore);
    expect(founderScore).toBeGreaterThan(studentScore);
  });

  it("is deterministic — the same inputs always produce the same score", () => {
    const profile = normalizeProfile({ skills: [{ name: "Coding", level: "intermediate" }] });
    const first = computeFitScore(profile, baseFactors);
    const second = computeFitScore(profile, baseFactors);
    expect(first).toEqual(second);
  });

  it("penalizes a location-bound opportunity for a remote-only founder, not for others", () => {
    const remoteOnly = normalizeProfile({ workLocation: "Remote" });
    const noPreference = normalizeProfile({});
    const boundFactors: OpportunityFitFactors = { ...baseFactors, locationFlexible: false };

    expect(computeFitScore(remoteOnly, boundFactors).breakdown.context).toBeLessThan(
      FIT_SCORE_MAXIMA.context,
    );
    expect(computeFitScore(noPreference, boundFactors).breakdown.context).toBe(
      FIT_SCORE_MAXIMA.context,
    );
  });
});

describe("getConstraintWarnings", () => {
  it("flags a real capital mismatch for a founder with no money", () => {
    const broke = normalizeProfile({ investmentBudget: "₹0 — I have no capital right now" });
    const warnings = getConstraintWarnings(broke, { ...baseFactors, startupCapitalINR: 500_000 });
    expect(warnings.some((w) => w.includes("capital"))).toBe(true);
  });

  it("does not flag a modest, affordable capital requirement", () => {
    const broke = normalizeProfile({ investmentBudget: "₹0 — I have no capital right now" });
    const warnings = getConstraintWarnings(broke, { ...baseFactors, startupCapitalINR: 0 });
    expect(warnings).toHaveLength(0);
  });

  it("flags a real time mismatch for a low-availability founder", () => {
    const busy = normalizeProfile({ timeAvailableWeekly: "Under 5 hrs" });
    const warnings = getConstraintWarnings(busy, { ...baseFactors, weeklyHoursNeeded: 40 });
    expect(warnings.some((w) => w.toLowerCase().includes("hrs/week"))).toBe(true);
  });
});
