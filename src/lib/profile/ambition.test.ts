import { describe, expect, it } from "vitest";
import {
  computeAmbitionCalibration,
  formatAmbitionContextForPrompt,
  AMBITION_BAND_LABEL,
  type AmbitionBand,
} from "@/lib/profile/ambition";
import { computeFounderGenome } from "@/lib/profile/founder-genome";
import type { NormalizedProfile } from "@/lib/profile/normalize";

const BAND_ORDER: AmbitionBand[] = ["A", "B", "C", "D", "E"];
function bandIndex(band: AmbitionBand): number {
  return BAND_ORDER.indexOf(band);
}

function baseProfile(overrides: Partial<NormalizedProfile> = {}): NormalizedProfile {
  return {
    identity: {
      age: 24,
      country: "India",
      state: null,
      city: null,
      education: "Bachelor's Degree",
      currentStatus: "Working Professional",
      currentStatusDetail: null,
      languages: [],
      currentBusiness: null,
      currency: "INR",
      currencySymbol: "₹",
    },
    skills: [],
    experienceYears: 0,
    resources: {
      capitalAmount: 0,
      capitalBracket: null,
      annualIncomeAmount: null,
      assets: [],
      internetQuality: null,
      transportation: null,
    },
    time: { weeklyHours: 5, weeklyHoursBracket: null },
    workStyle: {
      location: null,
      type: null,
      leadership: null,
      salesComfort: null,
      soloOrTeam: null,
    },
    risk: { appetite: null },
    motivation: { biggestMotivation: [], dailyFrustration: [] },
    constraints: { industryRestrictions: [], relocation: null, other: [] },
    direction: {
      goals: [],
      monthlyIncomeGoalAmount: null,
      timeline: null,
      willingToLeaveJob: null,
    },
    ...overrides,
  };
}

function calibrate(profile: NormalizedProfile) {
  return computeAmbitionCalibration(profile, computeFounderGenome(profile));
}

