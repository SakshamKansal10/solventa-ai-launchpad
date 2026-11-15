import { describe, expect, it } from "vitest";

import { ADAPT, median, nextNotch, notchDpr, QUALITY_NOTCHES, QUALITY_PRESETS } from "./quality";

const { full: high, lite } = QUALITY_PRESETS;

describe("quality presets", () => {
  it("lite spends less on every cost, within a restrained universe (clarity over density)", () => {
    expect(high.universeCount).toBeGreaterThanOrEqual(130);
    expect(high.universeCount).toBeLessThanOrEqual(220);
    expect(lite.universeCount).toBeGreaterThanOrEqual(80);
    expect(lite.universeCount).toBeLessThan(high.universeCount);
    expect(high.filamentCapacity).toBeGreaterThan(lite.filamentCapacity);
    expect(high.filamentSegments).toBeGreaterThan(lite.filamentSegments);
    expect(high.coreSegments).toBeGreaterThan(lite.coreSegments);
    expect(high.dpr[1]).toBeGreaterThan(lite.dpr[1]);
    expect(lite.dpr[1]).toBeLessThanOrEqual(1);
    expect(lite.antialias).toBe(false);
    expect(lite.physicalMaterials).toBe(false);
  });

  it("have valid resolution ranges", () => {
    for (const preset of [high, lite]) {
      expect(preset.dpr[0]).toBeGreaterThan(0);
      expect(preset.dpr[0]).toBeLessThanOrEqual(preset.dpr[1]);
    }
  });
});

describe("adaptive quality inside a tier", () => {
  const slow = Array.from({ length: 100 }, (_, i) => (i % 2 ? 33.3 : 16.7) + (i % 3) * 0.1);
  const fast = Array.from({ length: 120 }, () => 16.7);

  it("steps down one notch when the window median is slower than 20 ms, never past the last", () => {
    expect(median([16.7, 33.3, 33.3])).toBe(33.3);
    expect(nextNotch(0, [25, 25, 16.7])).toBe(1);
    expect(nextNotch(0, fast)).toBe(0);
    expect(nextNotch(QUALITY_NOTCHES.length - 1, [40, 40])).toBe(QUALITY_NOTCHES.length - 1);
    expect(nextNotch(0, slow)).toBe(median(slow) > ADAPT.slowMedianMs ? 1 : 0);
  });

  it("each notch lowers the pixel ratio within the tier's range and draws fewer filaments", () => {
    expect(notchDpr(high, 2, 0)).toBe(1.5);
    expect(notchDpr(high, 2, 1)).toBe(1.2);
    expect(notchDpr(lite, 1, 0)).toBe(1);
    expect(notchDpr(lite, 1, 1)).toBe(0.8);
    expect(notchDpr(lite, 1, 2)).toBe(0.65);
    // Never below the tier floor.
    expect(notchDpr(lite, 0.8, 2)).toBeGreaterThanOrEqual(lite.dpr[0]);
    for (let i = 1; i < QUALITY_NOTCHES.length; i++) {
      expect(QUALITY_NOTCHES[i].dprScale).toBeLessThan(QUALITY_NOTCHES[i - 1].dprScale);
      expect(QUALITY_NOTCHES[i].filamentShare).toBeLessThan(QUALITY_NOTCHES[i - 1].filamentShare);
    }
  });
});
