import { describe, expect, it } from "vitest";

import { normalizeProfile } from "@/lib/profile/normalize";

import {
  checkMoney,
  chooseDirections,
  filterHardLimits,
  scoreCandidates,
  understand,
  type Candidate,
} from "./stages";

const ANSWERS = {
  v: 2,
  age: "24",
  status: "working_professional",
  country: "India",
  state: "Rajasthan",
  city: "Jaipur",
  education: "bachelors",
  languages: ["Hindi", "English"],
  weeklyHours: "h5_10",
  skills: [{ name: "Digital Marketing", level: "working", usedInReal: true }],
  executionSignals: ["sold_customers"],
  capitalBracket: 2,
  lossShare: "half",
  access: ["laptop", "customer_network"],
  riskTolerance: "balanced",
  relocation: "no",
  scale: "profitable",
  minIncomeBracket: 2,
} as const;
const profile = normalizeProfile(ANSWERS as Parameters<typeof normalizeProfile>[0]);
const brief = understand(profile);

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    title: "Instagram for local bakeries",
    type: "service",
    customer: "Bakeries in Jaipur",
    problem: "No time to post",
    offer: "Three posts a week",
    pricePerUnit: 4000,
    unit: "per month per bakery",
    unitsPerMonth: 4,
    marginPercent: 90,
    hoursPerUnit: 4,
    startCost: 0,
    needsLicence: false,
    minAge: null,
    needsTravel: false,
    firstTest: "Message 10 bakeries and offer a free week",
    firstTestCostsMoney: false,
    fitSignals: {
      requiredSkills: [{ name: "Digital Marketing", minLevel: "beginner" }],
      startupCapitalAmount: 0,
      weeklyHoursNeeded: 6,
      riskLevel: "cautious",
      motivationAlignment: "medium",
      requiresLeadership: false,
      requiresSales: true,
      soloFriendly: true,
      relevantExperienceYears: 0,
      requiresDigitalAssets: true,
      locationFlexible: true,
      ceiling: "income",
    },
    ...over,
  } as Candidate;
}

describe("idea engine v2 — the stages that are code", () => {
  it("understands the profile: hard limits, and what is unknown is named, not guessed", () => {
    expect(brief.limits.weeklyHours).toEqual({ min: 5, max: 10 });
    expect(brief.limits.canTravel).toBe(false);
    expect(brief.limits.maxStartCost).not.toBeNull();
    expect(brief.unknowns).not.toContain("skills");
    const empty = understand(
      normalizeProfile({ ...ANSWERS, skills: [], lossShare: undefined } as never),
    );
    expect(empty.unknowns).toEqual(
      expect.arrayContaining(["skills", "money they could afford to lose"]),
    );
  });

  it("drops directions that break a hard limit, with the reason", () => {
    const { kept, dropped } = filterHardLimits(
      [
        candidate(),
        candidate({ title: "Café", startCost: 10_000_000 }),
        candidate({ title: "Delivery", needsTravel: true }),
        candidate({
          title: "Agency",
          fitSignals: { ...candidate().fitSignals, weeklyHoursNeeded: 40 },
        }),
      ],
      brief,
    );
    expect(kept.map((c) => c.title)).toEqual(["Instagram for local bakeries"]);
    expect(dropped.map((d) => d.reason)).toEqual([
      "needs more money than they could afford to lose",
      "needs travel they cannot do",
      "needs more hours than they have",
    ]);
  });

  it("checks the money in code: price × volume × margin against the target and the hours", () => {
    const m = checkMoney(candidate(), brief);
    expect(m.monthlyRevenue).toBe(16_000);
    expect(m.monthlyProfit).toBe(14_400);
    expect(m.weeklyHours).toBeCloseTo(3.7, 1);
    expect(checkMoney(candidate({ hoursPerUnit: 40 }), brief).verdict).toBe("over_hours");
    const target = brief.limits.monthlyIncomeTarget;
    if (target !== null)
      expect(checkMoney(candidate({ pricePerUnit: 10, unitsPerMonth: 1 }), brief).verdict).toBe(
        "below_target",
      );
  });

  it("every scored dimension names the profile answer behind it", () => {
    const [s] = scoreCandidates(profile, brief, [candidate()]);
    for (const f of s.fit.factors) {
      if (f.score === null) expect(s.evidence[f.key]).toBeNull();
      else expect(s.evidence[f.key]).toEqual(expect.any(String));
    }
  });

  it("chooses different types, and never fills a slot with a weak fit or broken hours", () => {
    const scored = scoreCandidates(profile, brief, [
      candidate(),
      candidate({ title: "Second service" }),
      candidate({ title: "Reselling", type: "trading" }),
      candidate({ title: "Too long", type: "digital", hoursPerUnit: 60 }),
    ]);
    const { chosen } = chooseDirections(scored, brief);
    const titles = chosen.map((s) => s.candidate.title);
    expect(titles).not.toContain("Too long");
    expect(new Set(chosen.slice(0, 2).map((s) => s.candidate.type)).size).toBe(2);
    const none = chooseDirections([], brief);
    expect(none.chosen).toHaveLength(0);
    expect(none.missing).toEqual(brief.unknowns);
  });
});
