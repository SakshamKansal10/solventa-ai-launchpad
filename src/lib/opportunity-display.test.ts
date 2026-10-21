import { describe, expect, it } from "vitest";

import { toDisplayDetail } from "@/lib/opportunity-display";
import type { OpportunityDetail, OpportunityPackage } from "@/lib/ai/schemas";

describe("toDisplayDetail", () => {
  it("never throws on a legacy row missing startingRequirements entirely", () => {
    const legacy = {
      theOpportunity: "Sell handmade candles",
      theProblem: "No local candle shops",
      whoItIsFor: "Home decorators",
      whyThisFitsYou: ["You like crafting"],
      whatYouAlreadyHave: [],
      whatYouStillNeed: [],
      difficulty: "Beginner-friendly",
      howItCanMakeMoney: "Sell at markets",
      competition: "A few hobbyists",
      risks: [],
      needsValidation: [],
      firstExperiment: "Sell 5 at a local market",
      // startingRequirements intentionally absent — the exact shape of the
      // production row that crashed with "Cannot read properties of
      // undefined (reading 'capital')".
    } as unknown as OpportunityDetail;

    const display = toDisplayDetail(legacy);
    expect(display.startingCapital).toBe("");
    expect(display.weeklyTime).toBe("");
    expect(display.resourceRequirements).toEqual([]);
  });

  it("never throws when startingRequirements exists but capital is missing", () => {
    const legacy = {
      theOpportunity: "Sell handmade candles",
      theProblem: "No local candle shops",
      whoItIsFor: "Home decorators",
      whyThisFitsYou: [],
      whatYouAlreadyHave: [],
      whatYouStillNeed: [],
      startingRequirements: { time: "10 hrs/week", skills: [], equipment: [] },
      difficulty: "Beginner-friendly",
      howItCanMakeMoney: "Sell at markets",
      competition: "",
      risks: [],
      needsValidation: [],
      firstExperiment: "Sell 5 at a local market",
    } as unknown as OpportunityDetail;

    expect(() => toDisplayDetail(legacy)).not.toThrow();
    expect(toDisplayDetail(legacy).startingCapital).toBe("");
  });

  it("never throws on a null or undefined candidate", () => {
    expect(() => toDisplayDetail(null)).not.toThrow();
    expect(() => toDisplayDetail(undefined)).not.toThrow();
    expect(toDisplayDetail(null).startingCapital).toBe("");
  });

  it("never throws on a package-shaped row with missing optional arrays", () => {
    const partial = {
      plainEnglishSummary: "A subscription box",
      customer: "Busy parents",
      // problem/solution/arrays intentionally absent
    } as unknown as OpportunityPackage;

    expect(() => toDisplayDetail(partial)).not.toThrow();
    const display = toDisplayDetail(partial);
    expect(display.whyThisFounder).toEqual([]);
    expect(display.risks).toEqual([]);
  });

  it("reads the structured fields, and an older direction without them as empty", () => {
    const pkg = {
      plainEnglishSummary: "x",
      deliveryModel: "Delivered remotely",
      criticalAssumptions: [
        { statement: "Owners feel the pain", category: "problem" },
        { statement: "Made-up category", category: "astrology" },
        { nope: true },
      ],
      successCriteria: ["3 of 8 ask for a trial", 42],
      reconsiderIf: "not an array",
    } as unknown as OpportunityPackage;
    const display = toDisplayDetail(pkg);
    expect(display.deliveryModel).toBe("Delivered remotely");
    expect(display.criticalAssumptions).toEqual(["Owners feel the pain", "Made-up category"]);
    expect(display.criticalAssumptionCategories).toEqual(["problem", "other"]);
    expect(display.successCriteria).toEqual(["3 of 8 ask for a trial"]);
    expect(display.reconsiderIf).toEqual([]);

    const old = toDisplayDetail({ plainEnglishSummary: "x" } as unknown as OpportunityPackage);
    expect(old.criticalAssumptions).toEqual([]);
    expect(old.deliveryModel).toBe("");
  });
});
