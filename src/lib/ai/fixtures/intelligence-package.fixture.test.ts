import { describe, expect, it } from "vitest";
import { SolventiaIntelligencePackageSchema } from "@/lib/ai/schemas";
import { FIXTURE_INTELLIGENCE_PACKAGE } from "@/lib/ai/fixtures/intelligence-package.fixture";
import { computeFitScore } from "@/lib/profile/scoring";
import { normalizeProfile } from "@/lib/profile/normalize";
import { FIXTURE_PROFILE_ANSWERS } from "@/lib/ai/fixtures/intelligence-package.fixture";

describe("FIXTURE_INTELLIGENCE_PACKAGE", () => {
  it("conforms to the real SolventiaIntelligencePackageSchema", () => {
    const result = SolventiaIntelligencePackageSchema.safeParse(FIXTURE_INTELLIGENCE_PACKAGE);
    if (!result.success) {
      console.error(result.error.format());
    }
    expect(result.success).toBe(true);
  });

  it("has exactly 3 genuinely different opportunities", () => {
    const titles = FIXTURE_INTELLIGENCE_PACKAGE.opportunities.map((o) => o.title);
    expect(titles).toHaveLength(3);
    expect(new Set(titles).size).toBe(3);
  });

  it("gives every opportunity a real roadmap with 3-4 phases and 2-3 tasks each", () => {
    for (const opp of FIXTURE_INTELLIGENCE_PACKAGE.opportunities) {
      expect(opp.roadmap.phases.length).toBeGreaterThanOrEqual(3);
      expect(opp.roadmap.phases.length).toBeLessThanOrEqual(4);
      for (const phase of opp.roadmap.phases) {
        expect(phase.tasks.length).toBeGreaterThanOrEqual(2);
        expect(phase.tasks.length).toBeLessThanOrEqual(3);
      }
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
