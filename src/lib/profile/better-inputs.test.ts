import { describe, expect, it } from "vitest";

import { formatProfileForPrompt } from "@/lib/ai/prompts/shared";
import { getBrackets } from "@/lib/consultation/brackets";

import { normalizeProfile } from "./normalize";

const BASE = {
  v: 2,
  age: "24",
  status: "working_professional",
  country: "India",
  state: "Rajasthan",
  city: "Jaipur",
  education: "bachelors",
  languages: ["Hindi", "English"],
  weeklyHours: "h5_10",
  capitalBracket: 3,
  access: ["laptop"],
  riskTolerance: "balanced",
  scale: "profitable",
} as const;

const profile = (a: Record<string, unknown>) =>
  normalizeProfile(a as Parameters<typeof normalizeProfile>[0]);

describe("better inputs (part 5, step 2)", () => {
  it("turns the money and the share they could lose into a range", () => {
    const tier = getBrackets("capital", "INR")[3];
    const p = profile({ ...BASE, lossShare: "half" });
    expect(p.v2?.affordableLoss).toEqual({
      min: Math.round((tier.min ?? 0) * 0.5),
      max: tier.max === null ? null : Math.round(tier.max * 0.5),
    });
    expect(profile({ ...BASE, capitalBracket: 0 }).v2?.affordableLoss).toEqual({ min: 0, max: 0 });
  });

  it("passes every new answer to the engine, and 'unknown' — never a guess — when empty", () => {
    const answered = formatProfileForPrompt(
      profile({
        ...BASE,
        lossShare: "little",
        reachThisWeek: ["shop_owners", "neighbours"],
        workDays: ["saturday", "sunday"],
        helpAskedFor: 'fixing phones "for free"',
      }),
    );
    expect(answered).toContain("Money they could afford to LOSE: only a little");
    expect(answered).toContain(
      "People they could reach THIS WEEK without advertising: Shop owners, Neighbours",
    );
    expect(answered).toContain("Days they can give it: Saturday, Sunday");
    expect(answered).toContain(`"fixing phones 'for free'"`);

    const empty = formatProfileForPrompt(profile(BASE));
    expect(empty).toContain("Money they could afford to lose: UNKNOWN");
    expect(empty).toContain("without advertising: UNKNOWN");
    expect(empty).toContain("Days they can give it: UNKNOWN");
    expect(empty).toContain("What people already ask them for help with: not given");
  });
});
