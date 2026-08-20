import { describe, expect, it } from "vitest";
import { normalizeProfile } from "@/lib/profile/normalize";
import type { OnboardingAnswers } from "@/lib/onboarding-types";

describe("normalizeProfile", () => {
  it("uses the investment bracket midpoint when no precise capital is given", () => {
    const profile = normalizeProfile({ investmentBudget: "₹50,000 – ₹2,00,000" });
    expect(profile.resources.capitalINR).toBe(125_000);
  });

  it("prefers preciseCapital over the bracket midpoint for the open-ended top bracket", () => {
    const profile = normalizeProfile({
      investmentBudget: "More than ₹2,00,000",
      preciseCapital: "25 lakh",
    });
    expect(profile.resources.capitalINR).toBe(2_500_000);
  });

  it("falls back to the bracket default when the top bracket has no precise figure yet", () => {
    const profile = normalizeProfile({ investmentBudget: "More than ₹2,00,000" });
    expect(profile.resources.capitalINR).toBe(300_000);
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
    expect(profile.resources.capitalINR).toBe(0);
    expect(profile.time.weeklyHours).toBe(5);
    expect(profile.skills).toEqual([]);
  });

  it("collects real constraints without dropping any", () => {
    const answers: OnboardingAnswers = {
      relocation: "No",
      healthLimitations: "Limited mobility",
      otherConstraints: "Must work evenings only",
    };
    const profile = normalizeProfile(answers);
    expect(profile.constraints.relocation).toBe("No");
    expect(profile.constraints.health).toBe("Limited mobility");
    expect(profile.constraints.other).toBe("Must work evenings only");
  });
});
