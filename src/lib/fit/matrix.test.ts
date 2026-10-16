import { describe, it, expect } from "vitest";

import { computeFitMatrix } from "@/lib/fit/matrix";
import { normalizeProfile } from "@/lib/profile/normalize";
import type { OpportunityFitFactors } from "@/lib/profile/scoring";
import type { ConsultationAnswers } from "@/lib/consultation/model";

const answers = (over: Partial<ConsultationAnswers> = {}): ConsultationAnswers => ({
  v: 2,
  age: "24",
  status: "college_student",
  country: "India",
  weeklyHours: "h10_20",
  capitalBracket: 5, // ₹5–10 lakh
  access: ["laptop"],
  skills: [{ name: "Coding", level: "advanced", usedInReal: true }],
  roles: ["building"],
  scale: "national",
  ...over,
});

const factors = (over: Partial<OpportunityFitFactors> = {}): OpportunityFitFactors => ({
  requiredSkills: [{ name: "Coding", minLevel: "comfortable" }],
  startupCapitalAmount: 200_000,
  weeklyHoursNeeded: 10,
  riskLevel: "balanced",
  motivationAlignment: "medium",
  requiresLeadership: false,
  requiresSales: false,
  soloFriendly: true,
  relevantExperienceYears: 1,
  requiresDigitalAssets: true,
  locationFlexible: true,
  ceiling: "national",
  ...over,
});

const row = (m: ReturnType<typeof computeFitMatrix>, key: string) =>
  m.rows.find((r) => r.key === key)!;

describe("computeFitMatrix", () => {
  it("returns exactly the four qualitative rows and no numeric score", () => {
    const m = computeFitMatrix(normalizeProfile(answers()), factors());
    expect(m.rows.map((r) => r.key)).toEqual(["capability", "resources", "access", "ambition"]);
    expect(JSON.stringify(m)).not.toMatch(/"score"|"total"/);
  });

  it("a founder who covers skills, capital, time, access and ambition reads strong", () => {
    const m = computeFitMatrix(normalizeProfile(answers()), factors());
    expect(m.overall).toBe("strong");
    expect(m.rows.every((r) => r.status === "strong")).toBe(true);
    expect(row(m, "capability").reason.code).toBe("cap_covered");
  });

  it("names the missing skill instead of flattering", () => {
    const m = computeFitMatrix(
      normalizeProfile(answers({ skills: [] })),
      factors({ requiredSkills: [{ name: "Sales", minLevel: "working" as never }] }),
    );
    expect(row(m, "capability").status).not.toBe("strong");
    expect(row(m, "capability").reason.code).toBe("cap_gap");
    expect(row(m, "capability").reason.lists?.missing).toEqual(["Sales"]);
  });

  it("a basic skill never used in real work covers less than the same skill used for real", () => {
    const studied = computeFitMatrix(
      normalizeProfile(
        answers({ skills: [{ name: "Coding", level: "basic", usedInReal: false }] }),
      ),
      factors({ requiredSkills: [{ name: "Coding", minLevel: "advanced" }] }),
    );
    const used = computeFitMatrix(
      normalizeProfile(
        answers({ skills: [{ name: "Coding", level: "advanced", usedInReal: true }] }),
      ),
      factors({ requiredSkills: [{ name: "Coding", minLevel: "advanced" }] }),
    );
    expect(row(studied, "capability").status).not.toBe("strong");
    expect(row(used, "capability").status).toBe("strong");
  });

  it("resources flags the tighter of capital and time, with real numbers", () => {
    const lowCapital = computeFitMatrix(
      normalizeProfile(answers({ capitalBracket: 1 })),
      factors({ startupCapitalAmount: 500_000 }),
    );
    expect(row(lowCapital, "resources").reason.code).toBe("res_capital_short");
    expect(row(lowCapital, "resources").status).toBe("conditional");

    const lowTime = computeFitMatrix(
      normalizeProfile(answers({ weeklyHours: "lt5" })),
      factors({ weeklyHoursNeeded: 20 }),
    );
    expect(row(lowTime, "resources").reason.code).toBe("res_time_short");
    expect(row(lowTime, "resources").reason.params).toMatchObject({ hours: 3, hoursNeeded: 20 });
  });

  it("access looks at what the opportunity actually needs", () => {
    const needsCustomers = computeFitMatrix(
      normalizeProfile(answers({ access: ["laptop"] })),
      factors({ requiresSales: true }),
    );
    expect(row(needsCustomers, "access").reason.code).toBe("acc_missing");
    expect(row(needsCustomers, "access").reason.lists?.missing).toContain("customers");

    const hasNetwork = computeFitMatrix(
      normalizeProfile(answers({ access: ["laptop", "customer_network"] })),
      factors({ requiresSales: true }),
    );
    expect(row(hasNetwork, "access").status).toBe("strong");
  });

  it("ambition: a tiny-ceiling business is flagged for someone aiming national/global", () => {
    const small = computeFitMatrix(
      normalizeProfile(answers({ scale: "global" })),
      factors({ ceiling: "income" }),
    );
    expect(row(small, "ambition").status).toBe("conditional");
    expect(row(small, "ambition").reason.code).toBe("amb_smaller");

    const bigForModest = computeFitMatrix(
      normalizeProfile(answers({ scale: "profitable" })),
      factors({ ceiling: "venture" }),
    );
    expect(row(bigForModest, "ambition").reason.code).toBe("amb_bigger");
  });

  it("ambition is honestly 'unknown' for opportunities generated before the ceiling field existed", () => {
    const m = computeFitMatrix(normalizeProfile(answers()), factors({ ceiling: undefined }));
    expect(row(m, "ambition").reason.code).toBe("amb_unknown");
    expect(row(m, "ambition").status).toBe("moderate");
  });

  it("two conditional rows make the overall conditional; one caps it at moderate", () => {
    const m2 = computeFitMatrix(
      normalizeProfile(answers({ skills: [], capitalBracket: 0 })),
      factors({
        requiredSkills: [{ name: "Sales", minLevel: "working" as never }],
        startupCapitalAmount: 900_000,
      }),
    );
    expect(m2.overall).toBe("conditional");
    const m1 = computeFitMatrix(
      normalizeProfile(answers({ capitalBracket: 0 })),
      factors({ startupCapitalAmount: 900_000 }),
    );
    expect(m1.overall).toBe("moderate");
  });
});
