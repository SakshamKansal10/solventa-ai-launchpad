import { describe, expect, it } from "vitest";

import { estimateHours, fitTasksToBudget, weekHoursBudget } from "@/lib/roadmap/hours";
import type { ConsultationAnswers } from "@/lib/consultation/model";
import { normalizeProfile } from "@/lib/profile/normalize";

const profile = (weeklyHours?: string) =>
  normalizeProfile({ v: 2, age: "24", country: "India", weeklyHours } as ConsultationAnswers);

describe("week hours budget — from the founder's stated range", () => {
  it("plans 85% of the LOWER end of the stated range", () => {
    expect(weekHoursBudget(profile("h30_40"))).toBe(25.5);
    expect(weekHoursBudget(profile("h5_10"))).toBe(4);
  });

  it("plans a light week when hours were never stated", () => {
    expect(weekHoursBudget(profile(undefined))).toBe(4);
  });

  it("never exceeds the lower bound, so 30–40 hours never gets a 32-hour week", () => {
    expect(weekHoursBudget(profile("h30_40"))).toBeLessThan(30);
  });
});

describe("estimateHours", () => {
  it("reads the upper figure of a range, and minutes", () => {
    expect(estimateHours("2-3 hours")).toBe(3);
    expect(estimateHours("~2 hrs")).toBe(2);
    expect(estimateHours("90 min")).toBe(1.5);
    expect(estimateHours("a short while")).toBeNull();
  });
});

describe("fitTasksToBudget", () => {
  const task = (h: number, required = true) => ({ timeEstimate: `~${h} hrs`, required });

  it("drops optional tasks from the end until the week fits", () => {
    const r = fitTasksToBudget([task(3), task(3), task(3, false), task(3, false)], 7);
    expect(r.tasks).toHaveLength(2);
    expect(r.over).toBe(false);
  });

  it("never drops required work — it reports the week as over instead", () => {
    const r = fitTasksToBudget([task(5), task(5), task(5)], 7);
    expect(r.tasks).toHaveLength(3);
    expect(r.over).toBe(true);
  });
});
