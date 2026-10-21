import { describe, expect, it } from "vitest";

import { findIntegrityIssues, keepSupportedDetail, keepSupportedReasons } from "@/lib/ai/integrity";
import type { ConsultationAnswers } from "@/lib/consultation/model";
import { normalizeProfile } from "@/lib/profile/normalize";

const profile = (over: Partial<ConsultationAnswers> = {}) =>
  normalizeProfile({
    v: 2,
    age: "24",
    status: "college_student",
    country: "India",
    state: "Haryana",
    weeklyHours: "h30_40",
    capitalBracket: 3,
    ...over,
  } as ConsultationAnswers);

describe("findIntegrityIssues — personal claims the profile does not support", () => {
  it("flags a single number for hours the founder gave as a range", () => {
    expect(findIntegrityIssues("Your 35 hours a week make this realistic.", profile())).toContain(
      "hours_single",
    );
  });

  it("accepts the bounds of the stated range", () => {
    expect(findIntegrityIssues("With up to 40 hours a week you can test it.", profile())).toEqual(
      [],
    );
  });

  it("flags a place the founder never gave", () => {
    expect(
      findIntegrityIssues(
        "Your physical presence in Ambala gives you direct access to manufacturers.",
        profile(),
      ),
    ).toContain("place");
  });

  it("accepts the state the founder did give", () => {
    expect(findIntegrityIssues("Being based in Haryana, you can visit buyers.", profile())).toEqual(
      [],
    );
  });

  it("flags a single budget amount presented as theirs", () => {
    expect(findIntegrityIssues("You have ₹30,000 to start with.", profile())).toContain(
      "budget_single",
    );
  });

  it("ignores statements that are not about the founder", () => {
    expect(findIntegrityIssues("Most shops spend 20 hours a week on stock.", profile())).toEqual(
      [],
    );
  });

  it("keepSupportedReasons drops only the unsupported ones", () => {
    const kept = keepSupportedReasons(
      ["Your 35 hours a week fit this.", "You already know how to use spreadsheets."],
      profile(),
    );
    expect(kept).toEqual(["You already know how to use spreadsheets."]);
  });

  it("keepSupportedDetail filters every personal list and keeps assumption categories aligned", () => {
    const out = keepSupportedDetail(
      {
        whyThisFounder: ["Your 35 hours a week fit this.", "You know spreadsheets."],
        advantages: ["Low cost to start"],
        criticalAssumptions: [
          "Your presence in Ambala gives you supplier access.",
          "Clinic owners feel the follow-up problem.",
        ],
        criticalAssumptionCategories: ["distribution", "problem"],
        successCriteria: ["3 of 8 owners ask for a trial"],
        reconsiderIf: ["Most owners say it is not a priority"],
      },
      profile(),
    );
    expect(out.whyThisFounder).toEqual(["You know spreadsheets."]);
    expect(out.criticalAssumptions).toEqual(["Clinic owners feel the follow-up problem."]);
    expect(out.criticalAssumptionCategories).toEqual(["problem"]);
    expect(out.successCriteria).toHaveLength(1);
  });
});
