import { describe, expect, it } from "vitest";

import { FIXTURE_INTELLIGENCE_PACKAGE } from "@/lib/ai/fixtures/intelligence-package.fixture";
import type { OpportunityPackage } from "@/lib/ai/schemas";
import { templateAssumptions } from "./proof-assumptions";
import { formatDirectionStructure } from "./roadmap-generation";

const withStructure = FIXTURE_INTELLIGENCE_PACKAGE.opportunities[0];
const { deliveryModel, criticalAssumptions, successCriteria, reconsiderIf, ...older } =
  withStructure;
void deliveryModel;
void successCriteria;
void reconsiderIf;

describe("structured direction fields reach the roadmap and the assumptions", () => {
  it("the roadmap prompt lists the critical assumptions in order, with categories", () => {
    const text = formatDirectionStructure(withStructure);
    expect(text).toContain(`1. [problem] ${criticalAssumptions![0].statement}`);
    expect(text).toContain("The first validation test has worked when:");
    expect(text).toContain("Revise or drop the direction if:");
  });

  it("an older direction without them adds nothing to the prompt", () => {
    expect(formatDirectionStructure(older as OpportunityPackage)).toBe("");
  });

  it("the fallback assumptions are the direction's own, in its order", () => {
    const plan = templateAssumptions(withStructure);
    expect(plan.map((a) => a.title)).toEqual(criticalAssumptions!.map((a) => a.statement));
    expect(plan.map((a) => a.category)).toEqual(criticalAssumptions!.map((a) => a.category));
    expect(plan.every((a) => a.nextTest.length > 0 && a.whyItMatters.length > 0)).toBe(true);
  });
});