describe("computeAmbitionCalibration", () => {
  it("never throws and always returns a score within 0-100", () => {
    const c = calibrate(baseProfile());
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(100);
    expect(BAND_ORDER).toContain(c.band);
  });

  it("is deterministic — identical profiles always produce identical calibrations", () => {
    const profile = baseProfile({ skills: [{ name: "Coding", level: "advanced", levelScore: 3 }] });
    expect(calibrate(profile)).toEqual(calibrate(profile));
  });

  it("every band has a real label", () => {
    for (const band of BAND_ORDER) {
      expect(AMBITION_BAND_LABEL[band].length).toBeGreaterThan(0);
    }
  });

  // 1. High-potential technical profile — strong skills, capital, income,
  // and risk tolerance should land in the top two bands, never the bottom.
  it("scores a high-potential technical profile in the top bands (D/E)", () => {
    const profile = baseProfile({
      identity: {
        ...baseProfile().identity,
        education: "Master's Degree",
        currentBusiness: null,
      },
      skills: [
        { name: "Coding", level: "advanced", levelScore: 3 },
        { name: "Software Development", level: "advanced", levelScore: 3 },
        { name: "Data Analysis", level: "comfortable", levelScore: 2 },
      ],
      experienceYears: 4,
      resources: {
        ...baseProfile().resources,
        capitalBracket: "More than ₹2,00,000",
        annualIncomeAmount: 3_500_000,
      },
      time: { weeklyHours: 20, weeklyHoursBracket: "10–20 hrs" },
      workStyle: {
        ...baseProfile().workStyle,
        leadership: "Very comfortable",
        salesComfort: "I enjoy it",
      },
      risk: { appetite: "experimental" },
      direction: { ...baseProfile().direction, monthlyIncomeGoalAmount: 200_000 },
    });
    const c = calibrate(profile);
    expect(bandIndex(c.band)).toBeGreaterThanOrEqual(bandIndex("D"));
    expect(c.reasonCodes).toContain("HIGH_TECHNICAL_DEPTH");
  });

  // 2. Beginner, low-resource student — no skills, no capital, no
  // experience. Must never land in the top bands.
  it("scores a beginner low-resource student in the bottom bands (A/B)", () => {
    const profile = baseProfile({
      identity: {
        ...baseProfile().identity,
        education: "12th Pass",
        currentStatus: "College Student",
      },
      skills: [],
      experienceYears: 0,
      resources: { ...baseProfile().resources, capitalBracket: "₹0 — I have no capital right now" },
      time: { weeklyHours: 5, weeklyHoursBracket: "Under 5 hrs" },
      workStyle: { ...baseProfile().workStyle, leadership: "Untested" },
      risk: { appetite: "cautious" },
    });
    const c = calibrate(profile);
    expect(bandIndex(c.band)).toBeLessThanOrEqual(bandIndex("B"));
    expect(c.reasonCodes).toContain("LOW_INITIAL_CAPITAL");
  });

  // 3. Experienced working professional — real years of experience and a
  // stable income, moderate everything else. Should clearly outrank the
  // beginner student, landing mid-scale.
  it("scores an experienced working professional above the beginner student, mid-scale", () => {
    const beginner = calibrate(
      baseProfile({
        identity: {
          ...baseProfile().identity,
          education: "12th Pass",
          currentStatus: "College Student",
        },
        resources: {
          ...baseProfile().resources,
          capitalBracket: "₹0 — I have no capital right now",
        },
        time: { weeklyHours: 5, weeklyHoursBracket: "Under 5 hrs" },
        risk: { appetite: "cautious" },
      }),
    );
    const professional = calibrate(
      baseProfile({
        identity: { ...baseProfile().identity, education: "Bachelor's Degree" },
        skills: [{ name: "Sales", level: "comfortable", levelScore: 2 }],
        experienceYears: 7,
        resources: {
          ...baseProfile().resources,
          capitalBracket: "₹50,000 – ₹2,00,000",
          annualIncomeAmount: 1_500_000,
        },
        time: { weeklyHours: 15, weeklyHoursBracket: "10–20 hrs" },
        risk: { appetite: "balanced" },
      }),
    );
    expect(professional.score).toBeGreaterThan(beginner.score);
    expect(bandIndex(professional.band)).toBeGreaterThanOrEqual(bandIndex("B"));
    expect(bandIndex(professional.band)).toBeLessThanOrEqual(bandIndex("D"));
  });

  // 4. Wealthy but time-poor founder — top capital bracket, but very
  // little weekly time. Real capital should register (STRONG_CAPITAL),
  // but the time constraint must keep this founder out of the top band,
  // never silently overridden by the money alone.
  it("keeps a wealthy but time-poor founder out of the top band despite strong capital", () => {
    const profile = baseProfile({
      identity: { ...baseProfile().identity, education: "Master's Degree" },
      skills: [{ name: "Coding", level: "comfortable", levelScore: 2 }],
      experienceYears: 3,
      resources: {
        ...baseProfile().resources,
        capitalBracket: "More than ₹2,00,000",
        annualIncomeAmount: 3_500_000,
        assets: ["A laptop / computer", "A vehicle", "A dedicated workspace"],
      },
      time: { weeklyHours: 3, weeklyHoursBracket: "Under 5 hrs" },
      risk: { appetite: "balanced" },
    });
    const c = calibrate(profile);
    expect(c.reasonCodes).toContain("STRONG_CAPITAL");
    expect(c.reasonCodes).toContain("LIMITED_TIME");
    expect(c.band).not.toBe("E");
  });

  // 5. Skilled founder from a non-elite institution — the exact scenario
  // the spec calls out: real, demonstrated skill and an existing
  // business must be able to outscore a fancy degree with nothing behind
  // it. Institution NAME is never read at all (see ambition.ts), only
  // completion level, and completion level alone is a small fraction of
  // the total weight.
  it("lets a founder with real skills but only a Diploma outscore a Master's degree holder with no skills or experience", () => {
    const skilledNonElite = calibrate(
      baseProfile({
        identity: {
          ...baseProfile().identity,
          education: "Diploma",
          currentStatus: "Business Owner",
          currentBusiness: { revenueBracket: "₹5–10L", customers: "Small businesses" },
        },
        skills: [
          { name: "Coding", level: "advanced", levelScore: 3 },
          { name: "Web Development", level: "advanced", levelScore: 3 },
        ],
        experienceYears: 5,
        workStyle: { ...baseProfile().workStyle, salesComfort: "I enjoy it" },
      }),
    );
    const degreeOnly = calibrate(
      baseProfile({
        identity: { ...baseProfile().identity, education: "Master's Degree" },
        skills: [],
        experienceYears: 0,
      }),
    );
    expect(skilledNonElite.score).toBeGreaterThan(degreeOnly.score);
  });

  it("formats an honest, non-instructive prompt context string", () => {
    const c = calibrate(baseProfile());
    const text = formatAmbitionContextForPrompt(c);
    expect(text).toContain(`Band ${c.band}`);
    expect(text.toLowerCase()).not.toContain("always be more ambitious");
  });
});
