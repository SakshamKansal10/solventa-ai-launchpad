import { describe, expect, it } from "vitest";

import { damp, mulberry32, smoothstep } from "../math";
import { sectionProgress } from "./progress-math";

describe("sectionProgress", () => {
  // A 1100-unit section starting at 0, seen through a 100-unit viewport: 1000 of scroll.
  it("runs 0 → 1 across the section's scrollable distance", () => {
    expect(sectionProgress(0, 0, 1100, 100)).toBe(0);
    expect(sectionProgress(500, 0, 1100, 100)).toBe(0.5);
    expect(sectionProgress(1000, 0, 1100, 100)).toBe(1);
  });

  it("clamps before and after the section", () => {
    expect(sectionProgress(-50, 0, 1100, 100)).toBe(0);
    expect(sectionProgress(4000, 0, 1100, 100)).toBe(1);
  });

  it("accounts for content above the section", () => {
    expect(sectionProgress(300, 200, 1100, 100)).toBeCloseTo(0.1);
  });

  it("is 0 (never NaN) when the section is no taller than the viewport", () => {
    expect(sectionProgress(10, 0, 100, 100)).toBe(0);
    expect(sectionProgress(10, 0, 50, 100)).toBe(0);
  });
});

describe("damp", () => {
  it("approaches the target and never overshoots it", () => {
    let v = 0;
    for (let i = 0; i < 120; i++) {
      v = damp(v, 1, 4.2, 1 / 60);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(v).toBeGreaterThan(0.99);
  });

  it("is frame-rate independent: two half steps equal one full step", () => {
    const once = damp(0, 1, 4.2, 1 / 30);
    const twice = damp(damp(0, 1, 4.2, 1 / 60), 1, 4.2, 1 / 60);
    expect(twice).toBeCloseTo(once, 12);
  });
});

describe("helpers", () => {
  it("smoothstep is 0 / 0.5 / 1 at the edges and middle", () => {
    expect(smoothstep(1, 3, 0)).toBe(0);
    expect(smoothstep(1, 3, 2)).toBe(0.5);
    expect(smoothstep(1, 3, 9)).toBe(1);
  });

  it("mulberry32 is deterministic and stays within [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
