import { describe, it, expect } from "vitest";
import {
  FlatIntelligencePackageSchema,
  checkRoadmapQuality,
} from "@/lib/ai/prompts/intelligence-package";

/**
 * SCHEMA VALIDATION vs. PRODUCT-QUALITY VALIDATION, tested separately.
 *
 * Zod (FlatIntelligencePackageSchema) must reject only genuinely broken
 * output — empty roadmaps, orphaned cross-references, absurd sizes,
 * missing required fields — and must NEVER reject a package merely for
 * landing outside the preferred phase/task count range. checkRoadmapQuality
 * is a separate, non-throwing function that flags count deviations as
 * warnings on an ALREADY-VALID package; it can never fail a test on its
 * own, only annotate.
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

function buildPhase(opportunityIndex: number, phaseIndex: number) {
  return {
    opportunityIndex,
    phaseIndex,
    key: "understand" as const,
    title: `Phase ${phaseIndex}`,
    description: "A short description of this phase.",
  };
}

function buildTask(opportunityIndex: number, phaseIndex: number, taskIndex: number) {
  return {
    opportunityIndex,
    phaseIndex,
    taskIndex,
    what: "Do a concrete thing.",
    why: "Because it moves the idea forward.",
    how: "Follow these specific steps.",
    resource: null,
    timeEstimate: "1-2 hours",
    deadlineDaysFromStart: 7 * (phaseIndex + 1),
    doneWhen: "The thing is visibly complete.",
    required: true,
    dependsOn: null,
  };
}

/** Builds a full, otherwise-valid flat package where opportunity i has
 * `phasesPerOpportunity[i]` phases, each with `tasksPerPhase[i]` tasks
 * (same task count across all of that opportunity's phases, for
 * simplicity — enough to express every case in the test list below). */
function buildPackage(phasesPerOpportunity: number[], tasksPerPhase: number[]) {
  const opportunities = [0, 1, 2].map((i) => buildOpportunity(i));
  const roadmapPhases: ReturnType<typeof buildPhase>[] = [];
  const roadmapTasks: ReturnType<typeof buildTask>[] = [];

  [0, 1, 2].forEach((oi) => {
    for (let pi = 0; pi < phasesPerOpportunity[oi]; pi++) {
      roadmapPhases.push(buildPhase(oi, pi));
      for (let ti = 0; ti < tasksPerPhase[oi]; ti++) {
        roadmapTasks.push(buildTask(oi, pi, ti));
      }
    }
  });

  return { founderDNA: FOUNDER_DNA, opportunities, roadmapPhases, roadmapTasks };
}

describe("FlatIntelligencePackageSchema — schema/structural validation", () => {
  it("3 opportunities x 3 phases x 2 tasks -> PASS", () => {
    const pkg = buildPackage([3, 3, 3], [2, 2, 2]);
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
  });

  it("one opportunity has 5 phases -> PASS if otherwise valid", () => {
    const pkg = buildPackage([5, 3, 3], [2, 2, 2]);
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
  });

  it("one phase has 4 tasks -> PASS", () => {
    const pkg = buildPackage([3, 3, 3], [4, 2, 2]);
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
  });

  it("one phase has only 1 useful task -> PASS with quality warning if roadmap remains usable", () => {
    const pkg = buildPackage([3, 3, 3], [1, 2, 2]);
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Reconstruct the way generateIntelligencePackage actually does, then
    // check quality — must warn, must NOT be a rejection of any kind.
    const opportunities = result.data.opportunities
      .slice()
      .sort((a, b) => a.opportunityIndex - b.opportunityIndex)
      .map((opp) => {
        const { opportunityIndex, ...rest } = opp;
        const phases = result.data.roadmapPhases
          .filter((p) => p.opportunityIndex === opportunityIndex)
          .sort((a, b) => a.phaseIndex - b.phaseIndex)
          .map((phase) => ({
            key: phase.key,
            title: phase.title,
            description: phase.description,
            tasks: result.data.roadmapTasks
              .filter(
                (t) => t.opportunityIndex === opportunityIndex && t.phaseIndex === phase.phaseIndex,
              )
              .map((t) => ({ ...t })),
          }));
        return { ...rest, roadmap: { phases } };
      });

    const warnings = checkRoadmapQuality({ opportunities });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.opportunityIndex === 0 && w.message.includes("1 tasks"))).toBe(
      true,
    );
  });

  it("opportunity has 0 phases -> FAIL", () => {
    const pkg = buildPackage([0, 3, 3], [2, 2, 2]);
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.message.includes("no roadmap phases"))).toBe(true);
  });

  it("phase has 0 tasks -> FAIL", () => {
    const pkg = buildPackage([3, 3, 3], [2, 2, 2]);
    // Remove every task for opportunity 1's phase 0, leaving the phase itself in place.
    pkg.roadmapTasks = pkg.roadmapTasks.filter(
      (t) => !(t.opportunityIndex === 1 && t.phaseIndex === 0),
    );
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.message.includes("has no tasks"))).toBe(true);
  });

  it("invalid opportunity/phase indexes -> FAIL (orphaned task)", () => {
    const pkg = buildPackage([3, 3, 3], [2, 2, 2]);
    // A task pointing at a phaseIndex that doesn't exist for its opportunity.
    pkg.roadmapTasks.push(buildTask(0, 99, 0));
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.message.includes("no matching roadmapPhases"))).toBe(
      true,
    );
  });

  it("invalid opportunity/phase indexes -> FAIL (phase references a nonexistent opportunity)", () => {
    const pkg = buildPackage([3, 3, 3], [2, 2, 2]);
    pkg.roadmapPhases.push(buildPhase(7, 0));
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((i) => i.message.includes("doesn't match any real opportunity")),
    ).toBe(true);
  });

  it("missing required semantic fields -> FAIL", () => {
    const pkg = buildPackage([3, 3, 3], [2, 2, 2]);
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

  it("absurdly many phases on one opportunity -> FAIL (hard ceiling, not the preferred range)", () => {
    const pkg = buildPackage([9, 3, 3], [2, 2, 2]);
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.message.includes("unreasonably many"))).toBe(true);
  });

  it("absurdly many tasks on one phase -> FAIL (hard ceiling)", () => {
    const pkg = buildPackage([3, 3, 3], [7, 2, 2]);
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
  });

  it("6 phases (above acceptable-5, within hard ceiling-8) still PASSES schema validation", () => {
    const pkg = buildPackage([6, 3, 3], [2, 2, 2]);
    const result = FlatIntelligencePackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
  });
});
