import { describe, expect, it } from "vitest";
import { SolventiaIntelligencePackageSchema, RoadmapPlanSchema } from "@/lib/ai/schemas";
import {
  FIXTURE_INTELLIGENCE_PACKAGE,
  FIXTURE_ROADMAPS,
  FIXTURE_PROFILE_ANSWERS,
} from "@/lib/ai/fixtures/intelligence-package.fixture";
import { computeFitScore } from "@/lib/profile/scoring";
import { normalizeProfile } from "@/lib/profile/normalize";

describe("FIXTURE_INTELLIGENCE_PACKAGE", () => {
  it("conforms to the real SolventiaIntelligencePackageSchema", () => {
    const result = SolventiaIntelligencePackageSchema.safeParse(FIXTURE_INTELLIGENCE_PACKAGE);
    if (!result.success) {
      console.error(result.error.format());
    }
    expect(result.success).toBe(true);
  });

  it("has exactly 3 genuinely different opportunities, none carrying a roadmap yet", () => {
    const titles = FIXTURE_INTELLIGENCE_PACKAGE.opportunities.map((o) => o.title);
    expect(titles).toHaveLength(3);
    expect(new Set(titles).size).toBe(3);
    for (const opp of FIXTURE_INTELLIGENCE_PACKAGE.opportunities) {
      expect(opp.roadmap).toBeUndefined();
    }
  });

  it("scores deterministically through the real fit-scoring engine", () => {
    const profile = normalizeProfile(
      FIXTURE_PROFILE_ANSWERS as Parameters<typeof normalizeProfile>[0],
    );
    const scores = FIXTURE_INTELLIGENCE_PACKAGE.opportunities.map(
      (o) => computeFitScore(profile, o.fitSignals).total,
    );
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
    // Not all three should score identically — the fixture profile and
    // fitSignals are varied enough that a flat tie would suggest a copy-
    // paste mistake in the fixture itself.
    expect(new Set(scores).size).toBeGreaterThan(1);
  });
});

describe("FIXTURE_ROADMAPS", () => {
  it("has one roadmap per opportunity, each conforming to RoadmapPlanSchema", () => {
    expect(FIXTURE_ROADMAPS).toHaveLength(FIXTURE_INTELLIGENCE_PACKAGE.opportunities.length);
    for (const plan of FIXTURE_ROADMAPS) {
      const result = RoadmapPlanSchema.safeParse(plan);
      if (!result.success) console.error(result.error.format());
      expect(result.success).toBe(true);
    }
  });

  it("gives every roadmap 3-4 phases, each with 1-3 weeks of 2-4 tasks", () => {
    for (const plan of FIXTURE_ROADMAPS) {
      expect(plan.phases.length).toBeGreaterThanOrEqual(3);
      expect(plan.phases.length).toBeLessThanOrEqual(4);
      for (const phase of plan.phases) {
        expect(phase.weeks.length).toBeGreaterThanOrEqual(1);
        expect(phase.weeks.length).toBeLessThanOrEqual(3);
        for (const week of phase.weeks) {
          expect(week.tasks.length).toBeGreaterThanOrEqual(2);
          expect(week.tasks.length).toBeLessThanOrEqual(4);
        }
      }
    }
  });
});
