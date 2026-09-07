import { describe, expect, it } from "vitest";
import { computeFounderGenome, computeFounderPersona } from "@/lib/profile/founder-genome";
import { getInvestmentBrackets } from "@/lib/country-currency";
import type { NormalizedProfile } from "@/lib/profile/normalize";

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

describe("computeFounderGenome", () => {
  it("never throws and returns 0-100 scores for a fully-empty-signal profile", () => {
    const genome = computeFounderGenome(baseProfile());
    expect(genome.dimensions).toHaveLength(6);
    for (const d of genome.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("scores skill leverage higher for more, more-advanced skills", () => {
    const beginner = computeFounderGenome(
      baseProfile({ skills: [{ name: "Coding", level: "beginner", levelScore: 1 }] }),
    );
    const advanced = computeFounderGenome(
      baseProfile({
        skills: [
          { name: "Coding", level: "advanced", levelScore: 3 },
          { name: "Sales", level: "advanced", levelScore: 3 },
          { name: "Design", level: "comfortable", levelScore: 2 },
        ],
      }),
    );
    const skillDim = (g: ReturnType<typeof computeFounderGenome>) =>
      g.dimensions.find((d) => d.key === "skills")!.score;
    expect(skillDim(advanced)).toBeGreaterThan(skillDim(beginner));
  });

  it("scores resource leverage by bracket POSITION, fairly across currencies", () => {
    // Top INR bracket vs. top USD bracket — same relative position, should
    // score identically, never favoring one currency's raw magnitude.
    // Labels are read from the real source (country-currency.ts) rather
    // than hardcoded, so this test can't drift out of sync with it.
    const inrTopLabel = getInvestmentBrackets("INR").at(-1)!.label;
    const usdTopLabel = getInvestmentBrackets("USD").at(-1)!.label;

    const inrTop = computeFounderGenome(
      baseProfile({
        identity: { ...baseProfile().identity, currency: "INR" },
        resources: { ...baseProfile().resources, capitalBracket: inrTopLabel },
      }),
    );
    const usdTop = computeFounderGenome(
      baseProfile({
        identity: { ...baseProfile().identity, currency: "USD" },
        resources: { ...baseProfile().resources, capitalBracket: usdTopLabel },
      }),
    );
    const resourceDim = (g: ReturnType<typeof computeFounderGenome>) =>
      g.dimensions.find((d) => d.key === "resources")!.score;
    expect(resourceDim(inrTop)).toBe(resourceDim(usdTop));
  });

  it("gives a real, visible boost for founders already running a business", () => {
    const noBusiness = computeFounderGenome(baseProfile());
    const withBusiness = computeFounderGenome(
      baseProfile({
        identity: {
          ...baseProfile().identity,
          currentStatus: "Business Owner",
          currentBusiness: { revenueBracket: "₹3–5L", customers: "Local businesses" },
        },
      }),
    );
    const commercialDim = (g: ReturnType<typeof computeFounderGenome>) =>
      g.dimensions.find((d) => d.key === "commercial")!.score;
    expect(commercialDim(withBusiness)).toBeGreaterThan(commercialDim(noBusiness));
  });

  it("maps risk appetite directly and deterministically", () => {
    const cautious = computeFounderGenome(baseProfile({ risk: { appetite: "cautious" } }));
    const experimental = computeFounderGenome(baseProfile({ risk: { appetite: "experimental" } }));
    const riskDim = (g: ReturnType<typeof computeFounderGenome>) =>
      g.dimensions.find((d) => d.key === "risk")!.score;
    expect(riskDim(experimental)).toBeGreaterThan(riskDim(cautious));
  });

  it("is deterministic — identical profiles always produce identical genomes", () => {
    const profile = baseProfile({
      skills: [{ name: "Sales", level: "comfortable", levelScore: 2 }],
    });
    expect(computeFounderGenome(profile)).toEqual(computeFounderGenome(profile));
  });
});

describe("computeFounderPersona", () => {
  it("classifies a technically-skilled founder as a Technical Problem Solver", () => {
    const profile = baseProfile({
      skills: [
        { name: "Coding", level: "advanced", levelScore: 3 },
        { name: "Web Development", level: "comfortable", levelScore: 2 },
      ],
    });
    const persona = computeFounderPersona(profile, computeFounderGenome(profile));
    expect(persona.name).toBe("Technical Problem Solver");
    expect(persona.attributes.length).toBeGreaterThan(0);
  });

  it("classifies a community/social-impact-motivated founder as Community-Led Founder", () => {
    const profile = baseProfile({
      direction: { ...baseProfile().direction, goals: ["Social impact"] },
    });
    const persona = computeFounderPersona(profile, computeFounderGenome(profile));
    expect(persona.name).toBe("Community-Led Founder");
  });

  it("never returns a childish or generic placeholder name", () => {
    const persona = computeFounderPersona(baseProfile(), computeFounderGenome(baseProfile()));
    expect(persona.name).not.toMatch(/^(founder|user|person|default)$/i);
    expect(persona.name.length).toBeGreaterThan(3);
  });

  it("every attribute is non-empty and there are at most 4", () => {
    const profile = baseProfile({
      skills: [{ name: "Coding", level: "advanced", levelScore: 3 }],
      time: { weeklyHours: 20, weeklyHoursBracket: "10–20 hrs" },
    });
    const persona = computeFounderPersona(profile, computeFounderGenome(profile));
    expect(persona.attributes.length).toBeLessThanOrEqual(4);
    for (const attr of persona.attributes) {
      expect(attr.length).toBeGreaterThan(0);
    }
  });
});
