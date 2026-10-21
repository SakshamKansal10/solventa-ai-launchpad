import { describe, expect, it } from "vitest";

import { compareConsultations, directionDiff, type ConsultationSnapshot } from "./compare";

const base: ConsultationSnapshot = {
  status: "Student",
  location: "Haryana, India",
  hours: { min: 10, max: 20 },
  capital: { min: 10_000, max: 50_000 },
  currency: "INR",
  scale: "A steady side income",
  skills: ["Web Development", "Writing"],
  experienceYears: 2,
};

const stateOf = (rows: ReturnType<typeof compareConsultations>, field: string) =>
  rows.find((r) => r.field === field)?.state;

describe("compareConsultations — only stored differences", () => {
  it("marks a changed range as changed and an identical one as the same", () => {
    const rows = compareConsultations(base, { ...base, hours: { min: 30, max: 40 } });
    expect(stateOf(rows, "hours")).toBe("changed");
    expect(stateOf(rows, "capital")).toBe("same");
  });

  it("ignores skill order and letter case", () => {
    const rows = compareConsultations(base, { ...base, skills: ["writing", "web development"] });
    expect(stateOf(rows, "skills")).toBe("same");
  });

  it("two missing values are unknown, never the same", () => {
    const rows = compareConsultations({ ...base, scale: null }, { ...base, scale: null });
    expect(stateOf(rows, "scale")).toBe("unknown");
  });

  it("a value present on only one side is a change", () => {
    const rows = compareConsultations({ ...base, location: null }, base);
    expect(stateOf(rows, "location")).toBe("changed");
  });

  it("the same amounts in another currency are a change", () => {
    const rows = compareConsultations(base, { ...base, currency: "USD" });
    expect(stateOf(rows, "capital")).toBe("changed");
  });
});

describe("directionDiff", () => {
  it("splits titles into shared and one-sided", () => {
    const d = directionDiff([{ title: "A" }, { title: "B" }], [{ title: "b" }, { title: "C" }]);
    expect(d).toEqual({ onlyA: ["A"], onlyB: ["C"], shared: ["B"] });
  });
});
