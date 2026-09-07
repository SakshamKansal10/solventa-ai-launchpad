import { describe, expect, it } from "vitest";
import { normalizeProfile } from "@/lib/profile/normalize";
import type { OnboardingAnswers } from "@/lib/onboarding-types";

describe("normalizeProfile", () => {
  it("uses the investment bracket midpoint when no precise capital is given", () => {
    const profile = normalizeProfile({ investmentBudget: "₹50,000 – ₹2,00,000" });
    expect(profile.resources.capitalAmount).toBe(125_000);
  });

  it("prefers preciseCapital over the bracket midpoint for the open-ended top bracket", () => {
    const profile = normalizeProfile({
      investmentBudget: "More than ₹2,00,000",
      preciseCapital: "25 lakh",
    });
    expect(profile.resources.capitalAmount).toBe(2_500_000);
  });

  it("falls back to the bracket default when the top bracket has no precise figure yet", () => {
    const profile = normalizeProfile({ investmentBudget: "More than ₹2,00,000" });
    expect(profile.resources.capitalAmount).toBe(300_000);
  });

  it("maps weekly hours brackets to numeric midpoints", () => {
    expect(normalizeProfile({ timeAvailableWeekly: "Under 5 hrs" }).time.weeklyHours).toBe(3);
    expect(normalizeProfile({ timeAvailableWeekly: "Full-time" }).time.weeklyHours).toBe(45);
  });

  it("maps the risk spectrum labels to enum values", () => {
    expect(normalizeProfile({ riskAppetite: "Very cautious" }).risk.appetite).toBe("cautious");
    expect(normalizeProfile({ riskAppetite: "Comfortable experimenting" }).risk.appetite).toBe(
      "experimental",
    );
  });

  it("normalizes skills with a numeric level score", () => {
    const profile = normalizeProfile({
      skills: [
        { name: "Coding", level: "advanced" },
        { name: "Sales", level: "never_tried" },
      ],
    });
    expect(profile.skills).toEqual([
      { name: "Coding", level: "advanced", levelScore: 3 },
      { name: "Sales", level: "never_tried", levelScore: 0 },
    ]);
  });

  it("never throws on a fully-empty profile (every field is optional)", () => {
    expect(() => normalizeProfile({})).not.toThrow();
    const profile = normalizeProfile({});
    expect(profile.resources.capitalAmount).toBe(0);
    expect(profile.time.weeklyHours).toBe(5);
    expect(profile.skills).toEqual([]);
  });

  it("collects real constraints without dropping any", () => {
    const answers: OnboardingAnswers = {
      relocation: "No",
      otherConstraints: ["Limited mobility or travel", "Fixed work/school schedule"],
    };
    const profile = normalizeProfile(answers);
    expect(profile.constraints.relocation).toBe("No");
    expect(profile.constraints.other).toEqual([
      "Limited mobility or travel",
      "Fixed work/school schedule",
    ]);
  });

  it("replaces the 'Other' constraint chip with its elaboration, and drops it if deselected", () => {
    const withOther = normalizeProfile({
      otherConstraints: ["Other"],
      otherConstraintsOther: "Caring for an elderly relative full-time",
    });
    expect(withOther.constraints.other).toEqual(["Caring for an elderly relative full-time"]);

    // Stale detail text left over from a since-deselected "Other" chip must
    // never leak through just because the field still holds old text.
    const staleDetail = normalizeProfile({
      otherConstraints: ["Fixed work/school schedule"],
      otherConstraintsOther: "Caring for an elderly relative full-time",
    });
    expect(staleDetail.constraints.other).toEqual(["Fixed work/school schedule"]);
  });

  it("collects motivation and problem-area chips, dropping the 'nothing specific' placeholder", () => {
    const profile = normalizeProfile({
      biggestMotivation: ["Financial independence", "Learning by building something real"],
      dailyFrustration: ["Nothing specific comes to mind"],
    });
    expect(profile.motivation.biggestMotivation).toEqual([
      "Financial independence",
      "Learning by building something real",
    ]);
    expect(profile.motivation.dailyFrustration).toEqual([]);
  });
});
