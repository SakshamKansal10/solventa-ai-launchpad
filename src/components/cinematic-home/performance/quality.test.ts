import { describe, expect, it } from "vitest";

import { DPR_STEP, governDpr, GOVERNOR, QUALITY_PRESETS, type GovernorState } from "./quality";

const { high, medium, low } = QUALITY_PRESETS;

describe("quality presets", () => {
  it("spend less at every lower tier, within a restrained universe (clarity over density)", () => {
    expect(high.universeCount).toBeGreaterThanOrEqual(130);
    expect(high.universeCount).toBeLessThanOrEqual(220);
    expect(medium.universeCount).toBeGreaterThanOrEqual(110);
    expect(medium.universeCount).toBeLessThan(high.universeCount);
    expect(low.universeCount).toBeGreaterThanOrEqual(80);
    expect(low.universeCount).toBeLessThan(medium.universeCount);
    expect(high.filamentCapacity).toBeGreaterThan(low.filamentCapacity);
    expect(high.coreSegments).toBeGreaterThan(low.coreSegments);
    expect(high.dpr[1]).toBeGreaterThanOrEqual(medium.dpr[1]);
    expect(medium.dpr[1]).toBeGreaterThanOrEqual(low.dpr[1]);
  });

  it("have valid resolution ranges", () => {
    for (const preset of [high, medium, low]) {
      expect(preset.dpr[0]).toBeGreaterThan(0);
      expect(preset.dpr[0]).toBeLessThanOrEqual(preset.dpr[1]);
    }
  });
});

describe("governDpr", () => {
  const start: GovernorState = { dpr: 2, slow: 0, fast: 0, recoveries: 0 };

  it("drops one step only after consecutive slow seconds, never below the floor", () => {
    let state = governDpr(start, 30, high, 2);
    expect(state.dpr).toBe(2);
    state = governDpr(state, 30, high, 2);
    expect(state.dpr).toBe(2 - DPR_STEP);
    for (let i = 0; i < 40; i++) state = governDpr(state, 20, high, 2);
    expect(state.dpr).toBe(high.dpr[0]);
  });

  it("a single dropped second is forgiven", () => {
    let state = governDpr(start, 30, high, 2);
    state = governDpr(state, 55, high, 2);
    state = governDpr(state, 30, high, 2);
    expect(state.dpr).toBe(2);
  });

  it("recovers after sustained headroom, a limited number of times, never above the ceiling", () => {
    let state: GovernorState = { dpr: 1, slow: 0, fast: 0, recoveries: 0 };
    for (let i = 0; i < 200; i++) state = governDpr(state, 60, high, 2);
    expect(state.recoveries).toBe(GOVERNOR.maxRecoveries);
    expect(state.dpr).toBe(1 + GOVERNOR.maxRecoveries * DPR_STEP);
    let capped: GovernorState = { dpr: 1, slow: 0, fast: 0, recoveries: 0 };
    for (let i = 0; i < 200; i++) capped = governDpr(capped, 60, high, 1.25);
    expect(capped.dpr).toBe(1.25);
  });
});
