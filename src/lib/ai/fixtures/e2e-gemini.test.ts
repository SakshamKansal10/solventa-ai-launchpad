import { describe, expect, it } from "vitest";

import {
  MentorResponseSchema,
  RoadmapSkeletonSchema,
  RoadmapWeekDetailSchema,
} from "@/lib/ai/schemas";
import {
  FlatIntelligencePackageSchema,
  makeFlatExploreSchema,
} from "@/lib/ai/prompts/intelligence-package";
import { ProofAssumptionsSchema } from "@/lib/ai/prompts/proof-assumptions";
import {
  fakeHindi,
  flatExplore,
  flatIntelligencePackage,
  mentorReply,
  proofAssumptions,
  roadmapSkeleton,
  weekDetail,
} from "./e2e-gemini";
import { validateTranslations } from "@/lib/i18n/projection";

describe("E2E Gemini fixtures conform to the real schemas", () => {
  it("intelligence package", () => {
    const r = FlatIntelligencePackageSchema.safeParse(flatIntelligencePackage());
    if (!r.success) console.error(r.error.format());
    expect(r.success).toBe(true);
  });

  it("explore-more batches of 1, 2 and 3", () => {
    for (const n of [1, 2, 3]) {
      const r = makeFlatExploreSchema(n).safeParse(flatExplore(n, 1));
      if (!r.success) console.error(r.error.format());
      expect(r.success).toBe(true);
    }
  });

  it("roadmap skeleton", () => {
    expect(RoadmapSkeletonSchema.safeParse(roadmapSkeleton()).success).toBe(true);
  });

  it("week detail, first and later weeks", () => {
    expect(
      RoadmapWeekDetailSchema.safeParse(weekDetail({ title: "Week", first: true })).success,
    ).toBe(true);
    const later = weekDetail({
      title: "Week",
      first: false,
      priorTitle: "Prior",
      outcome: "stronger",
    });
    expect(RoadmapWeekDetailSchema.safeParse(later).success).toBe(true);
    expect(later.adaptationNote).toContain("Prior");
  });

  it("proof assumptions and mentor reply", () => {
    expect(ProofAssumptionsSchema.safeParse(proofAssumptions()).success).toBe(true);
    expect(MentorResponseSchema.safeParse(mentorReply("How do I start?")).success).toBe(true);
  });

  it("the fake translation passes the app's own number-preservation check", () => {
    const original = ["Pay ₹5,000 by 12 May", "Talk to 8 people"];
    expect(validateTranslations(original, original.map(fakeHindi))).toBe(true);
  });
});
