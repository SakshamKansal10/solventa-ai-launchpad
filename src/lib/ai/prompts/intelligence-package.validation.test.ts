import { describe, it, expect } from "vitest";
import { FlatIntelligencePackageSchema } from "@/lib/ai/prompts/intelligence-package";

/**
 * FlatIntelligencePackageSchema is now just founderDNA + 3 flat,
 * index-tagged opportunities — no roadmap arrays at all (roadmap
 * generation moved to its own on-demand call, see roadmap-generation.ts).
 * These tests cover the one thing left for Zod to actually enforce beyond
 * per-field types: opportunityIndex must be exactly {0, 1, 2}, each once.
 */

const FOUNDER_DNA = {
  narrativeSummary: "A grounded, resourceful founder with real constraints.",
  strengths: ["Strong communicator", "Disciplined with time"],
  resources: ["₹20,000 savings", "10 hrs/week"],
  constraints: ["Limited capital", "Day job during weekdays"],
  workStyle: "Executes steadily on a fixed weekly schedule.",
  riskProfile: "Comfortable with small, reversible bets.",
  direction: "Wants a second income stream within 6 months.",
  strategicSignals: ["Time and capital are both tight, favoring low-overhead ideas."],
};

function buildOpportunity(opportunityIndex: number, overrides: Record<string, unknown> = {}) {
  return {
    opportunityIndex,
    title: `Opportunity ${opportunityIndex}`,
    category: "digital service",
    plainEnglishSummary: "A simple, plain-language description of the idea.",
    customer: "Local small business owners.",
    problem: "They lack time to do this themselves.",
    solution: "Do it for them, reliably and affordably.",
    whyThisFounder: ["Cites a real skill", "Cites a real resource", "Cites a real constraint fit"],
    businessModelPlainEnglish: "Charge a flat monthly fee per client.",
    startingCapital: "₹5,000–10,000 to start",
    weeklyTime: "8-10 hours/week",
    difficulty: "Beginner-friendly" as const,
    skillsAlreadyOwned: ["Communication"],
    skillsToLearn: ["Basic invoicing"],
    resourceRequirements: ["A laptop"],
    advantages: ["Low startup cost", "Uses existing skills"],
    tradeoffs: ["Slow initial growth"],
    risks: ["Client churn"],
    unknowns: ["Ideal pricing point"],
    validationNeeded: ["Whether 3 local businesses will pay"],
    revenuePath: "Start with one client, expand via referrals.",
    firstExperiment: "Offer the service free to one business this week in exchange for a review.",
    whyNow: "Local demand for this has grown faster than local supply this year.",
    fitSignals: {
      requiredSkills: [{ name: "Communication", minLevel: "beginner" as const }],
      startupCapitalINR: 8000,
      weeklyHoursNeeded: 9,
      riskLevel: "cautious" as const,
      motivationAlignment: "high" as const,
      requiresLeadership: false,
      requiresSales: true,
      soloFriendly: true,
      relevantExperienceYears: 1,
      requiresDigitalAssets: false,
      locationFlexible: true,
    },
    ...overrides,
  };
}

function buildPackage(indexes: number[]) {
  return { founderDNA: FOUNDER_DNA, opportunities: indexes.map((i) => buildOpportunity(i)) };
}

describe("FlatIntelligencePackageSchema — schema/structural validation", () => {
  it("3 opportunities, indexes 0/1/2 -> PASS", () => {
    const result = FlatIntelligencePackageSchema.safeParse(buildPackage([0, 1, 2]));
    expect(result.success).toBe(true);
  });

  it("indexes out of order (2, 0, 1) -> still PASS — order is reconstructPackage's job, not the schema's", () => {
    const result = FlatIntelligencePackageSchema.safeParse(buildPackage([2, 0, 1]));
    expect(result.success).toBe(true);
  });

  it("a duplicate index -> FAIL", () => {
    const result = FlatIntelligencePackageSchema.safeParse(buildPackage([0, 0, 2]));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.message.includes("exactly the indexes"))).toBe(true);
  });

  it("only 2 opportunities -> FAIL (length check)", () => {
    const result = FlatIntelligencePackageSchema.safeParse(buildPackage([0, 1]));
    expect(result.success).toBe(false);
  });

  it("missing required semantic field -> FAIL", () => {
    const pkg = buildPackage([0, 1, 2]);
    const broken = { ...pkg.opportunities[0] } as Record<string, unknown>;
    delete broken.title;
    pkg.opportunities = [
      broken,
      pkg.opportunities[1],
      pkg.opportunities[2],
    ] as typeof pkg.opportunities;
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
  });
});
