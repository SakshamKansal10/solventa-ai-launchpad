import { describe, expect, it } from "vitest";

import { fits, partialScore, score } from "./scoring";
import { createUniverse, LOGICAL_COUNT, STAGE_COUNTS, stageForRank } from "./universe-model";

const model = createUniverse();
const { opportunities } = model;

describe("illustrative scoring", () => {
  it("drags a direction down when one fit is a severe conflict", () => {
    const good = fits({
      capitalInr: 20e3,
      digital: 0.9,
      india: 0.9,
      hoursPerWeek: 10,
      access: 0.3,
      difficulty: 0.3,
    });
    const capitalHeavy = fits({
      capitalInr: 12e5,
      digital: 0.9,
      india: 0.9,
      hoursPerWeek: 10,
      access: 0.3,
      difficulty: 0.3,
    });
    expect(score(good)).toBeGreaterThan(0.8);
    expect(score(capitalHeavy)).toBeLessThan(score(good) * 0.65);
  });

  it("only revealed signals move a score — unknown ones are neutral", () => {
    const f = fits({
      capitalInr: 12e5,
      digital: 0.9,
      india: 0.9,
      hoursPerWeek: 10,
      access: 0.3,
      difficulty: 0.3,
    });
    const none = { capital: 0, skills: 0, location: 0, time: 0, experience: 0, access: 0 };
    expect(partialScore(f, none)).toBeCloseTo(0.62, 5);
    expect(partialScore(f, { ...none, capital: 1 })).toBeLessThan(0.62);
    expect(partialScore(f, { ...none, skills: 1 })).toBeGreaterThan(0.62);
  });
});

describe("opportunity universe", () => {
  it("holds 360 logical opportunities and converges 360 → 120 → 36 → 9 → 3 → 1", () => {
    expect(opportunities).toHaveLength(LOGICAL_COUNT);
    const remaining = (stage: number) =>
      opportunities.filter((o) => o.stage === 0 || o.stage > stage).length;
    expect([0, 1, 2, 3, 4, 5].map(remaining)).toEqual([...STAGE_COUNTS]);
    expect(stageForRank(1)).toBe(0);
  });

  it("first loses the capital-heavy territories, then whole families retract", () => {
    const first = opportunities.filter((o) => o.stage === 1);
    // Capital feasibility, market access and execution complexity carry most of the first cut.
    const heavy = first.filter((o) => ["B", "C", "D"].includes(o.territory)).length;
    expect(heavy / first.length).toBeGreaterThan(0.8);
    // Every commerce/making and local-services direction is gone after the first stage.
    expect(opportunities.filter((o) => o.family >= 3 && o.stage !== 1)).toEqual([]);
    // After 120 → 36 only the two digital families remain.
    const survivors36 = opportunities.filter((o) => o.stage === 0 || o.stage > 2);
    expect(new Set(survivors36.map((o) => o.family))).toEqual(new Set([0, 1]));
    expect(opportunities.some((o) => o.family === 2 && o.stage === 2)).toBe(true);
  });

  it("the final three come from the emerging-possibilities region; the one is centre-back", () => {
    for (const i of model.finalists) expect(opportunities[i].territory).toBe("E");
    expect(model.finalists[1]).toBe(model.winner);
    expect(opportunities[model.winner].rank).toBe(1);
  });

  it("orders capital feasibility by capital required, so the founder's threshold is a place", () => {
    const b = opportunities.filter((o) => o.territory === "B").sort((x, y) => x.local - y.local);
    for (let i = 1; i < b.length; i++)
      expect(b[i].attrs.capitalInr).toBeGreaterThanOrEqual(b[i - 1].attrs.capitalInr);
  });

  it("renders a tier's budget but always every survivor of 120 → 36", () => {
    for (const count of [360, 140, 96]) {
      const m = createUniverse(count);
      expect(m.rendered).toHaveLength(count);
      for (const o of m.opportunities.filter((x) => x.rank <= 36))
        expect(m.rendered).toContain(o.index);
      // Connections only ever join rendered opportunities.
      for (const c of m.connections) {
        if (c.a >= 0) expect(m.rendered).toContain(c.a);
        if (c.b >= 0) expect(m.rendered).toContain(c.b);
      }
    }
  });

  it("is sparse — far fewer connections than a full graph — and deterministic", () => {
    expect(model.connections.length).toBeLessThan(LOGICAL_COUNT * 1.2);
    // One trunk from the core to each of the five territories.
    expect(model.connections.filter((c) => c.kind === "trunk")).toHaveLength(5);
    expect(createUniverse().opportunities.map((o) => o.rank)).toEqual(
      opportunities.map((o) => o.rank),
    );
  });
});
